export default defineEventHandler(async (event) => {
	const auth = await requireUser(event);
	const db = adminDb();

	// Primary lookup by privy_user_id
	const { data } = await db.from("users").select("*").eq("privy_user_id", auth.userId).maybeSingle();

	if (data) return data;

	// Fallback: wallet login (SIWS) may produce a different privy_user_id than email/Google login.
	// Decode the JWT to extract all claims — Privy embeds linked wallet addresses in the token.
	try {
		const token = getHeader(event, "authorization")?.slice(7) ?? "";
		const payloadB64 = token.split(".")[1];
		if (!payloadB64) return null;
		const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

		// Privy embeds linked Solana wallet in the token payload
		const walletAddress = payload.wallet_address ?? payload.solana_wallet_address ?? payload.linked_accounts?.find((a: any) => a.chain_type === "solana")?.address ?? null;

		if (!walletAddress) return null;

		const { data: existing } = await db.from("users").select("*").eq("wallet_address", walletAddress).maybeSingle();

		if (!existing) return null;

		// Migrate privy_user_id so future lookups hit the primary path
		await db.from("users").update({ privy_user_id: auth.userId }).eq("id", existing.id);

		return { ...existing, privy_user_id: auth.userId };
	} catch {
		return null;
	}
});
