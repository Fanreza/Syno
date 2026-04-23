import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortAddr(addr?: string | null, n = 4) {
  if (!addr) return ''
  return `${addr.slice(0, n)}…${addr.slice(-n)}`
}

export function formatUsd(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export function formatAmount(n: number, decimals = 4) {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function isValidSolanaAddress(addr: string): boolean {
  if (!addr || addr.length < 32 || addr.length > 44) return false
  if (![...addr].every(c => BASE58_ALPHABET.includes(c))) return false
  // Decode base58 and verify it produces exactly 32 bytes
  let num = 0n
  for (const c of addr) {
    num = num * 58n + BigInt(BASE58_ALPHABET.indexOf(c))
  }
  let hex = num.toString(16)
  if (hex.length % 2) hex = '0' + hex
  const leadingZeros = [...addr].filter(c => c === '1').length
  const totalBytes = leadingZeros + hex.length / 2
  return totalBytes === 32
}
