<script setup lang="ts">
import { TrendingUp, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, AlertCircle, ExternalLink, Loader2, Zap, ArrowRight, RefreshCw } from "lucide-vue-next";
import TokenPicker from "~/components/TokenPicker.vue";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
const { formatDisplay, fetchRates } = useDisplayCurrency()
onMounted(() => fetchRates())

const { apiFetch } = useAuth();
const { balance, pending, refresh: refreshBalance } = useBalance();

const successEl = ref<HTMLElement>();

async function fireConfetti() {
	const party = (await import("party-js")).default;
	if (successEl.value) party.confetti(successEl.value, { count: party.variation.range(60, 100) });
}

type Market = {
	mint: string;
	jlMint: string;
	symbol: string;
	name: string;
	logoURI: string;
	decimals: number;
	price: number;
	supplyApr: number;
	totalAssets: number;
	totalSupply: number;
};

type Position = {
	mint: string;
	jlMint: string;
	symbol: string;
	logoURI: string;
	decimals: number;
	supplyApr: number;
	balance: number;
	jlShares: string;
};

const { data: markets, pending: loadingMarkets, refresh: refreshMarkets, error: marketsError } = useAsyncData<Market[]>("earn:markets", () => $fetch<Market[]>("/api/earn/markets" as string), { lazy: true, server: false, default: () => [] });

const { data: positions, pending: loadingPositions, refresh: refreshPositions, error: positionsError } = useAsyncData<Position[]>("earn:positions", () => apiFetch("/api/earn/positions"), { lazy: true, server: false, default: () => [] });

const fetchError = computed(() => marketsError.value || positionsError.value)

async function retryAll() {
  await Promise.all([refreshMarkets(), refreshPositions()])
}

onMounted(() => { refreshMarkets(); refreshPositions() })

type ModalMode = "deposit" | "withdraw";
const modalOpen = ref(false);
const modal = ref<{ mode: ModalMode; market: Market } | null>(null);
const amountRaw = ref("");
const selectedToken = ref<JupToken>(SOL_TOKEN);
const loading = ref(false);
const error = ref("");
const successSig = ref("");
const quotePending = ref(false);
const quoteError = ref("");
const swapQuote = ref<{ outAmount: string; otherAmountThreshold: string; priceImpactPct?: string } | null>(null);
let quoteTimer: ReturnType<typeof setTimeout> | null = null;

function tokenFromMarket(market: Market): JupToken {
	return POPULAR_TOKENS.find((t) => t.address === market.mint) ?? {
		address: market.mint,
		symbol: market.symbol,
		name: market.name,
		decimals: market.decimals,
		logoURI: market.logoURI,
	}
}

function openDeposit(market: Market) {
	modal.value = { mode: "deposit", market };
	amountRaw.value = "";
	error.value = "";
	successSig.value = "";
	selectedToken.value = tokenFromMarket(market);
	refreshBalance();
	modalOpen.value = true;
}

function openWithdraw(market: Market) {
	modal.value = { mode: "withdraw", market };
	amountRaw.value = "";
	error.value = "";
	successSig.value = "";
	isMaxWithdraw.value = false;
	selectedToken.value = tokenFromMarket(market);
	refreshBalance();
	modalOpen.value = true;
}

function closeModal() {
	modalOpen.value = false;
	modal.value = null;
	amountRaw.value = "";
	error.value = "";
	successSig.value = "";
	quoteError.value = "";
	swapQuote.value = null;
	refreshBalance();
	refreshPositions();
}

function onOpenChange(val: boolean) {
	if (!val) closeModal();
}

function onAmountInput(e: Event) {
	let s = (e.target as HTMLInputElement).value.replace(/[^0-9.]/g, "");
	const parts = s.split(".");
	if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
	amountRaw.value = s;
	isMaxWithdraw.value = false;
}

