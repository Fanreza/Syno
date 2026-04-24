import bs58 from 'bs58'
import { umbraClaim } from '../utils/umbra'

export default defineNitroPlugin(() => {
  // Poll every 60 seconds for pending private transfers to claim
  setInterval(async () => {
    try {
      await pollAndClaim()
    } catch (e: any) {
      console.error('[umbra-poller] error:', e?.message)
    }
  }, 60_000)
})

async function pollAndClaim() {
  const db = adminDb()
  const config = useRuntimeConfig()

  const { data: pending } = await db
    .from('private_transfers')
    .select('id, sender_id, recipient_address, mint, amount')
    .eq('status', 'mixing')
    .order('created_at', { ascending: true })
    .limit(5)

  if (!pending?.length) return

  console.log(`[umbra-poller] ${pending.length} pending transfer(s)`)

  const rpcUrl = (config as any).solanaRpcUrl || 'https://api.mainnet-beta.solana.com'
  const privy = getPrivy()

  // Group by sender to avoid running parallel claims for same wallet
  const senderIds = [...new Set(pending.map(t => t.sender_id))]

  for (const senderId of senderIds) {
    const transfer = pending.find(t => t.sender_id === senderId)!

    const { data: sender } = await db
      .from('users')
      .select('privy_wallet_id')
      .eq('id', senderId)
      .single()

    if (!sender?.privy_wallet_id) continue

    try {
      const { private_key } = await (privy.wallets() as any).exportPrivateKey(sender.privy_wallet_id, {
        authorization_context: { authorization_private_keys: [(config as any).privyAuthorizationKey] },
      })

      console.log(`[umbra-poller] claiming for sender ${senderId}...`)

      await db.from('private_transfers')
        .update({ status: 'claiming' })
        .eq('sender_id', senderId)
        .eq('status', 'mixing')

      const result = await umbraClaim({
        senderSecretKey: Array.from(bs58.decode(private_key)),
        rpcUrl,
        network: 'mainnet',
      })

      console.log(`[umbra-poller] claim result: claimed=${result.claimed} dest=${result.destinationAddress}`)

      if (result.claimed > 0) {
        // Mark the matching transfer as completed
        await db.from('private_transfers')
          .update({
            status: 'completed',
            withdraw_signature: result.signatures[0] ?? null,
          })
          .eq('sender_id', senderId)
          .eq('status', 'claiming')
          .eq('recipient_address', result.destinationAddress ?? '')
      } else {
        // No UTXO found yet — back to mixing
        await db.from('private_transfers')
          .update({ status: 'mixing' })
          .eq('sender_id', senderId)
          .eq('status', 'claiming')
      }
    } catch (e: any) {
      console.error(`[umbra-poller] claim failed for sender ${senderId}:`, e?.message)
      await db.from('private_transfers')
        .update({ status: 'mixing' })
        .eq('sender_id', senderId)
        .eq('status', 'claiming')
    }
  }
}
