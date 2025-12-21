<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button } from '$lib/components/ui';
	import { ChartPieSolid, CashSolid, PlaySolid } from 'flowbite-svelte-icons';
	import type { PayoutResponse } from '$lib/api/types.gen';
	import { getPayoutsByPayment } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';

	let payouts = $state<PayoutResponse[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Time frame options
	type TimeFrame = { label: string; months: number };
	const allTimeFrames: TimeFrame[] = [
		{ label: '1M', months: 1 },
		{ label: '3M', months: 3 },
		{ label: '6M', months: 6 },
		{ label: '1Y', months: 12 },
		{ label: '2Y', months: 24 },
		{ label: 'All', months: Infinity },
	];

	let selectedMonths = $state(6); // Default to 6M

	onMount(async () => {
		try {
			const response = await getPayoutsByPayment({
				headers: getAuthHeaders(),
			});

			if (response.data) {
				payouts = response.data as PayoutResponse[];
			}
		} catch (err: any) {
			error = err?.error?.message || err?.message || 'Failed to load earnings';
			console.error('Error loading earnings:', err);
		} finally {
			isLoading = false;
		}
	});

	// Available time frames based on data (only show if we have enough data)
	const availableTimeFrames = $derived(
		allTimeFrames.filter((tf) => payouts.length >= tf.months || tf.months === Infinity),
	);

	// Parse money string to number
	function parseMoney(str: string): number {
		return parseFloat(str.replace(/[^0-9.-]/g, '')) || 0;
	}

	// Format number as currency
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'GBP',
			minimumFractionDigits: 2,
		}).format(value);
	}

	// Format large numbers
	function formatNumber(value: number): string {
		if (value >= 1000000) {
			return (value / 1000000).toFixed(1) + 'M';
		} else if (value >= 1000) {
			return (value / 1000).toFixed(1) + 'K';
		}
		return value.toLocaleString();
	}

	// Month names for formatting
	const monthNames = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	];

	// Format period label (e.g., "2024-01" -> "January '24")
	function formatPeriodLabel(period: string): string {
		const match = period.match(/(\d{4})-(\d{2})/);
		if (!match) return period;
		const year = match[1].slice(2); // "24" from "2024"
		const monthIndex = parseInt(match[2], 10) - 1;
		return `${monthNames[monthIndex]} '${year}`;
	}

	// Filtered payouts based on selected time frame
	const filteredPayouts = $derived(
		selectedMonths === Infinity ? payouts : payouts.slice(0, selectedMonths),
	);

	// Summary stats (based on selected time frame)
	const totalEarnings = $derived(
		filteredPayouts.reduce((sum, p) => sum + parseMoney(p.moneythisperiod), 0),
	);

	const totalStreams = $derived(filteredPayouts.reduce((sum, p) => sum + p.streams, 0));

	const avgPerStream = $derived(totalStreams > 0 ? totalEarnings / totalStreams : 0);

	// Chart data based on selected time frame
	const chartData = $derived(
		filteredPayouts
			.map((p) => ({
				label: p.period.match(/(\d{4}-\d{2})/)?.[1] || p.period,
				revenue: parseMoney(p.moneythisperiod),
				streams: p.streams,
			}))
			.reverse(),
	);

	const maxRevenue = $derived(Math.max(...chartData.map((d) => d.revenue), 0.01));
	const maxStreams = $derived(Math.max(...chartData.map((d) => d.streams), 1));
</script>

