import { spawn } from 'child_process'
import { join } from 'path'

export const UMBRA_SUPPORTED_MINTS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
} as const

const SUPPORTED_SET = new Set(Object.values(UMBRA_SUPPORTED_MINTS))

export function isUmbraSupported(mintAddress: string): boolean {
  return SUPPORTED_SET.has(mintAddress as any)
}

const RUNNER_PATH = join(process.cwd(), 'server/utils/umbra-runner.mjs')

export async function umbraPrivateSend(opts: {
  senderPrivyWalletSecret: Uint8Array
  recipientAddress: string
  rawAmount: bigint
  mint: string
  rpcUrl: string
  network?: string
}): Promise<{ depositSignature: string; withdrawSignature: string }> {
  const input = JSON.stringify({
    senderSecretKey: Array.from(opts.senderPrivyWalletSecret),
    recipientAddress: opts.recipientAddress,
    rawAmount: opts.rawAmount.toString(),
    mint: opts.mint,
    rpcUrl: opts.rpcUrl,
    network: opts.network ?? 'mainnet',
  })

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [RUNNER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    child.on('close', (code) => {
      try {
        const result = JSON.parse(stdout)
        if (result.error) return reject(new Error(result.error))
        resolve(result)
      } catch {
        reject(new Error(`Umbra runner failed (exit ${code}): ${stderr || stdout}`))
      }
    })

    child.on('error', reject)
    child.stdin.write(input)
    child.stdin.end()
  })
}

export function toUmbraRawAmount(amount: number, decimals: number): bigint {
  return BigInt(Math.round(amount * Math.pow(10, decimals)))
}
