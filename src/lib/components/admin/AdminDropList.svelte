<script lang="ts">
	import type { AdminDrop } from '$lib/api/types.gen';
	import { goto } from '$app/navigation';

	interface Props {
		drops: AdminDrop[];
		loading: boolean;
		loadingMore?: boolean;
		error: string | null;
		hasMore: boolean;
		onLoadMore: () => void;
	}

	const { drops, loading, loadingMore = false, error, hasMore, onLoadMore }: Props = $props();

	function getStatusColor(type: string | undefined): string {
		switch (type) {
			case 'PUBLISHED':
				return 'bg-green-500/20 text-green-400';
			case 'PUBLISHING':
				return 'bg-blue-500/20 text-blue-400';
			case 'UNDER_REVIEW':
				return 'bg-yellow-500/20 text-yellow-400';
			case 'TAKEDOWN_REQUESTED':
				return 'bg-red-500/20 text-red-400';
			case 'REVIEW_DECLINED':
				return 'bg-red-500/20 text-red-400';
			default:
				return 'bg-gray-500/20 text-gray-400';
		}
	}

	function getAccountTypeColor(type: string | undefined): string {
		switch (type) {
			case 'VIP':
				return 'bg-purple-500/20 text-purple-400';
			case 'SUBSCRIBED':
				return 'bg-blue-500/20 text-blue-400';
			default:
				return 'bg-gray-500/20 text-gray-400';
		}
	}

	function openDrop(dropId: string | undefined) {
		if (dropId) {
			goto(`/admin/drops/${dropId}`);
		}
	}
</script>

{#if loading && drops.length === 0}
	<div class="flex items-center justify-center py-12">
		<div
			class="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"
		></div>
	</div>
{:else if error}
	<div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
		{error}
	</div>
{:else if drops.length === 0}
	<div class="text-center py-12 text-gray-500">No drops found</div>
{:else}
	<div class="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
		<table class="w-full">
			<thead class="bg-gray-900/50 border-b border-gray-700">
				<tr>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Title</th>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">GTIN</th>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Account</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-700">
				{#each drops as drop}
					<tr
						onclick={() => openDrop(drop._id)}
						class="hover:bg-gray-700/50 cursor-pointer transition-colors"
					>
						<td class="px-4 py-3">
							<p class="text-white font-medium">{drop.title || 'Untitled'}</p>
						</td>
						<td class="px-4 py-3 text-gray-400 text-sm font-mono">{drop.gtin || '-'}</td>
						<td class="px-4 py-3">
							<span class="px-2 py-1 rounded text-xs font-medium {getStatusColor(drop.type)}"
								>{drop.type}</span
							>
						</td>
						<td class="px-4 py-3">
							<span
								class="px-2 py-1 rounded text-xs font-medium {getAccountTypeColor(
									drop.accountType,
								)}">{drop.accountType}</span
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if hasMore}
		<div class="mt-4 text-center">
			<button
				onclick={onLoadMore}
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
