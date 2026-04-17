import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'

let conn: Connection | null = null
export function getConnection(): Connection {
  if (conn) return conn
  const config = useRuntimeConfig()
  conn = new Connection(config.solanaRpcUrl, 'confirmed')
  return conn
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

export async function getSolBalance(address: string): Promise<number> {
  const lamports = await getConnection().getBalance(new PublicKey(address))
  return lamports / LAMPORTS_PER_SOL
}
