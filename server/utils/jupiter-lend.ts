import { Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { Client } from "@jup-ag/lend-read";
import { getDepositIxs, getWithdrawIxs } from "@jup-ag/lend/earn";
import BN from "bn.js";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const connection = new Connection(useRuntimeConfig().solanaRpcUrl);

export function getLendClient(): Client {
	// @jup-ag/lend-read depends on @coral-xyz/anchor which requires ANCHOR_WALLET
	// to point to a keypair JSON file. This dummy keypair is never used for signing.
	if (!process.env.ANCHOR_WALLET) {
		const kpPath = join(tmpdir(), "payra-anchor-dummy.json");
		writeFileSync(kpPath, JSON.stringify(Array.from(Keypair.generate().secretKey)));
		process.env.ANCHOR_WALLET = kpPath;
	}

	return new Client(connection);
}

export async function buildEarnDepositTx(walletAddress: string, mintAddress: string, amount: BN): Promise<string> {
	const signer = new PublicKey(walletAddress);
	const asset = new PublicKey(mintAddress);

	const { ixs } = await getDepositIxs({ amount, asset, signer, connection });

	const { blockhash } = await connection.getLatestBlockhash();
	const message = new TransactionMessage({
		payerKey: signer,
		recentBlockhash: blockhash,
		instructions: ixs,
	}).compileToV0Message();

	const tx = new VersionedTransaction(message);
	return Buffer.from(tx.serialize()).toString("base64");
}

export async function buildEarnWithdrawTx(walletAddress: string, mintAddress: string, amount: BN): Promise<string> {
	const signer = new PublicKey(walletAddress);
	const asset = new PublicKey(mintAddress);

	const { ixs } = await getWithdrawIxs({ amount, asset, signer, connection });

	const { blockhash } = await connection.getLatestBlockhash();
	const message = new TransactionMessage({
		payerKey: signer,
		recentBlockhash: blockhash,
		instructions: ixs,
	}).compileToV0Message();

	const tx = new VersionedTransaction(message);
	return Buffer.from(tx.serialize()).toString("base64");
}
