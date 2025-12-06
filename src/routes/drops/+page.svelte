<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button, Card, Badge } from '$lib/components/ui';
	import { PlusOutline } from 'flowbite-svelte-icons';
	import type { Drop, Artist, ArtistRef } from '$lib/api/types.gen';
	import { auth } from '$lib/stores/auth';
	import { getDropsByMusic, getArtworkByDropByMusic, postMusic, getArtistsByMusic } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/api';

	// Tab configuration matching the old app
	const tabs = [
		{
			id: 'published',
			label: 'Published',
			filter: ['PUBLISHED', 'TAKEDOWN_REQUESTED'],
		},
		{
			id: 'unpublished',
			label: 'Unpublished',
			filter: ['UNDER_REVIEW', 'PRIVATE', 'REVIEW_DECLINED', 'PUBLISHING'],
		},
		{ id: 'drafts', label: 'Drafts', filter: ['UNSUBMITTED'] },
	];

	// Get active tab from URL
	const activeTab = $derived($page.url.searchParams.get('list') || 'published');

	let allDrops = $state<Drop[]>([]);
	let allArtists = $state<Artist[]>([]);
	let artworkUrls = $state<Record<string, string>>({});
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Filter drops based on active tab
	const filteredDrops = $derived.by(() => {
		const tab = tabs.find((t) => t.id === activeTab);
		if (!tab) return [];
		const filtered = allDrops.filter((drop) => tab.filter.includes(drop.type || ''));

		// For unpublished tab, sort to show UNDER_REVIEW at the top
		if (activeTab === 'unpublished') {
			return filtered.sort((a, b) => {
				if (a.type === 'UNDER_REVIEW' && b.type !== 'UNDER_REVIEW') return -1;
				if (a.type !== 'UNDER_REVIEW' && b.type === 'UNDER_REVIEW') return 1;
				return 0;
			});
		}

		// For published tab, sort to show TAKEDOWN_REQUESTED at the top
		if (activeTab === 'published') {
			return filtered.sort((a, b) => {
				if (a.type === 'TAKEDOWN_REQUESTED' && b.type !== 'TAKEDOWN_REQUESTED') return -1;
				if (a.type !== 'TAKEDOWN_REQUESTED' && b.type === 'TAKEDOWN_REQUESTED') return 1;
				return 0;
			});
		}

		return filtered;
	});

	// Fetch artwork blob and create object URL
	async function loadArtwork(dropId: string) {
		if (artworkUrls[dropId]) return; // Already loaded
		try {
			const response = await getArtworkByDropByMusic({
				path: { dropId },
				headers: getAuthHeaders(),
			});
			if (response.data) {
				const blob = response.data as Blob;
				artworkUrls[dropId] = URL.createObjectURL(blob);
			}
		} catch {
			// Artwork failed to load, ignore
		}
	}

	onMount(async () => {
		try {
			// Load artists first for name resolution
			const artistsResponse = await getArtistsByMusic({
				headers: getAuthHeaders(),
			});
			if (artistsResponse.data) {
				allArtists = artistsResponse.data as Artist[];
			}

			// Load all user's drops from real API
			const response = await getDropsByMusic({
				headers: getAuthHeaders(),
			});

			if (response.data) {
				allDrops = response.data as Drop[];
				// Load artwork for drops that have it
				for (const drop of allDrops) {
					if (drop.artwork && drop._id) {
						loadArtwork(drop._id);
					}
				}
			}
		} catch (err) {
			error = 'Failed to load drops. Please try again later.';
			console.error('Error loading drops:', err);
		} finally {
			isLoading = false;
		}
	});

	function setTab(tabId: string) {
		const url = new URL($page.url);
		url.searchParams.set('list', tabId);
		goto(url.toString(), { replaceState: true });
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	}

	function getArtistNames(artists: Drop['artists'] | undefined) {
		if (!artists || artists.length === 0) return 'Unknown Artist';

		const primaryArtists = artists.filter((artist) => artist.type === 'PRIMARY');
		if (primaryArtists.length === 0) return 'Unknown Artist';

		return (
			primaryArtists
				.map((artist) => {
					// If artist has name directly (PRODUCER/SONGWRITER types)
					if ('name' in artist) return artist.name;
					// If artist has _id, look it up in allArtists
					if ('_id' in artist) {
						const found = allArtists.find((a) => a._id === artist._id);
						if (found) return found.name;
					}
					return 'Unknown';
				})
				.join(', ') || 'Unknown Artist'
		);
	}

	function getStatusBadge(type: string | undefined): {
		color: 'orange' | 'blue' | 'green' | 'red' | 'purple' | 'gray';
		label: string;
	} {
		switch (type) {
			case 'PUBLISHED':
				return { color: 'green', label: 'Published' };
			case 'PUBLISHING':
				return { color: 'blue', label: 'Publishing' };
			case 'UNDER_REVIEW':
				return { color: 'orange', label: 'Under Review' };
			case 'PRIVATE':
				return { color: 'gray', label: 'Private' };
			case 'REVIEW_DECLINED':
				return { color: 'red', label: 'Declined' };
			case 'TAKEDOWN_REQUESTED':
				return { color: 'red', label: 'Takedown Requested' };
			case 'UNSUBMITTED':
				return { color: 'gray', label: 'Draft' };
			default:
				return { color: 'gray', label: 'Unknown' };
		}
	}

	let isCreating = $state(false);

	async function createNewDrop() {
		if (isCreating) return;
		isCreating = true;

		try {
			const response = await postMusic({
				headers: getAuthHeaders(),
			});

			// API returns { id: string } with the new drop ID
			const { id } = response.data as { id: string };
			goto(`/drops/new?id=${id}`);
		} catch (err) {
			console.error('Failed to create drop:', err);
			error = 'Failed to create drop. Please try again.';
			isCreating = false;
		}
	}
