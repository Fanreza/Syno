import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'

const JUP = 'https://quote-api.jup.ag/v6'

export interface JupQuote {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  otherAmountThreshold: string
  swapMode: string
  routePlan: any[]
  [k: string]: any
}

export async function getJupiterQuote(params: {
  inputMint: string
  outputMint: string
  amount: number
  slippageBps?: number
  swapMode?: 'ExactIn' | 'ExactOut'
}): Promise<JupQuote> {
  const qs = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: String(params.amount),
    slippageBps: String(params.slippageBps ?? 50),
    swapMode: params.swapMode ?? 'ExactIn',
  })
  return await $fetch<JupQuote>(`${JUP}/quote?${qs.toString()}`)
}

// Derive the Associated Token Account address for a wallet + mint.
// Returns null for native SOL (no ATA needed).
export function getAta(walletAddress: string, mintAddress: string): string | null {
  const SOL_MINT = 'So11111111111111111111111111111111111111112'
  if (mintAddress === SOL_MINT) return null
  const ata = getAssociatedTokenAddressSync(
    new PublicKey(mintAddress),
    new PublicKey(walletAddress),
    true // allowOwnerOffCurve for PDAs
  )
  return ata.toBase58()
}

export async function buildJupiterSwapTx(params: {
  quote: JupQuote
  userPublicKey: string
  destinationWallet?: string  // wallet address of recipient; ATA derived automatically
}): Promise<string> {
  // For SPL output tokens, Jupiter needs the recipient's ATA, not their wallet address.
  // For SOL output, destinationTokenAccount must be omitted (wrapAndUnwrapSol handles it).
  let destinationTokenAccount: string | undefined
  if (params.destinationWallet) {
    const ata = getAta(params.destinationWallet, params.quote.outputMint)
    destinationTokenAccount = ata ?? undefined
  }

  const res = await $fetch<{ swapTransaction: string }>(`${JUP}/swap`, {
    method: 'POST',
    body: {
      quoteResponse: params.quote,
      userPublicKey: params.userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      ...(destinationTokenAccount ? { destinationTokenAccount } : {}),
    }
  })
  return res.swapTransaction
}
