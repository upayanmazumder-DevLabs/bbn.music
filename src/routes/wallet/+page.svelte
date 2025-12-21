<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Card, Modal, Spinner } from '$lib/components/ui';
	import { EnvelopeSolid } from 'flowbite-svelte-icons';
	import type { Wallet } from '$lib/api/types.gen';
	import { getWallet } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import { auth } from '$lib/stores/auth';

	let wallet = $state<Wallet | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let showPayoutModal = $state(false);

	onMount(async () => {
		try {
			const response = await getWallet({
				headers: getAuthHeaders(),
			});

			if (response.data) {
				wallet = response.data as Wallet;
			}
		} catch (err: any) {
			error = err?.error?.message || err?.message || 'Failed to load wallet';
			console.error('Error loading wallet:', err);
		} finally {
			isLoading = false;
		}
	});

	function formatCurrency(amount: number): string {
		return `£ ${amount.toFixed(2)}`;
	}

	function formatDate(timestamp: string | number): string {
		// Handle both ISO strings and Unix timestamps (in seconds or milliseconds)
		let date: Date;
		if (typeof timestamp === 'number') {
			// If it's a small number, it's likely seconds; convert to milliseconds
			date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
		} else if (typeof timestamp === 'string') {
			// Try parsing as ISO string first
			date = new Date(timestamp);
			// If invalid, try parsing as a number
			if (isNaN(date.getTime())) {
				const num = Number(timestamp);
				date = new Date(num < 10000000000 ? num * 1000 : num);
			}
		} else {
			return 'N/A';
		}

		if (isNaN(date.getTime())) {
			return 'N/A';
		}

		return date.toLocaleDateString('en-GB', {
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

	function openPayoutModal() {
		showPayoutModal = true;
	}

	function getMailtoLink(): string {
		const email = 'support@bbn.music';
		const subject = 'Payout Request';
		const balance = wallet
			? formatCurrency((wallet.balance?.unrestrained ?? 0) + (wallet.balance?.restrained ?? 0))
			: '£ 0.00';
		const username = $auth.user?.profile?.username || 'Unknown';
		const accountId = $auth.user?.id || 'Unknown';
		const body = `Hi,

I would like to request a payout for my BBN Music wallet.

Username: ${username}
Account ID: ${accountId}
Current Balance: ${balance}
PayPal Email: [Please enter your PayPal email address]

Thank you!`;

		return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	}
</script>

<svelte:head>
	<title>Wallet - bbn.music</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Your Wallet</h1>
		<Button onclick={openPayoutModal}>Request Payout</Button>
	</div>

	{#if isLoading}
		<div class="flex justify-center items-center h-64">
			<Spinner size="xl" />
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
					<p class="text-4xl font-bold text-gray-900 dark:text-white">
						{formatCurrency(
							(wallet.balance?.unrestrained ?? 0) + (wallet.balance?.restrained ?? 0),
						)}
					</p>
					<p class="text-gray-500 dark:text-gray-400 font-medium">Balance</p>
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
					<p class="text-4xl font-bold text-gray-900 dark:text-white">
						{getAccountTypeLabel(wallet.accountType)}
					</p>
					<p class="text-gray-500 dark:text-gray-400 font-medium">Your Subscription</p>
				</div>
			</Card>

			<!-- Cut -->
			<Card variant="default" padding="lg">
				<div class="space-y-1">
					<p class="text-4xl font-bold text-gray-900 dark:text-white">{wallet.cut}%</p>
					<p class="text-gray-500 dark:text-gray-400 font-medium">Your Cut</p>
				</div>
			</Card>
		</div>

		<!-- Transactions -->
		<Card variant="default" padding="none">
			<div class="p-4 border-b border-gray-200 dark:border-gray-700">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Transaction History</h2>
			</div>

			{#if wallet.transactions.length === 0}
				<div class="p-8 text-center text-gray-500 dark:text-gray-400">No transactions yet</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b border-gray-200 dark:border-gray-700">
								<th class="text-left p-4 text-gray-500 dark:text-gray-400 font-medium">Amount</th>
								<th class="text-left p-4 text-gray-500 dark:text-gray-400 font-medium">Description</th>
								<th class="text-left p-4 text-gray-500 dark:text-gray-400 font-medium">Date</th>
								<th class="text-left p-4 text-gray-500 dark:text-gray-400 font-medium">Counterparty</th>
							</tr>
						</thead>
						<tbody>
							{#each wallet.transactions as tx}
								<tr class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
									<td class="p-4">
										<span class="{tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-medium">
											{tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
										</span>
									</td>
									<td class="p-4 text-gray-900 dark:text-white">{tx.description}</td>
									<td class="p-4 text-gray-500 dark:text-gray-400">{formatDate(tx.timestamp)}</td>
									<td class="p-4 text-gray-500 dark:text-gray-400">{tx.counterParty}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card>
	{/if}
</div>

<!-- Payout Request Modal -->
<Modal bind:open={showPayoutModal} title="Request Payout" size="md">
	<div class="space-y-6">
		<div class="text-center">
			<div class="w-16 h-16 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
				<EnvelopeSolid class="w-8 h-8 text-orange-400" />
			</div>
			<p class="text-gray-300 mb-4">
				To request a payout, please send an email to our support team with your PayPal address.
			</p>
		</div>

		{#if wallet}
			<div class="bg-gray-800/50 rounded-lg p-4 space-y-2">
				<div class="flex justify-between">
					<span class="text-gray-400">Available Balance</span>
					<span class="text-white font-semibold">
						{formatCurrency((wallet.balance?.unrestrained ?? 0) + (wallet.balance?.restrained ?? 0))}
					</span>
				</div>
				{#if wallet.balance?.restrained && wallet.balance.restrained > 0}
					<div class="flex justify-between text-sm">
						<span class="text-gray-500">Pending</span>
						<span class="text-gray-400">{formatCurrency(wallet.balance.restrained)}</span>
					</div>
				{/if}
			</div>
		{/if}

		<div class="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
			<h4 class="text-sm font-medium text-gray-300 mb-2">Please include in your email:</h4>
			<ul class="text-sm text-gray-400 space-y-1 list-disc list-inside">
				<li>Your PayPal email address</li>
				<li>The amount you wish to withdraw</li>
			</ul>
		</div>

		<p class="text-xs text-gray-500 text-center">
			Payouts are typically processed within 3-5 business days.
		</p>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showPayoutModal = false)}>Cancel</Button>
		<Button onclick={() => (window.location.href = getMailtoLink())}>
			<EnvelopeSolid class="w-4 h-4" />
			Send Email
		</Button>
	{/snippet}
</Modal>
