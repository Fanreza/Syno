import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'

export function getConnection(): Connection {
  const config = useRuntimeConfig()
  return new Connection(config.solanaRpcUrl, 'confirmed')
}

export async function buildTransferSolTx(from: string, to: string, sol: number): Promise<string> {
  const connection = getConnection()
  const fromPk = new PublicKey(from)
  const toPk = new PublicKey(to)
  const { blockhash } = await connection.getLatestBlockhash()
  const tx = new Transaction({ feePayer: fromPk, recentBlockhash: blockhash }).add(
    SystemProgram.transfer({
      fromPubkey: fromPk,
      toPubkey: toPk,
      lamports: Math.round(sol * LAMPORTS_PER_SOL)
    })
  )
  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false })
  return Buffer.from(serialized).toString('base64')
}

export async function refreshBlockhash(base64Tx: string, blockhash?: string): Promise<string> {
  const connection = getConnection()
  const hash = blockhash ?? (await connection.getLatestBlockhash()).blockhash
  const buf = Buffer.from(base64Tx, 'base64')
  try {
    const tx = VersionedTransaction.deserialize(buf)
    tx.message.recentBlockhash = hash
    return Buffer.from(tx.serialize()).toString('base64')
  } catch {
    const tx = Transaction.from(buf)
    tx.recentBlockhash = hash
    return Buffer.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false })).toString('base64')
  }
}

export async function getSolBalance(address: string): Promise<number> {
  const lamports = await getConnection().getBalance(new PublicKey(address))
  return lamports / LAMPORTS_PER_SOL
}

const SOL_MINT = 'So11111111111111111111111111111111111111112'

export async function getTokenBalance(walletAddress: string, mint: string): Promise<bigint> {
  const connection = getConnection()
  if (mint === SOL_MINT) {
    const lamports = await connection.getBalance(new PublicKey(walletAddress))
    return BigInt(lamports)
  }
  const ata = getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(walletAddress), true)
  const info = await connection.getTokenAccountBalance(ata)
  return BigInt(info.value.amount)
}
