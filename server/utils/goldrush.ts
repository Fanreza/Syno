const GOLDRUSH_BASE = "https://api.covalenthq.com/v1";
const SOLANA_CHAIN = "solana-mainnet";

export interface GoldRushToken {
	contract_address: string;
	contract_name: string;
	contract_ticker_symbol: string;
	contract_decimals: number;
	balance: string;
	balance_24h: string | null;
	quote_rate: number | null;
	quote_rate_24h: number | null;
	quote: number | null;
	quote_24h: number | null;
	pretty_quote: string | null;
	is_spam: boolean;
	is_native_token: boolean;
	logo_urls: {
		token_logo_url: string | null;
		protocol_logo_url: string | null;
		chain_logo_url: string | null;
	} | null;
	last_transferred_at: string | null;
}

export interface GoldRushBalanceResponse {
	address: string;
	chain_id: number;
	chain_name: string;
	quote_currency: string;
	updated_at: string;
	items: GoldRushToken[];
}

function getApiKey(): string {
	const config = useRuntimeConfig();
	return (config as any).goldrushApiKey || process.env.GOLDRUSH_API_KEY || "";
}

function authHeaders(apiKey: string) {
	return {
		Authorization: `Bearer ${apiKey}`,
		"Content-Type": "application/json",
	};
}

export async function getWalletBalances(
	walletAddress: string,
	options: { noSpam?: boolean; quoteCurrency?: string } = {}
): Promise<GoldRushBalanceResponse> {
	const apiKey = getApiKey();
	const params = new URLSearchParams();
	if (options.noSpam) params.set("no-spam", "true");
	if (options.quoteCurrency) params.set("quote-currency", options.quoteCurrency);

	const url = `${GOLDRUSH_BASE}/${SOLANA_CHAIN}/address/${walletAddress}/balances_v2/?${params}`;

	const res = await $fetch<{ data: GoldRushBalanceResponse; error: boolean; error_message: string | null }>(url, {
		headers: authHeaders(apiKey),
		retry: 1,
	});

	if (res.error) {
		throw createError({ statusCode: 502, statusMessage: res.error_message ?? "GoldRush API error" });
	}

	return res.data;
}

export interface RiskScore {
	score: number; // 0-100, higher = riskier
	level: "low" | "medium" | "high";
	flags: string[];
	totalTokens: number;
	spamTokens: number;
	hasActivity: boolean;
	totalUsd: number;
}

export async function getWalletRiskScore(walletAddress: string): Promise<RiskScore> {
	let data: GoldRushBalanceResponse;
	try {
		data = await getWalletBalances(walletAddress, { noSpam: false });
	} catch {
		// If we can't fetch, return neutral score
		return { score: 50, level: "medium", flags: ["Could not verify wallet"], totalTokens: 0, spamTokens: 0, hasActivity: false, totalUsd: 0 };
	}

	const items = data.items ?? [];
	const spamTokens = items.filter((t) => t.is_spam).length;
	const totalTokens = items.length;
	const totalUsd = items.reduce((sum, t) => sum + (t.quote ?? 0), 0);
	const hasActivity = items.some((t) => t.last_transferred_at !== null);

	const flags: string[] = [];
	let score = 0;

	// Spam token ratio
	const spamRatio = totalTokens > 0 ? spamTokens / totalTokens : 0;
	if (spamRatio > 0.5) {
		flags.push("High ratio of spam tokens");
		score += 40;
	} else if (spamRatio > 0.2) {
		flags.push("Some spam tokens detected");
		score += 20;
	}

	// New / empty wallet
	if (totalTokens === 0 || !hasActivity) {
		flags.push("New or inactive wallet");
		score += 15;
	}

	// Very low balance — might be a fresh drainer wallet
	if (hasActivity && totalUsd < 0.1 && totalTokens > 0) {
		flags.push("Very low balance");
		score += 10;
	}

	// Lots of tokens but tiny balances — typical airdrop/spam wallet
	if (totalTokens > 20 && totalUsd < 10) {
		flags.push("Many tokens, low value");
		score += 15;
	}

	score = Math.min(100, score);

	const level: RiskScore["level"] = score >= 50 ? "high" : score >= 20 ? "medium" : "low";

	return { score, level, flags, totalTokens, spamTokens, hasActivity, totalUsd };
}
