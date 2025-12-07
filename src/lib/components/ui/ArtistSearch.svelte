<script lang="ts">
	import type { Artist } from '$lib/api/types.gen';
	import { getArtistsByMusic } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import { onMount } from 'svelte';
	import { UserSolid, PlusOutline, SearchOutline, CloseOutline } from 'flowbite-svelte-icons';

	interface Props {
		selectedArtist?: { _id: string | null; name: string } | null;
		onselect: (artist: { _id: string | null; name: string }) => void;
		placeholder?: string;
		label?: string;
	}

	const {
		selectedArtist = null,
		onselect,
		placeholder = 'Search artists...',
		label = 'Artist',
	}: Props = $props();

	let searchQuery = $state('');
	let isOpen = $state(false);
	let inputElement: HTMLInputElement | undefined = $state();
	let containerElement: HTMLDivElement | undefined = $state();
	let allArtists = $state<Artist[]>([]);
	let dropdownPosition = $state({ top: 0, left: 0, width: 0 });
	const inputId = `artist-search-${crypto.randomUUID().slice(0, 8)}`;

	// Load artists on mount
	onMount(async () => {
		try {
			const response = await getArtistsByMusic({
				headers: getAuthHeaders(),
			});
			if (response.data) {
				allArtists = response.data as Artist[];
			}
		} catch (err) {
			console.error('Failed to load artists:', err);
		}
	});

	// Update dropdown position when opening
	function updateDropdownPosition() {
		if (inputElement) {
			const rect = inputElement.getBoundingClientRect();
			dropdownPosition = {
				top: rect.bottom + 8, // 8px gap (mt-2)
				left: rect.left,
				width: rect.width,
			};
		}
	}

	// Search results filtered from loaded artists
	const searchResults = $derived.by(() => {
		if (!searchQuery.trim()) return [];
		const query = searchQuery.toLowerCase();
		return allArtists.filter((a: Artist) => a.name.toLowerCase().includes(query)).slice(0, 5);
	});

	// Check if we can create a new artist (no exact match)
	const canCreateNew = $derived(
		searchQuery.trim().length > 0 &&
			!searchResults.some((a: Artist) => a.name.toLowerCase() === searchQuery.toLowerCase()),
	);

	function selectExisting(artist: Artist) {
		onselect({ _id: artist._id, name: artist.name });
		searchQuery = '';
		isOpen = false;
	}

	function createNew() {
		onselect({ _id: null, name: searchQuery.trim() });
		searchQuery = '';
		isOpen = false;
	}

	function clearSelection() {
		onselect({ _id: null, name: '' });
	}

	function handleInputFocus() {
		updateDropdownPosition();
		isOpen = true;
	}

	function handleInputBlur(e: FocusEvent) {
		// Delay close to allow click on dropdown items
		setTimeout(() => {
			isOpen = false;
		}, 200);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			isOpen = false;
			inputElement?.blur();
		}
	}
</script>

<div class="space-y-2">
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-white">{label}</label>
	{/if}

	{#if selectedArtist?.name}
		<!-- Selected artist display -->
		<div
			class="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
		>
			<div
				class="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center"
			>
				<UserSolid class="w-5 h-5 text-white" />
			</div>
			<div class="flex-1 min-w-0">
				<p class="text-white font-medium truncate">{selectedArtist.name}</p>
				<p class="text-xs text-gray-400">
					{selectedArtist._id ? 'Existing artist' : 'New artist'}
				</p>
			</div>
			<button
				type="button"
				aria-label="Clear artist selection"
				onclick={clearSelection}
				class="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
			>
				<CloseOutline class="w-4 h-4" />
			</button>
		</div>
	{:else}
		<!-- Search input -->
		<div class="relative">
			<div class="relative">
				<SearchOutline
					class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
				/>
				<input
					bind:this={inputElement}
					bind:value={searchQuery}
					id={inputId}
					type="text"
					{placeholder}
					onfocus={handleInputFocus}
					onblur={handleInputBlur}
					onkeydown={handleKeydown}
					class="w-full pl-10 pr-4 py-2.5 rounded-lg text-white placeholder-gray-500
						bg-gray-900/50 border border-gray-600 transition-all duration-200
						focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-orange-500 focus:ring-orange-500/20
						hover:border-gray-500"
				/>
			</div>

			<!-- Dropdown - Fixed positioning to avoid modal overflow clipping -->
			{#if isOpen && (searchResults.length > 0 || canCreateNew)}
				<div
					class="fixed z-[9999] bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto"
					style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px; width: {dropdownPosition.width}px;"
				>
					{#if searchResults.length > 0}
						<div class="py-1">
							<p class="px-4 py-2 text-xs text-gray-500 uppercase tracking-wider">
								Existing Artists
							</p>
							{#each searchResults as artist}
								<button
									type="button"
									onclick={() => selectExisting(artist)}
									class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors text-left"
								>
									<div
										class="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center"
									>
										{#if artist.avatar}
											<img
												src={artist.avatar}
												alt={artist.name}
												class="w-full h-full rounded-full object-cover"
											/>
										{:else}
											<UserSolid class="w-4 h-4 text-gray-400" />
										{/if}
									</div>
									<span class="text-white font-medium">{artist.name}</span>
								</button>
							{/each}
						</div>
					{/if}

					{#if canCreateNew}
						{#if searchResults.length > 0}
							<div class="border-t border-gray-700"></div>
						{/if}
						<button
							type="button"
							onclick={createNew}
							class="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-500/10 transition-colors text-left"
						>
							<div class="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
								<PlusOutline class="w-4 h-4 text-orange-500" />
							</div>
							<span class="text-orange-400 font-medium">Create "{searchQuery}"</span>
						</button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
