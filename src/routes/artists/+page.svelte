<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Card, Modal, Input } from '$lib/components/ui';
	import { SearchOutline, PlusOutline } from 'flowbite-svelte-icons';
	import type { Artist } from '$lib/api/types.gen';
	import { getArtistsByMusic, postArtistsByMusic } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import { toast } from '$lib/stores/toast';

	let artists = $state<Artist[]>([]);
	let filteredArtists = $state<Artist[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let searchTerm = $state('');

	// Add artist modal state
	let showAddModal = $state(false);
	let newArtistName = $state('');
	let newArtistSpotify = $state('');
	let newArtistApple = $state('');
	let isCreating = $state(false);

	onMount(async () => {
		try {
			const response = await getArtistsByMusic({
				headers: getAuthHeaders(),
			});

			if (response.data) {
				artists = response.data as Artist[];
				filteredArtists = artists;
			}
		} catch (err: any) {
			error = err?.error?.message || err?.message || 'Failed to load artists';
			console.error('Error loading artists:', err);
		} finally {
			isLoading = false;
		}
	});

	// Filter artists based on search
	$effect(() => {
		if (!searchTerm) {
			filteredArtists = artists;
			return;
		}

		const term = searchTerm.toLowerCase();
		filteredArtists = artists.filter((artist) => artist.name.toLowerCase().includes(term));
	});

	function openAddModal() {
		newArtistName = '';
		newArtistSpotify = '';
		newArtistApple = '';
		showAddModal = true;
	}

	async function createArtist() {
		if (!newArtistName.trim()) {
			toast.show('Please enter an artist name', 'error');
			return;
		}

		isCreating = true;
		try {
			const response = await postArtistsByMusic({
				headers: getAuthHeaders(),
				body: {
					name: newArtistName.trim(),
					spotify: newArtistSpotify.trim() || undefined,
					apple: newArtistApple.trim() || undefined,
				},
			});

			if (response.data) {
				// API only returns { id }, so construct the full artist object
				const newArtist: Artist = {
					_id: response.data.id,
					name: newArtistName.trim(),
					users: [],
					spotify: newArtistSpotify.trim() || undefined,
					apple: newArtistApple.trim() || undefined,
				};
				artists = [...artists, newArtist];
				filteredArtists = artists;
				toast.show('Artist created successfully', 'success');
				showAddModal = false;
			}
		} catch (err: any) {
			console.error('Failed to create artist:', err);
			toast.show(err?.error?.message || err?.message || 'Failed to create artist', 'error');
		} finally {
			isCreating = false;
		}
	}
</script>

<svelte:head>
	<title>Artists - bbn.music</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Your Artists</h1>
			<p class="text-gray-500 dark:text-gray-400 mt-1">Manage your artist profiles</p>
		</div>
		<Button onclick={openAddModal}>
			<PlusOutline class="w-4 h-4" /> Add Artist
		</Button>
	</div>

	<!-- Search Bar -->
	<div class="relative max-w-md">
		<SearchOutline class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
		<input
			type="search"
			placeholder="Search artists..."
			aria-label="Search artists"
			bind:value={searchTerm}
			class="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
		/>
	</div>

	<!-- Loading State -->
	{#if isLoading}
		<div class="flex justify-center items-center h-64">
			<div
				class="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"
			></div>
		</div>
	{:else if error}
		<!-- Error State -->
		<Card variant="default" padding="lg">
			<div class="text-center py-8">
				<p class="text-red-400 mb-4">{error}</p>
				<Button onclick={() => location.reload()}>Try Again</Button>
			</div>
		</Card>
	{:else if filteredArtists.length === 0}
		<!-- Empty State -->
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
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
				</div>
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
					{searchTerm ? 'No artists found' : 'No artists yet'}
				</h3>
				<p class="text-gray-500 dark:text-gray-400 mb-6">
					{searchTerm
						? 'Try adjusting your search'
						: 'Add your first artist to get started with distributing music.'}
				</p>
				{#if searchTerm}
					<Button variant="secondary" onclick={() => (searchTerm = '')}>Clear Search</Button>
				{:else}
					<Button onclick={openAddModal}>
						<PlusOutline class="w-4 h-4" /> Add Artist
					</Button>
				{/if}
			</div>
		</Card>
	{:else}
		<!-- Artists Grid -->
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
			{#each filteredArtists as artist}
				<Card variant="default" padding="none">
					<a href="/artists/{artist._id}" class="block p-4 hover:bg-gray-800/50 transition-colors">
						<!-- Artist Avatar -->
						<div class="relative mb-3">
							{#if artist.avatar}
								<img
									src={artist.avatar}
									alt={artist.name}
									class="w-full aspect-square rounded-full object-cover"
								/>
							{:else}
								<div
									class="w-full aspect-square rounded-full bg-gradient-to-r from-orange-500 to-orange-400 flex items-center justify-center"
								>
									<span class="text-white text-3xl font-bold">
										{artist.name?.[0]?.toUpperCase() ?? '?'}
									</span>
								</div>
							{/if}
						</div>

						<!-- Artist Info -->
						<div class="text-center">
							<h3 class="font-semibold text-gray-900 dark:text-white truncate">
								{artist.name || 'Unnamed Artist'}
							</h3>
							<div class="flex items-center justify-center gap-2 mt-1 text-xs text-gray-400">
								{#if artist.spotify}
									<span class="text-green-400">Spotify</span>
								{/if}
								{#if artist.apple}
									<span class="text-pink-400">Apple</span>
								{/if}
							</div>
						</div>
					</a>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<!-- Add Artist Modal -->
<Modal bind:open={showAddModal} title="Add New Artist" size="md">
	<div class="space-y-4">
		<Input
			bind:value={newArtistName}
			label="Artist Name"
			placeholder="Enter artist name"
			required
		/>
		<Input
			bind:value={newArtistSpotify}
			label="Spotify Artist ID"
			placeholder="Optional - e.g., 4Z8W4fKeB5YxbusRsdQVPb"
			hint="Found in the Spotify artist URL"
		/>
		<Input
			bind:value={newArtistApple}
			label="Apple Music Artist ID"
			placeholder="Optional - e.g., 178834"
			hint="Found in the Apple Music artist URL"
		/>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showAddModal = false)}>Cancel</Button>
		<Button
			onclick={createArtist}
			disabled={!newArtistName.trim() || isCreating}
			loading={isCreating}
		>
			{isCreating ? 'Creating...' : 'Create Artist'}
		</Button>
	{/snippet}
</Modal>
