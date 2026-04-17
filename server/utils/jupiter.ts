// Jupiter v6 quote + swap helpers
const JUP = 'https://quote-api.jup.ag/v6'

export interface JupQuote {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  otherAmountThreshold: string
  routePlan: any[]
  [k: string]: any
}

export async function getJupiterQuote(params: {
  inputMint: string
  outputMint: string
  amount: number // in smallest units of inputMint
  slippageBps?: number
}): Promise<JupQuote> {
  const qs = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: String(params.amount),
    slippageBps: String(params.slippageBps ?? 50)
  })
  return await $fetch<JupQuote>(`${JUP}/quote?${qs.toString()}`)
}

export async function buildJupiterSwapTx(params: {
  quote: JupQuote
  userPublicKey: string
}): Promise<string> {
  const res = await $fetch<{ swapTransaction: string }>(`${JUP}/swap`, {
    method: 'POST',
    body: {
      quoteResponse: params.quote,
      userPublicKey: params.userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true
    }
  })
  return res.swapTransaction
}
