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