</script>

<svelte:head>
	<title>My Drops - bbn.music</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
				Hi {$auth.user?.profile.username || 'there'} 👋
			</h1>
		</div>
		<Button onclick={createNewDrop} disabled={isCreating} loading={isCreating}>
			<PlusOutline class="w-4 h-4" />
			{isCreating ? 'Creating...' : 'Create New Drop'}
		</Button>
	</div>

	<!-- Tabs -->
	<div class="flex gap-2 overflow-x-auto pb-2">
		{#each tabs as tab}
			{@const isActive = activeTab === tab.id}
			{@const count = allDrops.filter((d) => tab.filter.includes(d.type || '')).length}
			<button
				onclick={() => setTab(tab.id)}
				class="px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap {isActive
					? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/25'
					: 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}"
			>
				{tab.label}
				{#if count > 0}
					<span
						class="ml-2 px-2 py-0.5 rounded-full text-xs {isActive ? 'bg-white/20' : 'bg-gray-300 dark:bg-gray-700'}"
					>
						{count}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Content -->
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
	{:else if filteredDrops.length === 0}
		<Card variant="default" padding="lg">
			<div class="text-center py-12">
				<div
					class="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4"
				>
					<svg
						class="w-10 h-10 text-gray-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
						/>
					</svg>
				</div>
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
					No {tabs.find((t) => t.id === activeTab)?.label.toLowerCase()} drops
				</h3>
				<p class="text-gray-500 dark:text-gray-400 mb-6">
					{#if activeTab === 'drafts'}
						Start creating your first drop to get started.
					{:else if activeTab === 'unpublished'}
						Your submitted drops will appear here while under review.
					{:else}
						Your published music will appear here.
					{/if}
				</p>
				{#if activeTab === 'drafts'}
					<Button onclick={createNewDrop} disabled={isCreating} loading={isCreating}>
						<PlusOutline class="w-4 h-4" />
						{isCreating ? 'Creating...' : 'Create New Drop'}
					</Button>
				{/if}
			</div>
		</Card>
	{:else}
		<!-- Drops List -->
		<div class="space-y-4">
			{#each filteredDrops as drop}
				{@const status = getStatusBadge(drop.type)}
				{@const dropUrl =
					drop.type === 'UNSUBMITTED' ? `/drops/new?id=${drop._id}` : `/drops/${drop._id}/edit`}
				<a href={dropUrl} class="block">
					<Card
						variant="default"
						padding="none"
						class="hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors cursor-pointer"
					>
						<div class="flex items-center gap-4 p-4">
							<!-- Artwork -->
							<div class="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800">
								{#if drop.artwork && drop._id && artworkUrls[drop._id]}
									<img
										src={artworkUrls[drop._id]}
										alt={drop.title}
										class="w-full h-full object-cover"
									/>
								{:else}
									<div class="w-full h-full flex items-center justify-center">
										<svg class="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
											<path
												d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
											/>
										</svg>
									</div>
								{/if}
							</div>

							<!-- Title & Artist -->
							<div class="flex-1 min-w-0">
								<h3 class="font-semibold text-gray-900 dark:text-white truncate">{drop.title}</h3>
								<p class="text-gray-500 dark:text-gray-400 text-sm truncate">{getArtistNames(drop.artists)}</p>
							</div>

							<!-- Metadata - hidden on mobile -->
							<div class="hidden md:flex items-center gap-8 text-sm text-gray-500 dark:text-gray-400">
								<div class="w-28 text-center">
									<p class="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Release</p>
									<p>{formatDate(drop.release)}</p>
								</div>
								<div class="w-24 text-center">
									<p class="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Genre</p>
									<p class="truncate">{drop.primaryGenre || '-'}</p>
								</div>
								<div class="w-16 text-center">
									<p class="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Tracks</p>
									<p>{drop.songs?.length || 0}</p>
								</div>
							</div>

							<!-- Status Badge -->
							<div class="flex-shrink-0">
								<Badge color={status.color} size="sm">{status.label}</Badge>
							</div>
						</div>
					</Card>
				</a>
			{/each}
		</div>
	{/if}
</div>
