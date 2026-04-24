import bs58 from 'bs58'
import { umbraDeposit } from '../../utils/umbra'
import { PRIVATE_SEND_SUPPORTED_MINTS, isPrivateSendSupported, toRawAmount } from '../../utils/private-send'

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event)
  const body = await readBody<{
    toUsername?: string
    toAddress?: string
    amount: number
    decimals?: number
    mint?: string
    memo?: string
  }>(event)

  if (!body?.amount || body.amount <= 0)
    throw createError({ statusCode: 400, statusMessage: 'amount required' })
  if (!body.toUsername && !body.toAddress)
    throw createError({ statusCode: 400, statusMessage: 'toUsername or toAddress required' })

  const mintAddress = body.mint ?? PRIVATE_SEND_SUPPORTED_MINTS.USDC
  if (!isPrivateSendSupported(mintAddress))
    throw createError({ statusCode: 400, statusMessage: 'Token not supported for private transfer. Use USDC or USDT.' })

  const decimals = body.decimals ?? 6
  const db = adminDb()

  console.log(`[private-send] start — amount=${body.amount} mint=${mintAddress} to=${body.toUsername ?? body.toAddress}`)

  const { data: sender } = await db
    .from('users')
    .select('id, wallet_address, privy_wallet_id')
    .eq('privy_user_id', auth.userId)
    .single()
  if (!sender?.privy_wallet_id)
    throw createError({ statusCode: 400, statusMessage: 'Wallet not found' })

  console.log(`[private-send] sender wallet=${sender.wallet_address}`)

  let recipientAddress = body.toAddress ?? ''
  let recipientId: string | null = null
  if (body.toUsername) {
    const username = body.toUsername.replace(/^@/, '')
    const { data: rec } = await db
      .from('users')
      .select('id, wallet_address')
      .ilike('username', username)
      .single()
    if (!rec) throw createError({ statusCode: 404, statusMessage: 'Recipient not found' })
    recipientAddress = rec.wallet_address
    recipientId = rec.id
  }

  console.log(`[private-send] recipient wallet=${recipientAddress}`)

  const config = useRuntimeConfig()
  if (!(config as any).privyAuthorizationKey)
    throw createError({ statusCode: 500, statusMessage: 'Authorization key not configured' })

  console.log(`[private-send] checking sender balance...`)
  const { getAssociatedTokenAddressSync } = await import('@solana/spl-token')
  const { PublicKey, Connection } = await import('@solana/web3.js')
  const rpcUrl = (config as any).solanaRpcUrl || 'https://api.mainnet-beta.solana.com'
  const connection = new Connection(rpcUrl, 'confirmed')
  try {
    const ata = getAssociatedTokenAddressSync(new PublicKey(mintAddress), new PublicKey(sender.wallet_address))
    const acct = await connection.getTokenAccountBalance(ata)
    const senderBalance = acct.value.uiAmount ?? 0
    console.log(`[private-send] sender balance=${senderBalance}`)
    if (senderBalance < body.amount)
      throw createError({ statusCode: 400, statusMessage: `Insufficient balance. You have ${senderBalance} but tried to send ${body.amount}.` })
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({ statusCode: 400, statusMessage: `Token account not found. You need USDC or USDT in your wallet to send privately.` })
  }

  console.log(`[private-send] exporting private key...`)
  const privy = getPrivy()
  const { private_key } = await (privy.wallets() as any).exportPrivateKey(sender.privy_wallet_id, {
    authorization_context: { authorization_private_keys: [(config as any).privyAuthorizationKey] },
  })

  const rawAmount = toRawAmount(body.amount, decimals)
  const cluster = (config.public as any).solanaCluster || 'mainnet-beta'
  const network = cluster === 'devnet' ? 'devnet' : 'mainnet'

  console.log(`[private-send] depositing to Umbra mixer...`)
  const depositSignature = await umbraDeposit({
    senderSecretKey: Array.from(bs58.decode(private_key)),
    recipientAddress,
    rawAmount: rawAmount.toString(),
    mint: mintAddress,
    rpcUrl,
    network,
  })

  console.log(`[private-send] deposit done — signature=${depositSignature}`)

  const { data: transfer } = await db.from('private_transfers').insert({
    sender_id: sender.id,
    recipient_address: recipientAddress,
    recipient_id: recipientId,
    amount: body.amount,
    mint: mintAddress,
    deposit_signature: depositSignature,
    status: 'mixing',
    memo: body.memo ?? null,
  }).select('id').single()

  return {
    id: transfer?.id,
    depositSignature,
    status: 'mixing',
  }
})
