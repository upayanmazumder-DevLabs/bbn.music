<script lang="ts">
import { onMount } from 'svelte';
import { getDropsByAdmin } from '$lib/api/sdk.gen';
import { getAuthHeaders } from '$lib/stores/auth';
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
			query: { type: 'UNDER_REVIEW', _limit: LIMIT, _offset: offset },
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
	} catch (e) {
		error = e instanceof Error ? e.message : 'Failed to load drops';
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
	<h1 class="text-2xl font-bold text-white mb-6">Under Review</h1>
	<p class="text-gray-400 mb-6">Drops pending review before publication.</p>

	<AdminDropList {drops} {loading} {loadingMore} {error} {hasMore} onLoadMore={loadMore} />
</div>
