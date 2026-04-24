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

export function toUmbraRawAmount(amount: number, decimals: number): bigint {
  return BigInt(Math.round(amount * Math.pow(10, decimals)))
}

function runChild(runnerPath: string, input: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runnerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { process.stderr.write(d) })

    child.on('close', (code) => {
      try {
        const r = JSON.parse(stdout)
        if (r.error) return reject(new Error(r.error))
        resolve(r)
      } catch {
        reject(new Error(`runner failed (exit ${code}): ${stdout}`))
      }
    })

    child.on('error', reject)
    child.stdin.write(input)
    child.stdin.end()
  })
}

export interface UmbraDepositOpts {
  senderSecretKey: number[]
  recipientAddress: string
  rawAmount: string
  mint: string
  rpcUrl: string
  network: string
}

export async function umbraDeposit(opts: UmbraDepositOpts): Promise<string> {
  const runnerPath = join(process.cwd(), 'server/utils/runners/umbra-deposit-runner.mjs')
  const result = await runChild(runnerPath, JSON.stringify(opts))
  return result.depositSignature ?? ''
}

export interface UmbraClaimResult {
  claimed: number
  signatures: string[]
  insertionIndex?: string
  destinationAddress?: string
  amount?: string
}

export async function umbraClaim(opts: {
  senderSecretKey: number[]
  rpcUrl: string
  network: string
}): Promise<UmbraClaimResult> {
  const runnerPath = join(process.cwd(), 'server/utils/runners/umbra-claim-runner.mjs')
  return runChild(runnerPath, JSON.stringify(opts))
}
