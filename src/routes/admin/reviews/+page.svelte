<script lang="ts">
	import { onMount } from 'svelte';
	import { getDropsByAdmin } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import { extractErrorMessage } from '$lib/utils/extractError';
	import type { AdminDrop } from '$lib/api/types.gen';
	import AdminDropList from '$lib/components/admin/AdminDropList.svelte';

	// New submissions
	let drops = $state<AdminDrop[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let hasMore = $state(true);

	// Edit reviews
	let editDrops = $state<AdminDrop[]>([]);
	let editLoading = $state(true);
	let editLoadingMore = $state(false);
	let editError = $state<string | null>(null);
	let editHasMore = $state(true);

	const LIMIT = 30;

	onMount(async () => {
		await Promise.all([loadDrops(), loadEditDrops()]);
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
		} catch (e: any) {
			error = extractErrorMessage(e, 'Failed to load drops');
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	async function loadEditDrops(offset = 0) {
		if (offset === 0) {
			editLoading = true;
			editError = null;
		} else {
			editLoadingMore = true;
		}

		try {
			const response = await getDropsByAdmin({
				query: { type: 'EDIT_UNDER_REVIEW', _limit: LIMIT, _offset: offset },
				headers: getAuthHeaders(),
			});

			if (response.data) {
				const newDrops = response.data as AdminDrop[];
				if (offset === 0) {
					editDrops = newDrops;
				} else {
					editDrops = [...editDrops, ...newDrops];
				}
				editHasMore = newDrops.length === LIMIT;
			}
		} catch (e: any) {
			editError = extractErrorMessage(e, 'Failed to load edit reviews');
		} finally {
			editLoading = false;
			editLoadingMore = false;
		}
	}

	function loadMore() {
		loadDrops(drops.length);
	}

	function loadMoreEdits() {
		loadEditDrops(editDrops.length);
	}
</script>

<div class="space-y-12">
	<div>
		<h1 class="text-2xl font-bold text-white mb-2">New Submissions</h1>
		<p class="text-gray-400 mb-6">Drops pending review before publication.</p>
		<AdminDropList {drops} {loading} {loadingMore} {error} {hasMore} onLoadMore={loadMore} />
	</div>

	<div>
		<h2 class="text-2xl font-bold text-white mb-2">Edit Reviews</h2>
		<p class="text-gray-400 mb-6">Published drops with pending metadata changes.</p>
		<AdminDropList
			drops={editDrops}
			loading={editLoading}
			loadingMore={editLoadingMore}
			error={editError}
			hasMore={editHasMore}
			onLoadMore={loadMoreEdits}
		/>
	</div>
</div>