const amountNum = computed(() => parseFloat(amountRaw.value) || 0);
const isMaxWithdraw = ref(false);
const positionForModal = computed(() => (modal.value ? positions.value?.find((p) => p.mint === modal.value!.market.mint) : null));
const modalTokenSymbol = computed(() => (modal.value?.mode === "deposit" ? selectedToken.value.symbol : (modal.value?.market.symbol ?? "")));
const quoteTokenSymbol = computed(() => (modal.value?.mode === "deposit" ? (modal.value?.market.symbol ?? "") : selectedToken.value.symbol));
const quoteOutputDecimals = computed(() => {
	if (!modal.value) return selectedToken.value.decimals;
	return modal.value.mode === "deposit" ? modal.value.market.decimals : selectedToken.value.decimals;
});
const needsSwapQuote = computed(() => !!modal.value && selectedToken.value.address !== modal.value.market.mint && amountNum.value > 0);
const exceedsInputBalance = computed(() => modal.value?.mode === "deposit" && !!inputTokenBalance.value && amountNum.value > inputTokenBalance.value.amount);
const exceedsWithdrawBalance = computed(() => modal.value?.mode === "withdraw" && !!positionForModal.value && amountNum.value > Number(positionForModal.value.balance));
const canSubmit = computed(() => amountNum.value > 0 && !loading.value && !successSig.value && !exceedsInputBalance.value && !exceedsWithdrawBalance.value && (!needsSwapQuote.value || (!!swapQuote.value && !quotePending.value)));
const quoteOutputAmount = computed(() => {
	if (!swapQuote.value) return 0;
	return Number(swapQuote.value.outAmount) / Math.pow(10, quoteOutputDecimals.value);
});
const quoteMinOutputAmount = computed(() => {
	if (!swapQuote.value) return 0;
	return Number(swapQuote.value.otherAmountThreshold) / Math.pow(10, quoteOutputDecimals.value);
});
const quotePriceImpact = computed(() => Number(swapQuote.value?.priceImpactPct ?? 0));
const loadingPage = computed(() => loadingMarkets.value || loadingPositions.value);

const inputTokenBalance = computed(() => {
	if (!balance.value) return null;
	const SOL_MINT = "So11111111111111111111111111111111111111112";
	if (selectedToken.value.address === SOL_MINT) {
		return { amount: balance.value.sol, usd: balance.value.usd, symbol: "SOL" };
	}
	const t = balance.value.tokens.find((t: any) => t.mint === selectedToken.value.address);
	if (!t) return null;
	return { amount: t.balance, usd: t.usd, symbol: t.symbol };
});

watch([amountRaw, selectedToken, modal], (_value, _oldValue, onCleanup) => {
	if (quoteTimer) clearTimeout(quoteTimer);
	let cancelled = false;
	onCleanup(() => {
		cancelled = true;
		if (quoteTimer) clearTimeout(quoteTimer);
	});

	quoteError.value = "";
	swapQuote.value = null;

	if (!needsSwapQuote.value || !modal.value) {
		quotePending.value = false;
		return;
	}

	quotePending.value = true;
	quoteTimer = setTimeout(async () => {
		try {
			const quote = await $fetch<{ outAmount: string; otherAmountThreshold: string; priceImpactPct?: string }>("/api/earn/quote", {
				query: {
					inputMint: modal.value!.mode === "deposit" ? selectedToken.value.address : modal.value!.market.mint,
					outputMint: modal.value!.mode === "deposit" ? modal.value!.market.mint : selectedToken.value.address,
					amount: amountNum.value,
					decimals: modal.value!.mode === "deposit" ? selectedToken.value.decimals : modal.value!.market.decimals,
				},
			});
			if (cancelled) return;
			swapQuote.value = quote;
		} catch (e: any) {
			if (cancelled) return;
			quoteError.value = e?.data?.statusMessage || e?.message || "Quote unavailable";
		} finally {
			if (cancelled) return;
			quotePending.value = false;
		}
	}, 350);
});

async function onSubmit() {
	if (!modal.value) return;
	error.value = "";
	loading.value = true;
	try {
		const { mint, decimals } = modal.value.market;
		const endpoint = modal.value.mode === "deposit" ? "/api/earn/deposit" : "/api/earn/withdraw";
		const isSwap = selectedToken.value.address !== mint;
		const pos = positionForModal.value;
		const body: Record<string, any> = {
			mint,
			amount: amountNum.value,
			decimals: modal.value.mode === "deposit" && isSwap ? selectedToken.value.decimals : decimals,
			...(modal.value.mode === "deposit" && isSwap ? { inputMint: selectedToken.value.address } : {}),
			...(modal.value.mode === "withdraw" && isSwap ? { outputMint: selectedToken.value.address } : {}),
			...(modal.value.mode === "withdraw" && pos ? { jlShares: pos.jlShares, positionBalance: pos.balance, isMax: isMaxWithdraw.value } : {}),
		};
		const res = await apiFetch<{ signature: string }>(endpoint, {
			method: "POST",
			body,
		});
		successSig.value = res.signature;
		await refreshPositions();
		refreshBalance();
		await nextTick();
		fireConfetti();
	} catch (e: any) {
		error.value = e?.data?.statusMessage || e?.message || "Transaction failed";
	} finally {
		loading.value = false;
	}
}

