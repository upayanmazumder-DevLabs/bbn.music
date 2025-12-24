<script lang="ts">
	import { onMount } from 'svelte';
	import { Spinner } from '$lib/components/ui';
	import { getIdByWalletsByAdmin } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import type { AdminWallet } from '$lib/api/types.gen';
	import { formatCurrency } from '$lib/utils/formatCurrency';
	import { extractErrorMessage } from '$lib/utils/extractError';

	let loading = $state(true);
	let error = $state<string | null>(null);
	let bbnRevenue = $state(0);

	// BBN company account ID (from old webgen code)
	const BBN_USER_ID = '62ea6fa5321b3702e93ca21c';

	onMount(async () => {
		await loadOverviewData();
	});

	async function loadOverviewData() {
		loading = true;
		error = null;

		try {
			const response = await getIdByWalletsByAdmin({
				path: { id: BBN_USER_ID },
				headers: getAuthHeaders(),
			});

			if (response.data) {
				const bbnWallet = response.data as AdminWallet;
				// Calculate BBN Revenue - sum of all balance values from BBN company wallet
				if (bbnWallet.balance) {
					bbnRevenue = (bbnWallet.balance.ampsuite || 0) + (bbnWallet.balance.symphonic || 0);
				}
			}
		} catch (e: unknown) {
			error = extractErrorMessage(e, 'Failed to load overview data');
		} finally {
			loading = false;
		}
	}
</script>

<div>
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Overview</h1>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<Spinner size="lg" color="red" />
		</div>
	{:else if error}
		<div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
			{error}
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- BBN Revenue Card -->
			<div
				class="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
			>
				<h3
					class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"
				>
					BBN Revenue
				</h3>
				<p class="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(bbnRevenue)}</p>
				<p class="text-sm text-gray-500 mt-2">Total balance from BBN company wallet</p>
			</div>
		</div>
	{/if}
</div>
