<script lang="ts">
	import { Badge, Spinner } from '$lib/components/ui';
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

	function getAccountTypeBadgeColor(type: string | undefined): 'purple' | 'blue' | 'gray' {
		switch (type) {
			case 'VIP':
				return 'purple';
			case 'SUBSCRIBED':
				return 'blue';
			default:
				return 'gray';
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
		<Spinner size="lg" color="red" />
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
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Release</th>
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
						<td class="px-4 py-3 text-gray-400 text-sm font-mono truncate max-w-32"
							>{drop.user || '-'}</td
						>
						<td class="px-4 py-3 text-gray-400 text-sm">{drop.release || '-'}</td>
						<td class="px-4 py-3">
							<Badge color={getAccountTypeBadgeColor(drop.accountType)}>{drop.accountType}</Badge>
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
					<Spinner size="sm" color="white" />
					Loading...
				{:else}
					Load More
				{/if}
			</button>
		</div>
	{/if}
{/if}
