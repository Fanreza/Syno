export default defineEventHandler(async (event) => {
	const auth = await requireUser(event);
	const db = adminDb();

	const { data: me } = await db.from("users").select("wallet_address").eq("privy_user_id", auth.userId).single();
	if (!me) throw createError({ statusCode: 400, statusMessage: "User not onboarded" });

	try {
		const config = useRuntimeConfig();
		const apiKey = (config as any).jupiterApiKey || process.env.JUPITER_API_KEY || "";

		const positions = await $fetch<any[]>(`https://api.jup.ag/lend/v1/earn/positions?users=${me.wallet_address}`, {
			headers: apiKey ? { "x-api-key": apiKey } : {},
			retry: 0,
		}).catch((error) => {
			console.error("Error fetching positions:", error);
			return [];
		});

		return (Array.isArray(positions) ? positions : [])
			.filter((pos: any) => pos.shares && Number(pos.shares) > 0)
			.map((pos: any) => {
				const { token } = pos;
				const decimals = token.asset?.decimals ?? 6;
				const balance = Number(pos.underlyingAssets ?? 0) / Math.pow(10, decimals);
				const supplyApr = token.supplyRate ? Number(token.supplyRate) / 10000 : 0;

				return {
					mint: token.assetAddress,
					jlMint: token.address,
					decimals,
					symbol: token.asset?.symbol ?? "",
					logoURI: token.asset?.logoUrl ?? "",
					supplyApr,
					balance,
					jlShares: pos.shares,
				};
			});
	} catch (error) {
		console.error("Positions endpoint error:", error);
		return [];
	}
});
