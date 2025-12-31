<script lang="ts">
	import { Modal, Button, Input, SearchableSelect, Toggle, Spinner } from '$lib/components/ui';
	import ArtistModal from '$lib/components/ArtistModal.svelte';
	import ArtistList from '$lib/components/ArtistList.svelte';
	import {
		MusicSolid,
		UploadOutline,
		CheckCircleSolid,
		ClipboardListSolid,
		UserSolid,
		ChevronDownOutline,
	} from 'flowbite-svelte-icons';
	import {
		primaryGenreOptions,
		languageOptions,
		getSecondaryGenreOptions,
	} from '$lib/data/options';
	import type { ArtistRef } from '$lib/types/drop';

	interface Props {
		open: boolean;
		title?: string;
		song: {
			title: string;
			explicit: boolean;
			instrumental: boolean;
			artists: ArtistRef[];
			primaryGenre: string;
			secondaryGenre: string;
			isrc: string;
			year?: number;
			language: string;
		};
		// For file uploads
		isUploading?: boolean;
		uploadProgress?: number;
		fileUploaded?: boolean;
		uploadedFilename?: string;
		requiresFile?: boolean; // True for new songs, false for editing
		isEditable?: boolean;
		isIsrcEditable?: boolean;
		resolveName?: (id: string) => string | undefined;
		onclose: () => void;
		onsave: () => void;
		onfileselect?: (file: File) => void;
	}

	let {
		open = $bindable(),
		title = 'Edit Song',
		song = $bindable(),
		isUploading = false,
		uploadProgress = 0,
		fileUploaded = false,
		uploadedFilename = '',
		requiresFile = false,
		isEditable = true,
		isIsrcEditable = true,
		resolveName,
		onclose,
		onsave,
		onfileselect,
	}: Props = $props();

	// Secondary genre options based on primary genre
	const secondaryGenreOptions = $derived(getSecondaryGenreOptions(song.primaryGenre));

	// Track previous values for mutual exclusivity
	let prevExplicit = $state(false);
	let prevInstrumental = $state(false);

	// Mutual exclusivity: explicit and instrumental cannot both be true
	$effect(() => {
		if (song.explicit && !prevExplicit && song.instrumental) {
			song.instrumental = false;
		} else if (song.instrumental && !prevInstrumental && song.explicit) {
			song.explicit = false;
		}
		prevExplicit = song.explicit;
		prevInstrumental = song.instrumental;
	});

	// Artist modal state
	let showArtistModal = $state(false);
	let editingArtistIndex = $state<number | null>(null);
	let editingArtist = $state<ArtistRef | null>(null);

	function openAddArtist() {
		editingArtist = null;
		editingArtistIndex = null;
		showArtistModal = true;
	}

	function openEditArtist(index: number) {
		editingArtist = song.artists[index];
		editingArtistIndex = index;
		showArtistModal = true;
	}

	function handleSaveArtist(artist: ArtistRef) {
		if (editingArtistIndex !== null) {
			song.artists[editingArtistIndex] = artist;
		} else {
			song.artists = [...song.artists, artist];
		}
		showArtistModal = false;
	}

	function removeArtist(index: number) {
		song.artists = song.artists.filter((_, i) => i !== index);
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file && onfileselect) {
			onfileselect(file);
		}
		input.value = '';
	}

	// Validation
	const isValid = $derived(
		song.title.trim().length > 0 && song.artists.length > 0 && (!requiresFile || fileUploaded),
	);
</script>

