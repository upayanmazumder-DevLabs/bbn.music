<script lang="ts">
	import { onMount } from 'svelte';
	import { getDropsByAdmin } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import type { AdminDrop } from '$lib/api/types.gen';
	import AdminDropList from '$lib/components/admin/AdminDropList.svelte';

	let drops = $state<AdminDrop[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let hasMore = $state(true);

	const LIMIT = 30;

	onMount(async () => {
		await loadDrops();
	});

	async function loadDrops(offset = 0) {
		if (offset === 0) {
			loading = true;
			error = null;
		} else {
			loadingMore = true;
		}

		try {
			const response = await getDropsByAdmin({
				query: {
					type: 'TAKEDOWN_REQUESTED',
					_limit: LIMIT,
					_offset: offset,
				},
				headers: getAuthHeaders(),
			});

			if (response.data) {
				const newDrops = response.data as AdminDrop[];
				if (offset === 0) {
					drops = newDrops;
				} else {
					drops = [...drops, ...newDrops];
				}
				hasMore = newDrops.length === LIMIT;
			}
		} catch (e: any) {
			error = e?.error?.message || e?.message || 'Failed to load drops';
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	function loadMore() {
		loadDrops(drops.length);
	}
</script>

<div>
	<h1 class="text-2xl font-bold text-white mb-6">Takedown Requests</h1>
	<p class="text-gray-400 mb-6">Drops with pending takedown requests.</p>

	<AdminDropList {drops} {loading} {loadingMore} {error} {hasMore} onLoadMore={loadMore} />
</div>
