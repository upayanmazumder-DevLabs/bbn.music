<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Card } from '$lib/components/ui';
	import type { Wallet } from '$lib/api/types.gen';
	import { getWallet } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/api';
	import { toast } from '$lib/stores/toast';

	let wallet = $state<Wallet | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const response = await getWallet({
				headers: getAuthHeaders(),
			});

			if (response.data) {
				wallet = response.data as Wallet;
			}
		} catch (err) {
			error = 'Failed to load wallet. Please try again later.';
			console.error('Error loading wallet:', err);
		} finally {
			isLoading = false;
		}
	});

	function formatCurrency(amount: number): string {
		return `£ ${amount.toFixed(2)}`;
	}

	function formatDate(timestamp: string): string {
		return new Date(timestamp).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	}

	function getAccountTypeLabel(type: string): string {
		switch (type) {
			case 'DEFAULT':
				return 'Basic';
			case 'SUBSCRIBED':
				return 'Premium';
			case 'VIP':
				return 'VIP';
			default:
				return type;
		}
	}

	function requestPayout() {
		toast.show('Please email support@bbn.music and include your PayPal Address', 'info', 6000);
	}
</script>

<svelte:head>
	<title>Wallet - bbn.music</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<h1 class="text-3xl font-bold text-white">Your Wallet</h1>
		<Button onclick={requestPayout}>Request Payout</Button>
	</div>

	{#if isLoading}
		<div class="flex justify-center items-center h-64">
			<div
				class="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"
			></div>
		</div>
	{:else if error}
		<Card variant="default" padding="lg">
			<div class="text-center py-8">
				<p class="text-red-400 mb-4">{error}</p>
				<Button onclick={() => location.reload()}>Try Again</Button>
			</div>
		</Card>
	{:else if wallet}
		<!-- Stats Grid -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Balance -->
			<Card variant="default" padding="lg">
				<div class="space-y-1">
					<p class="text-4xl font-bold text-white">
						{formatCurrency(
							(wallet.balance?.unrestrained ?? 0) + (wallet.balance?.restrained ?? 0),
						)}
					</p>
					<p class="text-gray-400 font-medium">Balance</p>
					{#if wallet.balance?.restrained && wallet.balance.restrained > 0}
						<p class="text-sm text-gray-500">
							({formatCurrency(wallet.balance.restrained)} pending)
						</p>
					{/if}
				</div>
			</Card>

			<!-- Subscription -->
			<Card variant="default" padding="lg">
				<div class="space-y-1">
					<p class="text-4xl font-bold text-white">
						{getAccountTypeLabel(wallet.accountType)}
					</p>
					<p class="text-gray-400 font-medium">Your Subscription</p>
				</div>
			</Card>

			<!-- Cut -->
			<Card variant="default" padding="lg">
				<div class="space-y-1">
					<p class="text-4xl font-bold text-white">{wallet.cut}%</p>
					<p class="text-gray-400 font-medium">Your Cut</p>
				</div>
			</Card>
		</div>

		<!-- Transactions -->
		<Card variant="default" padding="none">
			<div class="p-4 border-b border-gray-700">
				<h2 class="text-lg font-semibold text-white">Transaction History</h2>
			</div>

			{#if wallet.transactions.length === 0}
				<div class="p-8 text-center text-gray-400">No transactions yet</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b border-gray-700">
								<th class="text-left p-4 text-gray-400 font-medium">Amount</th>
								<th class="text-left p-4 text-gray-400 font-medium">Description</th>
								<th class="text-left p-4 text-gray-400 font-medium">Date</th>
								<th class="text-left p-4 text-gray-400 font-medium">Counterparty</th>
							</tr>
						</thead>
						<tbody>
							{#each wallet.transactions as tx}
								<tr class="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
									<td class="p-4">
										<span class="{tx.amount >= 0 ? 'text-green-400' : 'text-red-400'} font-medium">
											{tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
										</span>
									</td>
									<td class="p-4 text-white">{tx.description}</td>
									<td class="p-4 text-gray-400">{formatDate(tx.timestamp)}</td>
									<td class="p-4 text-gray-400">{tx.counterParty}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card>
	{/if}
</div>
