import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'

const JUP = 'https://api.jup.ag/swap/v1'

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

function jupHeaders(): Record<string, string> {
  const key = useRuntimeConfig().jupiterApiKey as string | undefined
  return key ? { 'x-api-key': key } : {}
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
  return await $fetch<JupQuote>(`${JUP}/quote?${qs.toString()}`, {
    headers: jupHeaders(),
    retry: 0,
  })
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
  destinationWallet?: string
}): Promise<string> {
  const SOL_MINT = 'So11111111111111111111111111111111111111112'
  const outputMint = params.quote.outputMint

  // Only pass destinationTokenAccount when output is an SPL token AND the ATA already exists.
  // If we pass a non-existent ATA, Jupiter's simulation will fail with InvalidAccountData.
  // When omitted, Jupiter delivers to the signer's own wallet — which is fine for direct sends.
  // For payment links the receiver gets credited via our DB record; the swap settles to sender
  // who then does a separate SPL transfer. But simplest correct approach: omit and let Jupiter
  // deliver to sender, then we transfer to receiver separately.
  // Exception: if destinationWallet === userPublicKey (self-swap), always omit.
  let destinationTokenAccount: string | undefined
  if (params.destinationWallet && params.destinationWallet !== params.userPublicKey && outputMint !== SOL_MINT) {
    // Derive receiver ATA — pass only if we're confident it exists (Jupiter will create it if not,
    // but only when it's the signer's own ATA). For external receivers, omit to avoid InvalidAccountData.
    // Jupiter will route output to userPublicKey's ATA by default.
    destinationTokenAccount = undefined
  }

  const res = await $fetch<{ swapTransaction: string }>(`${JUP}/swap`, {
    method: 'POST',
    headers: jupHeaders(),
    retry: 0,
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
