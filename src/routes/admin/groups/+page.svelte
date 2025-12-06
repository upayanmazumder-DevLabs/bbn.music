<script lang="ts">
	import { onMount } from 'svelte';
	import { getGroupsByAdmin } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/stores/auth';
	import type { Group } from '$lib/api/types.gen';

	let groups = $state<Group[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		await loadGroups();
	});

	async function loadGroups() {
		loading = true;
		error = null;
		try {
			const response = await getGroupsByAdmin({ headers: getAuthHeaders() });
			if (response.data) {
				groups = response.data as Group[];
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load groups';
		} finally {
			loading = false;
		}
	}
</script>

<div>
	<h1 class="text-2xl font-bold text-white mb-6">Groups</h1>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div
				class="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"
			></div>
		</div>
	{:else if error}
		<div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">{error}</div>
	{:else if groups.length === 0}
		<div class="text-center py-12 text-gray-500">No groups found</div>
	{:else}
		<div class="grid gap-4">
			{#each groups as group}
				<div class="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
					<h3 class="text-lg font-semibold text-white">{group.displayName}</h3>
					<p class="text-gray-500 text-xs mt-1">ID: {group._id}</p>
					{#if group.permission?.length > 0}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each group.permission as perm}
								<span class="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded font-mono"
									>{perm}</span
								>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
