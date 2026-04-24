import { spawn } from 'child_process'
import { join } from 'path'

export const PRIVATE_SEND_SUPPORTED_MINTS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
} as const

const SUPPORTED_SET = new Set(Object.values(PRIVATE_SEND_SUPPORTED_MINTS))

export function isPrivateSendSupported(mintAddress: string): boolean {
  return SUPPORTED_SET.has(mintAddress as any)
}

export function toRawAmount(amount: number, decimals: number): bigint {
  return BigInt(Math.round(amount * Math.pow(10, decimals)))
}

type Provider = 'umbra' | 'magicblock' | 'cloak'

function getProvider(): Provider {
  const p = (process.env.PRIVATE_SEND_PROVIDER ?? 'magicblock').toLowerCase()
  if (p === 'umbra' || p === 'magicblock' || p === 'cloak') return p
  return 'magicblock'
}

const RUNNER: Record<Provider, string> = {
  umbra: join(process.cwd(), 'server/utils/runners/umbra-runner.mjs'),
  magicblock: join(process.cwd(), 'server/utils/runners/magicblock-runner.mjs'),
  cloak: join(process.cwd(), 'server/utils/runners/cloak-runner.mjs'),
}

export interface PrivateSendOpts {
  senderPrivyWalletSecret: Uint8Array
  recipientAddress: string
  rawAmount: bigint
  mint: string
  rpcUrl: string
  network?: string
  split?: number
  minDelayMs?: number
  maxDelayMs?: number
}

export interface PrivateSendResult {
  signature: string
  provider: Provider
  extra?: Record<string, string>
}

export async function privateSend(opts: PrivateSendOpts): Promise<PrivateSendResult> {
  const provider = getProvider()
  const runnerPath = RUNNER[provider]

  const input = JSON.stringify({
    senderSecretKey: Array.from(opts.senderPrivyWalletSecret),
    recipientAddress: opts.recipientAddress,
    rawAmount: opts.rawAmount.toString(),
    mint: opts.mint,
    rpcUrl: opts.rpcUrl,
    network: opts.network ?? 'mainnet',
    split: opts.split,
    minDelayMs: opts.minDelayMs,
    maxDelayMs: opts.maxDelayMs,
  })

  const result = await runChild(runnerPath, input, provider)
  return { ...result, provider }
}

function runChild(runnerPath: string, input: string, provider: string): Promise<PrivateSendResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runnerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); process.stderr.write(d) })

    child.on('close', (code) => {
      try {
        const r = JSON.parse(stdout)
        if (r.error) return reject(new Error(`[${provider}] ${r.error}`))
        // Normalise: every runner must return at least { signature }
        // Umbra returns { depositSignature, withdrawSignature } — use withdrawSignature as canonical
        const signature = r.signature ?? r.withdrawSignature ?? r.depositSignature
        if (!signature) return reject(new Error(`[${provider}] no signature in response: ${stdout}`))
        const { signature: _s, ...extra } = r
        resolve({ signature, provider: provider as Provider, extra })
      } catch {
        reject(new Error(`[${provider}] runner failed (exit ${code}): ${stderr || stdout}`))
      }
    })

    child.on('error', reject)
    child.stdin.write(input)
    child.stdin.end()
  })
}