function formatApr(apr: number | string) {
	const n = Number(apr);
	return n > 0 ? n.toFixed(2) + "%" : "—";
}

function formatTvl(totalAssets: number, decimals: number, price: number) {
	const usd = (totalAssets / Math.pow(10, decimals)) * price;
	return usd > 0 ? formatDisplay(usd) : "—";
}

function positionFor(mint: string) {
	return positions.value?.find((p) => p.mint === mint);
}

const totalEarningUsd = computed(() => {
	if (!positions.value?.length || !markets.value?.length) return 0;
	return positions.value.reduce((sum, p) => {
		const m = markets.value!.find((m) => m.mint === p.mint);
		return sum + Number(p.balance) * (m?.price ?? 0);
	}, 0);
});
</script>

<template>
	<div class="min-h-screen p-4 md:p-8">
		<!-- Header row -->
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold">Earn</h1>
				<p class="mt-0.5 text-sm text-muted-foreground">Deposit tokens and earn interest.</p>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
			<!-- Hero card — your earnings summary -->
			<div class="md:col-span-7 relative overflow-hidden rounded-2xl border border-border p-6 shadow-lg" style="background: linear-gradient(135deg, hsl(142 60% 12%) 0%, hsl(142 50% 16%) 50%, hsl(142 60% 12%) 100%)">
				<div class="pointer-events-none absolute inset-0 opacity-[0.03]" style="background-image: radial-gradient(circle, white 1px, transparent 1px); background-size: 20px 20px" />
				<div class="pointer-events-none absolute -top-6 right-8 h-32 w-32 rounded-full opacity-10" style="background: radial-gradient(circle, hsl(142 60% 60%) 0%, transparent 70%)" />

				<div class="relative z-10 flex flex-col justify-between gap-4 md:gap-6 min-h-35 md:h-full">
					<div v-if="loadingPage" class="space-y-4">
						<div class="flex items-start justify-between">
							<div class="space-y-2">
								<div class="h-3 w-24 rounded bg-white/10 animate-pulse" />
								<div class="h-10 w-36 rounded bg-white/15 animate-pulse" />
								<div class="h-4 w-44 rounded bg-white/10 animate-pulse" />
							</div>
							<div class="h-10 w-10 rounded-xl bg-white/10 animate-pulse" />
						</div>
						<div class="flex flex-wrap gap-2">
							<div v-for="i in 3" :key="i" class="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
								<div class="h-5 w-5 rounded-full bg-white/15 animate-pulse" />
								<div class="h-3 w-10 rounded bg-white/15 animate-pulse" />
								<div class="h-3 w-12 rounded bg-white/10 animate-pulse" />
								<div class="h-4 w-12 rounded bg-white/15 animate-pulse" />
							</div>
						</div>
					</div>
					<div v-else class="flex items-start justify-between">
						<div>
							<p class="text-xs font-medium text-white/50">Total deposited</p>
							<h2 class="mt-1 text-3xl font-bold tracking-tight text-white">
								{{ totalEarningUsd > 0 ? formatDisplay(totalEarningUsd) : positions?.length ? "—" : formatDisplay(0) }}
							</h2>
							<p v-if="positions?.length" class="mt-0.5 text-sm text-white/40">across {{ positions.length }} position{{ positions.length > 1 ? "s" : "" }}</p>
							<p v-else class="mt-0.5 text-sm text-white/40">Start earning by depositing below</p>
						</div>
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
							<TrendingUp class="h-5 w-5 text-white/70" />
						</div>
					</div>

					<!-- Active positions -->
					<div v-if="!loadingPage && positions?.length" class="flex flex-wrap gap-2">
						<div v-for="pos in positions" :key="pos.mint" class="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
							<img v-if="pos.logoURI" :src="pos.logoURI" class="h-5 w-5 rounded-full" />
							<span class="text-xs font-semibold text-white">{{ pos.symbol }}</span>
							<span class="text-xs text-white/60">{{ Number(pos.balance).toFixed(4) }}</span>
							<span class="rounded-md bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-300">{{ formatApr(pos.supplyApr) }}</span>
							<button class="ml-1 rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70 transition hover:bg-white/20" @click="openWithdraw({ mint: pos.mint, jlMint: pos.jlMint, symbol: pos.symbol, name: pos.symbol, logoURI: pos.logoURI, decimals: pos.decimals, supplyApr: pos.supplyApr, totalAssets: 0, totalSupply: 0, price: 0 })">Withdraw</button>
						</div>
					</div>
					<div v-else-if="fetchError && !loadingPage" class="flex items-center gap-2 rounded-xl bg-white/8 px-4 py-3">
						<AlertCircle class="h-4 w-4 text-white/40" />
						<p class="text-xs text-white/40">Could not load positions.
							<button class="underline hover:text-white/70 transition" @click="retryAll">Retry</button>
						</p>
					</div>
					<div v-else-if="!loadingPage" class="flex items-center gap-2 rounded-xl bg-white/8 px-4 py-3">
						<Zap class="h-4 w-4 text-white/40" />
						<p class="text-xs text-white/40">No active positions. Pick a market below to get started.</p>
					</div>
				</div>
			</div>

			<!-- Stats sidebar -->
			<div class="md:col-span-5 grid grid-cols-3 md:grid-cols-1 md:grid-rows-3 gap-3">
				<template v-if="loadingPage">
					<div v-for="i in 3" :key="i" class="rounded-2xl border border-border bg-card px-4 py-3 md:px-5 md:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-1">
						<div class="w-full space-y-2">
							<div class="h-3 w-20 rounded skeleton" />
							<div class="h-8 w-24 rounded skeleton" />
						</div>
						<div class="hidden md:block h-4 w-4 rounded skeleton" />
					</div>
				</template>
				<template v-else>
					<div class="rounded-2xl border border-border bg-card px-4 py-3 md:px-5 md:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-1">
						<div>
							<p class="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-muted-foreground">Best rate</p>
							<p class="mt-0.5 text-lg md:text-2xl font-bold text-green-500">
								{{ markets?.length ? formatApr(Math.max(...markets.map((m) => Number(m.supplyApr)))) : "—" }}
							</p>
						</div>
						<TrendingUp class="hidden md:block h-4 w-4 text-muted-foreground opacity-50" />
					</div>
					<div class="rounded-2xl border border-border bg-card px-4 py-3 md:px-5 md:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-1">
						<div>
							<p class="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-muted-foreground">Markets</p>
							<p class="mt-0.5 text-lg md:text-2xl font-bold">
								{{ markets?.length ?? "—" }}
								<span class="text-xs md:text-sm font-medium text-muted-foreground">avail.</span>
							</p>
						</div>
						<ArrowDownToLine class="hidden md:block h-4 w-4 text-muted-foreground opacity-50" />
					</div>
					<div class="rounded-2xl border border-border bg-card px-4 py-3 md:px-5 md:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-1">
						<div>
							<p class="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-muted-foreground">Positions</p>
							<p class="mt-0.5 text-lg md:text-2xl font-bold">
								{{ positions?.length ?? 0 }}
								<span class="text-xs md:text-sm font-medium text-muted-foreground">active</span>
							</p>
						</div>
						<ArrowUpFromLine class="hidden md:block h-4 w-4 text-muted-foreground opacity-50" />
					</div>
				</template>
			</div>

			<!-- Markets table -->
			<div class="col-span-1 md:col-span-12 rounded-2xl border border-border bg-card p-4 md:p-6">
				<div class="mb-5 flex items-center justify-between">
					<h3 class="font-semibold">Available Options</h3>
					<span class="text-xs text-muted-foreground">Powered by Jupiter</span>
				</div>

				<div v-if="loadingPage" class="divide-y divide-border">
					<div v-for="i in 6" :key="i" class="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
						<div class="h-8 w-8 rounded-full skeleton shrink-0" />
						<div class="flex-1 min-w-0 space-y-2">
							<div class="h-4 w-24 rounded skeleton" />
							<div class="h-3 w-32 rounded skeleton" />
						</div>
						<div class="space-y-2 text-right shrink-0">
							<div class="h-4 w-14 rounded skeleton ml-auto" />
							<div class="h-3 w-8 rounded skeleton ml-auto" />
						</div>
						<div class="h-9 w-24 rounded-xl skeleton shrink-0" />
					</div>
				</div>

				<div v-else-if="fetchError" class="flex flex-col items-center justify-center py-12 text-center gap-3">
					<AlertCircle class="h-8 w-8 text-muted-foreground" />
					<div>
						<p class="font-medium">Failed to load markets</p>
						<p class="mt-1 text-sm text-muted-foreground">
							{{ (fetchError as any)?.statusCode === 429 ? 'Rate limited — wait a moment and try again.' : 'Something went wrong. Try again.' }}
						</p>
					</div>
					<button class="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-accent" @click="retryAll">
						<RefreshCw class="h-4 w-4" /> Retry
					</button>
				</div>

				<div v-else-if="!markets?.length" class="flex flex-col items-center justify-center py-12 text-center">
					<p class="font-medium">No markets available</p>
					<p class="mt-1 text-sm text-muted-foreground">Check back later.</p>
				</div>

				<div v-else class="divide-y divide-border">
					<div v-for="m in markets" :key="m.mint" class="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
						<!-- Icon -->
						<img v-if="m.logoURI" :src="m.logoURI" class="h-8 w-8 rounded-full shrink-0" />
						<div v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
							{{ (m.symbol || "?")[0] }}
						</div>

						<!-- Name -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-1.5 flex-wrap">
								<p class="text-sm font-semibold">{{ m.symbol }}</p>
								<span v-if="positionFor(m.mint)" class="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">Deposited</span>
							</div>
							<p class="truncate text-xs text-muted-foreground">Pool size {{ formatTvl(m.totalAssets, m.decimals, m.price) }}</p>
						</div>

						<!-- Rate -->
						<div class="text-right shrink-0">
							<p class="text-sm font-bold text-green-500">{{ formatApr(m.supplyApr) }}</p>
							<p class="text-[10px] text-muted-foreground uppercase tracking-wide">Yearly</p>
						</div>

						<!-- Deposit -->
						<button class="shrink-0 flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 active:scale-95" @click="openDeposit(m)"><ArrowDownToLine class="h-3 w-3" /> Deposit</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Modal -->
		<Dialog :open="modalOpen" @update:open="onOpenChange">
			<DialogContent class="max-w-sm p-0 overflow-hidden" :show-close-button="false">
				<template v-if="modal">
					<!-- Success state -->
					<div v-if="successSig" ref="successEl" class="p-8 text-center">
						<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
							<CheckCircle2 class="h-8 w-8 text-green-500" />
						</div>
						<p class="text-xl font-bold">{{ modal.mode === "deposit" ? "Deposited" : "Withdrawn" }}</p>
						<p class="mt-1 text-sm text-muted-foreground">{{ amountNum.toFixed(4) }} {{ modal.market.symbol }}</p>
						<a :href="`https://solscan.io/tx/${successSig}`" target="_blank" class="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"> View on explorer <ExternalLink class="h-3 w-3" /> </a>
						<button class="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90" @click="closeModal">Done</button>
					</div>

					<!-- Form state -->
					<template v-else>
						<DialogHeader class="flex-row items-center gap-3 border-b border-border px-5 py-4 space-y-0">
							<img v-if="modal.market.logoURI" :src="modal.market.logoURI" class="h-9 w-9 rounded-full shrink-0" />
							<div v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
								{{ (modal.market.symbol || "?")[0] }}
							</div>
							<div class="flex-1">
								<DialogTitle class="text-base font-bold leading-none"> {{ modal.mode === "deposit" ? "Deposit" : "Withdraw" }} {{ modal.market.symbol }} </DialogTitle>
								<p class="text-xs text-green-500 font-semibold mt-0.5">{{ formatApr(modal.market.supplyApr) }} yearly</p>
							</div>
							<button class="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition" :class="{ 'animate-spin': pending }" @click="refreshBalance">
								<RefreshCw class="h-4 w-4" />
							</button>
						</DialogHeader>

						<div class="space-y-4 p-5">
							<div v-if="positionForModal" class="flex items-center justify-between rounded-xl bg-secondary px-4 py-2.5 text-xs">
								<span class="text-muted-foreground">Currently deposited</span>
								<span class="font-semibold">{{ Number(positionForModal.balance).toFixed(4) }} {{ modal.market.symbol }}</span>
							</div>

							<div>
								<TokenPicker v-model="selectedToken" :label="modal.mode === 'deposit' ? 'Pay with' : 'Receive as'" :exclude="markets?.map(m => m.jlMint) ?? []" :token-logos="Object.fromEntries((markets ?? []).map(m => [m.mint, m.logoURI]).filter(([,v]) => v))" />
								<div v-if="needsSwapQuote" class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
									<ArrowRight class="h-3 w-3 shrink-0" />
									<span>{{ modal.mode === "deposit" ? `Auto-converted to ${modal.market.symbol}` : `Auto-converted to ${selectedToken.symbol}` }}</span>
								</div>
							</div>

							<div>
								<div class="mb-1.5 flex items-center justify-between">
									<label class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</label>
									<span v-if="inputTokenBalance && modal.mode === 'deposit'" class="text-xs text-muted-foreground">
										Balance:
										<button class="font-semibold text-foreground hover:text-primary transition" @click="amountRaw = inputTokenBalance.amount.toFixed(6)">{{ inputTokenBalance.amount.toFixed(4) }} {{ inputTokenBalance.symbol }}</button>
										<span class="text-muted-foreground/60"> · {{ formatDisplay(inputTokenBalance.usd) }}</span>
									</span>
									<span v-else-if="positionForModal && modal.mode === 'withdraw'" class="text-xs text-muted-foreground flex items-center gap-1.5">
										<span>{{ Number(positionForModal.balance).toFixed(4) }} {{ modal.market.symbol }}</span>
										<button
											class="font-semibold text-primary hover:opacity-80 transition"
											@click="
												amountRaw = parseFloat(positionForModal.balance.toFixed(positionForModal.decimals)).toString();
												isMaxWithdraw = true;
											"
										>
											Max
										</button>
									</span>
								</div>
								<div class="flex items-center gap-2 rounded-xl border border-input bg-background px-3.5 py-3 focus-within:ring-2 focus-within:ring-ring">
									<img v-if="modal.mode === 'deposit' && selectedToken.logoURI" :src="selectedToken.logoURI" class="h-5 w-5 rounded-full shrink-0" />
									<img v-else-if="modal.market.logoURI" :src="modal.market.logoURI" class="h-5 w-5 rounded-full shrink-0" />
									<span class="text-xs font-semibold text-muted-foreground shrink-0">{{ modalTokenSymbol }}</span>
									<input :value="amountRaw" inputmode="decimal" placeholder="0.00" class="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground" @input="onAmountInput" />
								</div>
							</div>

							<div v-if="needsSwapQuote" class="rounded-xl border border-border bg-secondary/40 px-3.5 py-3 text-xs">
								<div class="flex items-center justify-between gap-3">
									<span class="text-muted-foreground">You receive</span>
									<span v-if="quotePending" class="inline-flex items-center gap-1.5 font-semibold text-muted-foreground">
										<Loader2 class="h-3.5 w-3.5 animate-spin" />
										Quoting
									</span>
									<span v-else-if="swapQuote" class="font-bold text-foreground">~{{ quoteOutputAmount.toFixed(6) }} {{ quoteTokenSymbol }}</span>
									<span v-else class="font-semibold text-muted-foreground">--</span>
								</div>
								<div v-if="swapQuote" class="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
									<span>Minimum after slippage</span>
									<span>{{ quoteMinOutputAmount.toFixed(6) }} {{ quoteTokenSymbol }}</span>
								</div>
								<div v-if="swapQuote && quotePriceImpact > 0" class="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
									<span>Price impact</span>
									<span>{{ (quotePriceImpact * 100).toFixed(3) }}%</span>
								</div>
								<p v-if="quoteError" class="mt-1.5 text-[11px] text-destructive">{{ quoteError }}</p>
							</div>

							<div v-if="error" class="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive"><AlertCircle class="h-4 w-4 shrink-0 mt-0.5" /> {{ error }}</div>
							<div v-else-if="exceedsInputBalance || exceedsWithdrawBalance" class="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
								<AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
								{{ modal.mode === "deposit" ? "Amount exceeds your available balance" : "Amount exceeds your deposited balance" }}
							</div>

							<button class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-40" :disabled="!canSubmit" @click="onSubmit">
								<Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
								<template v-else>
									{{ modal.mode === "deposit" ? "Deposit" : "Withdraw" }}
									<span v-if="amountNum > 0" class="opacity-80">{{ amountNum.toFixed(4) }} {{ modalTokenSymbol }}</span>
								</template>
							</button>
						</div>
					</template>
				</template>
			</DialogContent>
		</Dialog>
	</div>
</template>
