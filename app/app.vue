<script setup lang="ts">
import "vue-sonner/style.css";

const route = useRoute();
const isApp = computed(() => route.path.startsWith("/app"));
const showNav = computed(() => isApp.value && !route.path.startsWith("/app/pay/"));

const { init, isDark } = useTheme();
const { fetchRates } = useDisplayCurrency();
onMounted(() => {
	init();
	fetchRates();
});

watch(
	isDark,
	(dark) => {
		document.documentElement.classList.toggle("dark", dark);
	},
	{ immediate: false },
);

const showSendGlobal = useState<boolean>("global-show-send", () => false);
const showSwapGlobal = useState<boolean>("global-show-swap", () => false);
const showRequestGlobal = useState<boolean>("global-show-request", () => false);
const showSplitGlobal = useState<boolean>("global-show-split", () => false);
const showGiftGlobal = useState<boolean>("global-show-gift", () => false);
const showPayrollGlobal = useState<boolean>("global-show-payroll", () => false);
</script>

<template>
	<PwaUpdater />
	<PageProgress />
	<div v-if="isApp" class="flex min-h-screen bg-background">
		<SideNav v-if="showNav" />
		<main class="flex-1 min-w-0 pb-20 md:pb-0">
			<NuxtPage :transition="{ name: 'page' }" />
		</main>
		<SendModal v-model:open="showSendGlobal" />
		<SwapModal v-model:open="showSwapGlobal" />
		<RequestModal v-model:open="showRequestGlobal" />
		<SplitModal v-model:open="showSplitGlobal" />
		<GiftModal v-model:open="showGiftGlobal" />
		<PayrollModal v-model:open="showPayrollGlobal" />
		<ConfirmModal />
		<Toaster position="top-right" rich-colors theme="dark" />
	</div>
	<div v-else class="min-h-screen bg-background text-foreground">
		<NuxtPage />
	</div>
</template>

<style>
/* Page transitions — snappy enter, quick leave */
.page-enter-active {
	transition:
		opacity 0.25s cubic-bezier(0.19, 1, 0.22, 1),
		transform 0.25s cubic-bezier(0.19, 1, 0.22, 1);
}
.page-leave-active {
	transition:
		opacity 0.15s ease,
		transform 0.15s ease;
}
.page-enter-from {
	opacity: 0;
	transform: translateY(10px) scale(0.99);
}
.page-leave-to {
	opacity: 0;
	transform: translateY(-4px) scale(0.99);
}

/* Sheet transitions — spring slide up */
.sheet-enter-active {
	transition: opacity 0.25s ease;
}
.sheet-leave-active {
	transition: opacity 0.2s ease;
}
.sheet-enter-active > div {
	transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sheet-leave-active > div {
	transition: transform 0.22s cubic-bezier(0.36, 0, 0.66, -0.2);
}
.sheet-enter-from {
	opacity: 0;
}
.sheet-leave-to {
	opacity: 0;
}
.sheet-enter-from > div {
	transform: translateY(100%);
}
.sheet-leave-to > div {
	transform: translateY(100%);
}

/* Fade-scale — for cards and modals appearing */
.pop-enter-active {
	transition:
		opacity 0.2s ease,
		transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pop-leave-active {
	transition:
		opacity 0.15s ease,
		transform 0.15s ease;
}
.pop-enter-from {
	opacity: 0;
	transform: scale(0.95);
}
.pop-leave-to {
	opacity: 0;
	transform: scale(0.97);
}

/* Stagger list — for v-for lists */
.list-enter-active {
	transition:
		opacity 0.3s cubic-bezier(0.19, 1, 0.22, 1),
		transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
}
.list-leave-active {
	transition: opacity 0.15s ease;
	position: absolute;
}
.list-enter-from {
	opacity: 0;
	transform: translateY(8px);
}
.list-leave-to {
	opacity: 0;
}
</style>
