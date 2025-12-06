<script lang="ts">
	import { onMount } from 'svelte';
	import { getWalletsByAdmin } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/stores/auth';
	import type { AdminWallet } from '$lib/api/types.gen';

	let wallets = $state<AdminWallet[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let hasMore = $state(true);
	const LIMIT = 30;

	onMount(async () => {
		await loadWallets();
	});

	async function loadWallets(offset = 0) {
		if (offset === 0) {
			loading = true;
			error = null;
		} else {
			loadingMore = true;
		}
		try {
			const response = await getWalletsByAdmin({
				query: { _limit: LIMIT, _offset: offset },
				headers: getAuthHeaders(),
			});
			if (response.data) {
				const newWallets = response.data as AdminWallet[];
				wallets = offset === 0 ? newWallets : [...wallets, ...newWallets];
				hasMore = newWallets.length === LIMIT;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load wallets';
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: 'EUR',
		}).format(amount / 100);
	}

	function getAccountTypeColor(type: string): string {
		switch (type) {
			case 'VIP':
				return 'bg-purple-500/20 text-purple-400';
			case 'SUBSCRIBED':
				return 'bg-blue-500/20 text-blue-400';
			default:
				return 'bg-gray-500/20 text-gray-400';
		}
	}
</script>

<div>
	<h1 class="text-2xl font-bold text-white mb-6">Wallets</h1>

	{#if loading && wallets.length === 0}
		<div class="flex items-center justify-center py-12">
			<div
				class="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"
			></div>
		</div>
	{:else if error}
		<div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">{error}</div>
	{:else if wallets.length === 0}
		<div class="text-center py-12 text-gray-500">No wallets found</div>
	{:else}
		<div class="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
			<table class="w-full">
				<thead class="bg-gray-900/50 border-b border-gray-700">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
						<th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase"
							>Unrestrained</th
						>
						<th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase"
							>Restrained</th
						>
						<th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Cut</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-700">
					{#each wallets as wallet}
						<tr class="hover:bg-gray-700/50">
							<td class="px-4 py-3">
								<p class="text-white">{wallet.userName || 'Unknown'}</p>
								<p class="text-gray-500 text-xs">{wallet.email}</p>
							</td>
							<td class="px-4 py-3">
								<span
									class="px-2 py-1 rounded text-xs font-medium {getAccountTypeColor(
										wallet.accountType,
									)}">{wallet.accountType}</span
								>
							</td>
							<td class="px-4 py-3 text-right text-green-400"
								>{formatCurrency(wallet.balance?.unrestrained || 0)}</td
							>
							<td class="px-4 py-3 text-right text-yellow-400"
								>{formatCurrency(wallet.balance?.restrained || 0)}</td
							>
							<td class="px-4 py-3 text-right text-gray-400">{wallet.cut}%</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if hasMore}
			<div class="mt-4 text-center">
				<button
					onclick={() => loadWallets(wallets.length)}
					disabled={loadingMore}
					class="px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg inline-flex items-center gap-2"
				>
					{#if loadingMore}
						<div
							class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
						></div>
						Loading...
					{:else}
						Load More
					{/if}
				</button>
			</div>
		{/if}
	{/if}
</div>
