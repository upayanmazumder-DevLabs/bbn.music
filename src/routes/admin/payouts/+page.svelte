<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Spinner } from '$lib/components/ui';
	import { getPayoutsByAdmin, postSyncMappingByAdmin } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import type { PayoutList } from '$lib/api/types.gen';

	let payouts = $state<PayoutList[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let syncing = $state(false);

	onMount(async () => {
		await loadPayouts();
	});

	async function loadPayouts() {
		loading = true;
		error = null;
		try {
			const response = await getPayoutsByAdmin({ headers: getAuthHeaders() });
			if (response.data) {
				payouts = response.data as PayoutList[];
			}
		} catch (e: any) {
			error = e?.error?.message || e?.message || 'Failed to load payouts';
		} finally {
			loading = false;
		}
	}

	async function syncMapping() {
		syncing = true;
		try {
			await postSyncMappingByAdmin({ headers: getAuthHeaders() });
			await loadPayouts();
		} catch (e) {
			console.error('Sync failed:', e);
		} finally {
			syncing = false;
		}
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: 'EUR',
		}).format(amount);
	}
</script>

<div>
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-white">Payouts</h1>
		<div class="flex gap-3">
			<Button onclick={syncMapping} disabled={syncing} variant="secondary" loading={syncing}>
				{syncing ? 'Syncing...' : 'Sync Mapping'}
			</Button>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<Spinner size="lg" color="red" />
		</div>
	{:else if error}
		<div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">{error}</div>
	{:else if payouts.length === 0}
		<div class="text-center py-12 text-gray-500">No payouts found</div>
	{:else}
		<div class="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
			<table class="w-full">
				<thead class="bg-gray-900/50 border-b border-gray-700">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Period</th>
						<th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Total</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-700">
					{#each payouts as payout}
						<tr class="hover:bg-gray-700/50">
							<td class="px-4 py-3 text-white">{payout.period}</td>
							<td class="px-4 py-3 text-right text-green-400 font-medium"
								>{formatCurrency(payout.sum)}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
