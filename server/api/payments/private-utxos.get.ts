import bs58 from 'bs58'

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const config = useRuntimeConfig()
  const db = adminDb()

  const { data: sender } = await db
    .from('users')
    .select('privy_wallet_id')
    .eq('privy_user_id', auth.userId)
    .single()

  if (!sender?.privy_wallet_id)
    throw createError({ statusCode: 404, statusMessage: 'Wallet not found' })

  const privy = getPrivy()
  const { private_key } = await (privy.wallets() as any).exportPrivateKey(sender.privy_wallet_id, {
    authorization_context: { authorization_private_keys: [(config as any).privyAuthorizationKey] },
  })

  const { spawn } = await import('child_process')
  const { join } = await import('path')

  const scannerPath = join(process.cwd(), 'server/utils/runners/umbra-scan-runner.mjs')
  const input = JSON.stringify({
    senderSecretKey: Array.from(bs58.decode(private_key)),
    rpcUrl: (config as any).solanaRpcUrl || 'https://api.mainnet-beta.solana.com',
    network: 'mainnet',
  })

  const result = await new Promise<any>((resolve, reject) => {
    const child = spawn(process.execPath, [scannerPath], { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { process.stderr.write(d) })
    child.on('close', () => {
      try { resolve(JSON.parse(stdout)) } catch { reject(new Error('scan failed: ' + stdout)) }
    })
    child.on('error', reject)
    child.stdin.write(input)
    child.stdin.end()
  })

  return result
})
