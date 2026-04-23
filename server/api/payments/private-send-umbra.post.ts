import bs58 from 'bs58'
import { umbraPrivateSend, toUmbraRawAmount, UMBRA_SUPPORTED_MINTS, isUmbraSupported } from '../../utils/umbra'

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

  const mintAddress = body.mint ?? UMBRA_SUPPORTED_MINTS.USDC
  if (!isUmbraSupported(mintAddress))
    throw createError({ statusCode: 400, statusMessage: 'Token not supported for private transfer. Use USDC or USDT.' })

  const decimals = body.decimals ?? 6

  const db = adminDb()

  const { data: sender } = await db
    .from('users')
    .select('id, wallet_address, privy_wallet_id')
    .eq('privy_user_id', auth.userId)
    .single()
  if (!sender?.privy_wallet_id)
    throw createError({ statusCode: 400, statusMessage: 'Wallet not found' })

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

  const config = useRuntimeConfig()
  if (!(config as any).privyAuthorizationKey)
    throw createError({ statusCode: 500, statusMessage: 'Authorization key not configured' })

  const privy = getPrivy()
  const { private_key } = await (privy.wallets() as any).exportPrivateKey(sender.privy_wallet_id, {
    authorization_context: { authorization_private_keys: [(config as any).privyAuthorizationKey] },
  })

  const rawAmount = toUmbraRawAmount(body.amount, decimals)
  const rpcUrl = (config as any).solanaRpcUrl || 'https://api.mainnet-beta.solana.com'
  const cluster = (config.public as any).solanaCluster || 'mainnet-beta'
  const network = cluster === 'devnet' ? 'devnet' : 'mainnet'

  const { depositSignature, withdrawSignature } = await umbraPrivateSend({
    senderPrivyWalletSecret: bs58.decode(private_key),
    recipientAddress,
    rawAmount,
    mint: mintAddress,
    rpcUrl,
    network,
  })

  await db.from('payments').insert({
    sender_id: sender.id,
    receiver_id: recipientId,
    receiver_address: recipientAddress,
    amount: 0,
    token: 'PRIVATE',
    tx_signature: withdrawSignature,
    status: 'confirmed',
    memo: body.memo ?? null,
  })

  return { depositSignature, withdrawSignature }
})