<svelte:head>
	<title>Earnings - bbn.music</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Earnings</h1>
			<p class="text-gray-500 dark:text-gray-400 mt-1">Track your streaming revenue and performance</p>
		</div>
		{#if payouts.length > 0}
			<div class="flex items-center gap-1 p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
				{#each availableTimeFrames as tf}
					<button
						onclick={() => (selectedMonths = tf.months)}
						class="px-3 py-1.5 text-sm font-medium rounded-md transition-all {selectedMonths ===
						tf.months
							? 'bg-orange-500 text-white'
							: 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}"
					>
						{tf.label}
					</button>
				{/each}
			</div>
		{/if}
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
	{:else if payouts.length === 0}
		<Card variant="default" padding="lg">
			<div class="text-center py-16">
				<div
					class="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center mx-auto mb-6"
				>
					<CashSolid class="w-10 h-10 text-orange-500" />
				</div>
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Earnings Yet</h3>
				<p class="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
					Once your music starts generating streams, your earnings will appear here.
				</p>
			</div>
		</Card>
	{:else}
		<!-- Summary Stats -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<Card variant="default" padding="md">
				<div class="flex items-center gap-4">
					<div
						class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center"
					>
						<CashSolid class="w-6 h-6 text-green-400" />
					</div>
					<div>
						<p class="text-sm text-gray-400">Total Earnings</p>
						<p class="text-2xl font-bold text-green-400">{formatCurrency(totalEarnings)}</p>
					</div>
				</div>
			</Card>

			<Card variant="default" padding="md">
				<div class="flex items-center gap-4">
					<div
						class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center"
					>
						<PlaySolid class="w-6 h-6 text-blue-400" />
					</div>
					<div>
						<p class="text-sm text-gray-400">Total Streams</p>
						<p class="text-2xl font-bold text-blue-400">{formatNumber(totalStreams)}</p>
					</div>
				</div>
			</Card>

			<Card variant="default" padding="md">
				<div class="flex items-center gap-4">
					<div
						class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center"
					>
						<ChartPieSolid class="w-6 h-6 text-purple-400" />
					</div>
					<div>
						<p class="text-sm text-gray-400">Avg. Per Stream</p>
						<p class="text-2xl font-bold text-purple-400">
							{formatCurrency(avgPerStream * 1000)}/1K
						</p>
					</div>
				</div>
			</Card>
		</div>

		<!-- Charts -->
		{#if chartData.length > 0}
			<div>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Performance</h2>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
					<!-- Revenue Chart -->
					<Card variant="default" padding="lg" class="overflow-hidden">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue Trend</h3>
						<div
							class="grid items-end gap-1"
							style="height: 200px; grid-template-columns: repeat({chartData.length}, minmax(0, 1fr));"
						>
							{#each chartData as data}
								{@const heightPx = Math.max((data.revenue / maxRevenue) * 160, 4)}
								<div class="flex flex-col items-center justify-end h-full group min-w-0">
									<span
										class="text-xs font-medium text-gray-400 mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
									>
										{formatCurrency(data.revenue)}
									</span>
									<div
										class="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t transition-all duration-300 hover:from-green-500 hover:to-green-300 cursor-pointer shadow-lg shadow-green-500/20"
										style="height: {heightPx}px;"
									></div>
									<span class="text-xs text-gray-500 font-medium mt-2 truncate w-full text-center"
										>{formatPeriodLabel(data.label)}</span
									>
								</div>
							{/each}
						</div>
					</Card>

					<!-- Streams Chart -->
					<Card variant="default" padding="lg" class="overflow-hidden">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Streams Trend</h3>
						<div
							class="grid items-end gap-1"
							style="height: 200px; grid-template-columns: repeat({chartData.length}, minmax(0, 1fr));"
						>
							{#each chartData as data}
								{@const heightPx = Math.max((data.streams / maxStreams) * 160, 4)}
								<div class="flex flex-col items-center justify-end h-full group min-w-0">
									<span
										class="text-xs font-medium text-gray-400 mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
									>
										{data.streams.toLocaleString()}
									</span>
									<div
										class="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-300 hover:from-blue-500 hover:to-blue-300 cursor-pointer shadow-lg shadow-blue-500/20"
										style="height: {heightPx}px;"
									></div>
									<span class="text-xs text-gray-500 font-medium mt-2 truncate w-full text-center"
										>{formatPeriodLabel(data.label)}</span
									>
								</div>
							{/each}
						</div>
					</Card>
				</div>
			</div>
		{/if}

		<!-- Earnings History -->
		<div>
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Earnings History</h2>
			<div class="space-y-3">
				{#each payouts as payout}
					{@const periodMatch = payout.period.match(/(\d{4})-(\d{2})/)}
					{@const monthIndex = periodMatch ? parseInt(periodMatch[2], 10) - 1 : 0}
					{@const year = periodMatch ? periodMatch[1] : ''}
					<Card variant="default" padding="md" class="hover:border-gray-600 transition-colors">
						<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div class="flex items-center gap-4">
								<div
									class="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 font-mono text-sm"
								>
									{periodMatch ? periodMatch[2] : '??'}
								</div>
								<div>
									<h3 class="font-semibold text-gray-900 dark:text-white">{monthNames[monthIndex]} {year}</h3>
								</div>
							</div>
							<div class="flex items-center gap-8">
								<div class="text-right">
									<p class="text-xl font-bold text-green-400">{payout.moneythisperiod}</p>
									<p class="text-xs text-gray-500">Earned</p>
								</div>
								<div class="text-right">
									<p class="text-xl font-bold text-blue-400">{payout.streams.toLocaleString()}</p>
									<p class="text-xs text-gray-500">Streams</p>
								</div>
							</div>
						</div>
					</Card>
				{/each}
			</div>
		</div>
	{/if}
</div>