<Modal bind:open {title} size="xl">
	<div class="space-y-8">
		<!-- Audio File Upload Section -->
		{#if onfileselect}
			<div
				class="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-2 border-orange-500/20 rounded-2xl p-6"
			>
				<div class="flex items-start gap-3 mb-4">
					<div
						class="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0"
					>
						<MusicSolid class="w-5 h-5 text-orange-400" />
					</div>
					<div class="flex-1">
						<h3 class="text-lg font-semibold text-white mb-1">
							Audio File
							{#if requiresFile}
								<span class="text-orange-400">*</span>
							{/if}
						</h3>
						<p class="text-sm text-gray-400">
							{requiresFile
								? 'Upload your song in WAV or FLAC format (16-bit/44.1kHz minimum)'
								: 'Replace the audio file for this song'}
						</p>
					</div>
				</div>

				<div
					class="border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 {isUploading
						? 'border-orange-500/50 bg-orange-500/5 cursor-wait'
						: fileUploaded
							? 'border-green-500/50 bg-green-500/5 cursor-pointer hover:border-green-500'
							: 'border-gray-600 bg-gray-800/30 cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5'}"
					role="button"
					tabindex="0"
					onclick={() => !isUploading && document.getElementById('song-file-upload')?.click()}
					onkeydown={(e) =>
						!isUploading &&
						e.key === 'Enter' &&
						document.getElementById('song-file-upload')?.click()}
				>
					{#if isUploading}
						<Spinner size="xl" class="mx-auto mb-4" />
						<p class="text-white font-semibold mb-1">Uploading... {uploadProgress}%</p>
						<p class="text-gray-400 text-sm">Please wait while we process your file</p>
					{:else if fileUploaded}
						<div
							class="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
						>
							<CheckCircleSolid class="w-8 h-8 text-green-400" />
						</div>
						<p class="text-white font-semibold mb-1">Audio file uploaded successfully!</p>
						{#if uploadedFilename}
							<p class="text-green-400 text-sm font-medium mb-2">{uploadedFilename}</p>
						{/if}
						<p class="text-gray-400 text-sm">Click to replace with a different file</p>
					{:else}
						<div
							class="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4"
						>
							<UploadOutline class="w-8 h-8 text-orange-500" />
						</div>
						<p class="text-white font-semibold mb-1">Drop your audio file here</p>
						<p class="text-gray-400 text-sm mb-3">or click to browse your files</p>
						<div
							class="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700"
						>
							<span class="text-xs text-gray-400">Supported:</span>
							<span class="text-xs font-medium text-orange-400">WAV</span>
							<span class="text-xs text-gray-600">•</span>
							<span class="text-xs font-medium text-orange-400">FLAC</span>
						</div>
					{/if}
				</div>
				<input
					type="file"
					id="song-file-upload"
					accept="audio/wav,audio/x-wav,audio/flac,audio/x-flac"
					onchange={handleFileSelect}
					class="hidden"
				/>
			</div>
		{/if}

		<!-- Song Details -->
		<div class="space-y-6">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center">
					<ClipboardListSolid class="w-4 h-4 text-gray-400" />
				</div>
				<h3 class="text-lg font-semibold text-white">Song Details</h3>
			</div>

			<div class="grid gap-6">
				<Input
					bind:value={song.title}
					label="Song Title"
					placeholder="Enter song title"
					required
					disabled={!isEditable}
					hint="This will appear on all streaming platforms"
				/>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<SearchableSelect
						bind:value={song.primaryGenre}
						options={primaryGenreOptions}
						label="Primary Genre"
						placeholder="Select primary genre..."
						required
						disabled={!isEditable}
					/>
					<SearchableSelect
						bind:value={song.secondaryGenre}
						options={secondaryGenreOptions}
						label="Secondary Genre"
						placeholder="Select secondary genre..."
						disabled={!isEditable || !song.primaryGenre}
					/>
				</div>

				<div>
					<span class="block text-sm font-medium text-white mb-3">Content Flags</span>
					<div class="flex gap-6">
						<Toggle
							bind:checked={song.explicit}
							label="Explicit Content"
							color="red"
							disabled={!isEditable}
						/>
						<Toggle
							bind:checked={song.instrumental}
							label="Instrumental"
							color="blue"
							disabled={!isEditable}
						/>
					</div>
					<p class="text-xs text-gray-500 mt-2">
						Mark if this song contains explicit lyrics or is purely instrumental (mutually
						exclusive)
					</p>
				</div>
			</div>
		</div>

		<!-- Artists -->
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center">
					<UserSolid class="w-4 h-4 text-gray-400" />
				</div>
				<div class="flex-1">
					<h3 class="text-lg font-semibold text-white">
						Artists <span class="text-orange-400">*</span>
					</h3>
					<p class="text-sm text-gray-400">Add at least one artist</p>
				</div>
			</div>

			<ArtistList
				artists={song.artists}
				editable={isEditable}
				compact
				onadd={openAddArtist}
				onedit={openEditArtist}
				onremove={removeArtist}
				emptyMessage="No artists assigned yet"
				{resolveName}
			/>
		</div>

		<!-- Advanced Settings -->
		<details class="group">
			<summary class="flex items-center gap-3 cursor-pointer list-none">
				<div class="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center">
					<ChevronDownOutline
						class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180"
					/>
				</div>
				<h3 class="text-lg font-semibold text-white">Advanced Settings</h3>
				<span class="text-xs text-gray-500">(Optional)</span>
			</summary>
			<div class="mt-4 pl-11 space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Input
						type="number"
						value={song.year?.toString() ?? ''}
						oninput={(e) => {
							const val = (e.target as HTMLInputElement).value;
							song.year = val ? parseInt(val, 10) : undefined;
						}}
						label="Recording Year"
						placeholder="YYYY"
						hint="Year when this song was originally recorded"
						disabled={!isEditable}
					/>
					<SearchableSelect
						bind:value={song.language}
						options={languageOptions}
						label="Language"
						placeholder="Select language..."
						hint="Language of the song (defaults to drop language)"
						disabled={!isEditable}
					/>
				</div>
				<Input
					bind:value={song.isrc}
					label="ISRC Code"
					placeholder="CC-XXX-YY-NNNNN"
					disabled={!isIsrcEditable}
					hint={!isIsrcEditable && song.isrc
						? 'Cannot be changed after publishing'
						: 'International Standard Recording Code - leave empty to auto-generate'}
				/>
			</div>
		</details>
	</div>

	{#snippet footer()}
		<div class="flex items-center justify-between gap-4 w-full">
			<p class="text-sm text-gray-400">
				{#if requiresFile && !fileUploaded}
					<span class="text-orange-400">•</span> Audio file required
				{:else if !song.title.trim()}
					<span class="text-orange-400">•</span> Song title required
				{:else if song.artists.length === 0}
					<span class="text-orange-400">•</span> At least one artist required
				{:else}
					<span class="text-green-400">✓</span> Ready to save
				{/if}
			</p>
			<div class="flex gap-3">
				<Button variant="secondary" onclick={onclose}>Cancel</Button>
				<Button onclick={onsave} disabled={!isValid || !isEditable}>Save Song</Button>
			</div>
		</div>
	{/snippet}
</Modal>

<!-- Artist Modal (nested) -->
<ArtistModal
	bind:open={showArtistModal}
	artist={editingArtist}
	onclose={() => (showArtistModal = false)}
	onsave={handleSaveArtist}
	title={editingArtistIndex !== null ? 'Edit Artist' : 'Add Artist to Song'}
/>
