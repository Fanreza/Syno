import { spawn } from 'child_process'
import { join } from 'path'

export function toRawAmount(amount: number, decimals: number): bigint {
  return BigInt(Math.round(amount * Math.pow(10, decimals)))
}

const RUNNER_PATH = join(process.cwd(), 'server/utils/runners/magicblock-runner.mjs')

export interface PrivateSendOpts {
  senderPrivyWalletSecret: Uint8Array
  recipientAddress: string
  rawAmount: bigint
  mint: string
  rpcUrl: string
  split?: number
  minDelayMs?: number
  maxDelayMs?: number
}

export interface PrivateSendResult {
  signature: string
  provider: 'magicblock'
}

export async function privateSend(opts: PrivateSendOpts): Promise<PrivateSendResult> {
  const input = JSON.stringify({
    senderSecretKey: Array.from(opts.senderPrivyWalletSecret),
    recipientAddress: opts.recipientAddress,
    rawAmount: opts.rawAmount.toString(),
    mint: opts.mint,
    rpcUrl: opts.rpcUrl,
    split: opts.split,
    minDelayMs: opts.minDelayMs,
    maxDelayMs: opts.maxDelayMs,
  })

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [RUNNER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); process.stderr.write(d) })

    child.on('close', (code) => {
      try {
        const r = JSON.parse(stdout)
        if (r.error) return reject(new Error(`[magicblock] ${r.error}`))
        if (!r.signature) return reject(new Error(`[magicblock] no signature in response: ${stdout}`))
        resolve({ signature: r.signature, provider: 'magicblock' })
      } catch {
        reject(new Error(`[magicblock] runner failed (exit ${code}): ${stderr || stdout}`))
      }
    })

    child.on('error', reject)
    child.stdin.write(input)
    child.stdin.end()
  })
}
