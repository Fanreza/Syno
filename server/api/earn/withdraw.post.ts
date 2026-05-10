import BN from "bn.js";
import { VersionedTransaction } from "@solana/web3.js";
import { authorizationContext } from "../../utils/privy";
import { buildEarnWithdrawTx } from "../../utils/jupiter-lend";
import { getConnection, getTokenBalance } from "../../utils/solana";
import { getJupiterQuote, buildJupiterSwapTx } from "../../utils/jupiter";

async function signAndBroadcastTx(privy: any, walletId: string, base64Tx: string): Promise<string> {
	const connection = getConnection();
	const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

	const buf = Buffer.from(base64Tx, "base64");
	let serializedTx: string;
	try {
		const tx = VersionedTransaction.deserialize(buf);
		tx.message.recentBlockhash = blockhash;
		serializedTx = Buffer.from(tx.serialize()).toString("base64");
	} catch {
		const { Transaction } = await import("@solana/web3.js");
		const tx = Transaction.from(buf);
		tx.recentBlockhash = blockhash;
		serializedTx = Buffer.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false })).toString("base64");
	}

	const signResponse = await (privy.wallets() as any).solana().signTransaction(walletId, { transaction: serializedTx, ...authorizationContext() });

	const signedBytes = Buffer.from(signResponse.signed_transaction as string, "base64");
	const signature = await connection.sendRawTransaction(signedBytes, { skipPreflight: false });
	await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
	return signature;
}

export default defineEventHandler(async (event) => {
	const auth = await requireUser(event);
	const body = await readBody<{ mint: string; amount: number; decimals: number; isMax?: boolean; outputMint?: string }>(event);

	if (!body?.mint || !body?.amount || body.amount <= 0) {
		throw createError({ statusCode: 400, statusMessage: "mint and amount required" });
	}

	const db = adminDb();
	const { data: me } = await db.from("users").select("wallet_address, privy_wallet_id").eq("privy_user_id", auth.userId).single();
	if (!me?.privy_wallet_id) throw createError({ statusCode: 400, statusMessage: "Wallet not found" });

	const privy = getPrivy();
	const config = useRuntimeConfig();
	const apiKey = (config as any).jupiterApiKey || process.env.JUPITER_API_KEY || "";
	const outputMint = body.outputMint ?? body.mint;

	let withdrawSignature: string;

	// All withdrawals use /redeem REST API with shares conversion
	const positions = await $fetch<any[]>(`https://api.jup.ag/lend/v1/earn/positions?users=${me.wallet_address}`, {
		headers: apiKey ? { "x-api-key": apiKey } : {},
		retry: 0,
	}).catch(() => []);

	const position = positions.find((p: any) => p.token?.assetAddress === body.mint);
	if (!position?.shares || Number(position.shares) === 0) {
		throw createError({ statusCode: 400, statusMessage: "No position found for this token" });
	}

	let sharesToRedeem: string;
	if (body.isMax) {
		sharesToRedeem = position.shares;
	} else {
		// Partial: convert amount → shares using proportion
		const positionUnderlyingRaw = Number(position.underlyingAssets ?? 0);
		const requestedAmountRaw = Math.round(body.amount * Math.pow(10, body.decimals));
		const proportion = requestedAmountRaw / positionUnderlyingRaw;
		const positionShares = Number(position.shares);
		sharesToRedeem = String(Math.floor(positionShares * proportion));
	}

	const redeemTx = await $fetch<{ transaction: string }>("https://api.jup.ag/lend/v1/earn/redeem", {
		method: "POST",
		headers: { "Content-Type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
		body: {
			asset: body.mint,
			signer: me.wallet_address,
			shares: sharesToRedeem,
		},
	}).catch((err) => {
		console.error("Redeem API error:", err);
		if (err?.status === 503 || err?.statusCode === 503)
			throw createError({ statusCode: 503, statusMessage: "Jupiter Lend is temporarily unavailable. Try again in a moment." })
		throw createError({ statusCode: 502, statusMessage: "Failed to build redeem transaction. Try again." });
	});

	withdrawSignature = await signAndBroadcastTx(privy, me.privy_wallet_id, redeemTx.transaction);

	// Cross-token swap: if withdrawing different token than earning
	if (outputMint !== body.mint) {
		// Read post-redeem balance from tx metadata to avoid RPC lag returning stale data
		const connection = getConnection();
		const { PublicKey } = await import("@solana/web3.js");
		const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
		const redeemTxResult = await connection.getTransaction(withdrawSignature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
		const ata = getAssociatedTokenAddressSync(new PublicKey(body.mint), new PublicKey(me.wallet_address));
		const ataStr = ata.toBase58();
		const postBalances = redeemTxResult?.meta?.postTokenBalances ?? [];
		const ataEntry = postBalances.find((b: any) => b.mint === body.mint && b.owner === me.wallet_address)
			?? postBalances.find((b: any) => redeemTxResult?.transaction?.message?.staticAccountKeys?.[b.accountIndex]?.toBase58() === ataStr);
		const redeemBalance = ataEntry ? BigInt(ataEntry.uiTokenAmount.amount) : await getTokenBalance(me.wallet_address, body.mint);
		const withdrawnRaw = redeemBalance > BigInt(0) ? Number(redeemBalance) : Math.round(body.amount * Math.pow(10, body.decimals));

		const quote = await getJupiterQuote({
			inputMint: body.mint,
			outputMint,
			amount: withdrawnRaw,
			swapMode: "ExactIn",
			slippageBps: 100,
		});
		const swapTx = await buildJupiterSwapTx({ quote, userPublicKey: me.wallet_address });
		const swapSignature = await signAndBroadcastTx(privy, me.privy_wallet_id, swapTx);
		return { signature: swapSignature };
	}

	return { signature: withdrawSignature };
});
