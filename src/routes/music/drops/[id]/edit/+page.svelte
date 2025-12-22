<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Modal } from '$lib/components/ui';
	import {
		ArrowLeftOutline,
		PlusOutline,
		TrashBinOutline,
		UploadOutline,
		EditOutline,
		UserSolid,
		MusicSolid,
		ImageOutline,
		CheckCircleSolid,
		CloseCircleSolid,
		ExclamationCircleOutline,
		ChevronDownOutline,
	} from 'flowbite-svelte-icons';

	import {
		Button,
		Input,
		Select,
		Textarea,
		Card,
		Badge,
		Toggle,
		Alert,
		IconButton,
	} from '$lib/components/ui';
	import ArtistModal from '$lib/components/ArtistModal.svelte';
	import ArtistList from '$lib/components/ArtistList.svelte';
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';
	import { primaryGenres, getSecondaryGenres } from '$lib/data/genres';
	import { languages, getLanguageName } from '$lib/data/languages';
	import {
		getIdByDropsByMusic,
		getIdByDropsByAdmin,
		patchIdByDropsByMusic,
		postTypeByTypeByDropByMusic,
		getArtworkByDropByMusic,
		postShareByDropsByMusic,
		getIdByShareByDropsByMusic,
		deleteIdByShareByDropsByMusic,
		getArtistsByMusic,
	} from '$lib/api/sdk.gen.ts';
	import { getAuthHeaders } from '$lib/apiClient';
	import { uploadViaWebSocket as wsUpload } from '$lib/utils/wsUpload';
	import { auth } from '$lib/stores/auth';
	import { toast } from '$lib/stores/toast';
	import type { FullDrop, DropType, Song, ArtistRef, Share, Artist } from '$lib/api/types.gen';

	// Drop ID is always defined in this route (guaranteed by SvelteKit routing)
	const dropId = $page.params.id!;

	// Form state
	let drop = $state<FullDrop | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let artworkUrl = $state<string | null>(null);
	let uploadingArtwork = $state(false);
	let allArtists = $state<Artist[]>([]);

	// Helper function to resolve artist name from ID
	function getArtistNameById(id: string): string | undefined {
		const artist = allArtists.find((a) => a._id === id);
		return artist?.name;
	}

	// Edit state - track what's been modified
	let hasChanges = $state(false);

	// Form fields (copied from drop for editing)
	let title = $state('');
	let release = $state('');
	let language = $state('en');
	let primaryGenre = $state('');
	let secondaryGenre = $state('');
	let compositionCopyright = $state('');
	let soundRecordingCopyright = $state('');
	let gtin = $state('');
	let comments = $state('');
	let artists = $state<ArtistRef[]>([]);

	// Share state
	let share = $state<Share | null>(null);
	let shareLoading = $state(false);

	// Modals
	let showArtistModal = $state(false);
	let editingArtistIndex = $state<number | null>(null);
	let editingArtist = $state<ArtistRef | null>(null);
	let showStatusChangeModal = $state(false);
	let pendingStatusChange = $state<DropType | null>(null);

	// Song editing
	let songs = $state<Song[]>([]);
	let showSongModal = $state(false);
	let editingSongIndex = $state<number | null>(null);
	let tempSong = $state<{
		title: string;
		explicit: boolean;
		instrumental: boolean;
		artists: ArtistRef[];
		isrc: string;
		primaryGenre: string;
		secondaryGenre: string;
		year?: number;
		language: string;
	}>({
		title: '',
		explicit: false,
		instrumental: false,
		artists: [],
		isrc: '',
		primaryGenre: '',
		secondaryGenre: '',
		year: undefined,
		language: '',
	});

	// Track previous values to detect which toggle changed
	let prevExplicit = $state(false);
	let prevInstrumental = $state(false);

	// Mutual exclusivity: explicit and instrumental cannot both be true
	$effect(() => {
		if (tempSong.explicit && !prevExplicit && tempSong.instrumental) {
			tempSong.instrumental = false;
		} else if (tempSong.instrumental && !prevInstrumental && tempSong.explicit) {
			tempSong.explicit = false;
		}
		prevExplicit = tempSong.explicit;
		prevInstrumental = tempSong.instrumental;
	});

	let showSongArtistModal = $state(false);
	let editingSongArtistIndex = $state<number | null>(null);
	let editingSongArtist = $state<ArtistRef | null>(null);

	// Derived values
	const secondaryGenreOptions = $derived(getSecondaryGenres(primaryGenre));
	const isAdmin = $derived($auth.user?.isAdmin ?? false);
	// Admins can edit any drop, users can only edit certain statuses
	const isEditable = $derived(
		isAdmin ||
			drop?.type === 'UNSUBMITTED' ||
			drop?.type === 'PRIVATE' ||
			drop?.type === 'PUBLISHED' ||
			drop?.type === 'EDIT_UNDER_REVIEW',
	);
	// GTIN/ISRC cannot be changed once published - unless admin
	const isGtinEditable = $derived(
		isAdmin || (isEditable && (drop?.type === 'UNSUBMITTED' || drop?.type === 'PRIVATE')),
	);
	const isIsrcEditable = $derived(
		isAdmin || (isEditable && (drop?.type === 'UNSUBMITTED' || drop?.type === 'PRIVATE')),
	);
	// Secondary genre options for song modal
	const tempSongSecondaryGenreOptions = $derived(getSecondaryGenres(tempSong.primaryGenre));
	const canSubmitForReview = $derived(drop?.type === 'UNSUBMITTED');
	const canCancelReview = $derived(drop?.type === 'UNDER_REVIEW');
	const canRequestTakedown = $derived(
		drop?.type === 'PUBLISHED' || drop?.type === 'EDIT_UNDER_REVIEW',
	);
	const canCancelTakedown = $derived(drop?.type === 'TAKEDOWN_REQUESTED');
	const canCancelEditReview = $derived(drop?.type === 'EDIT_UNDER_REVIEW');

	onMount(async () => {
		await loadDrop();
	});

	async function loadDrop() {
		loading = true;
		error = null;
		try {
			// Check if user is admin to determine which endpoint to use
			const userIsAdmin = $auth.user?.isAdmin ?? false;

			if (userIsAdmin) {
				// Admin: fetch both admin data (for artistList) and drop data in parallel
				const [adminResponse, dropResponse] = await Promise.all([
					getIdByDropsByAdmin({
						path: { id: dropId },
						headers: getAuthHeaders(),
					}),
					getIdByDropsByMusic({
						path: { id: dropId },
						headers: getAuthHeaders(),
					}),
				]);

				if (dropResponse.data) {
					drop = dropResponse.data as FullDrop;
				}

				// Use the drop owner's artists from admin endpoint's artistList
				if (adminResponse.data) {
					const adminData = adminResponse.data as { artistList?: Artist[] };
					allArtists = adminData.artistList ?? [];
				}
			} else {
				// Regular user: load their own artists
				try {
					const artistsResponse = await getArtistsByMusic({
						headers: getAuthHeaders(),
					});
					if (artistsResponse.data) {
						allArtists = artistsResponse.data as Artist[];
					}
				} catch (e) {
					console.error('Failed to load artists:', e);
				}

				const response = await getIdByDropsByMusic({
					path: { id: dropId },
					headers: getAuthHeaders(),
				});
				if (response.data) {
					drop = response.data as FullDrop;
				}
			}

			if (drop) {
				// Copy to editable fields
				title = drop.title;
				release = drop.release;
				language = drop.language;
				primaryGenre = drop.primaryGenre;
				secondaryGenre = drop.secondaryGenre;
				compositionCopyright = drop.compositionCopyright;
				soundRecordingCopyright = drop.soundRecordingCopyright;
				gtin = drop.gtin ?? '';
				comments = drop.comments ?? '';
				// Copy artists (names resolved at display time via resolveName)
				artists = [...drop.artists];
				songs = drop.songs.map((s) => ({ ...s, artists: [...s.artists] }));

				// Load artwork if available
				if (drop.artwork) {
					loadArtwork(drop._id);
				}

				// Load share link for published/edit under review drops
				if (drop.type === 'PUBLISHED' || drop.type === 'EDIT_UNDER_REVIEW') {
					await loadShare();
				}
			}
		} catch (e: any) {
			error = e?.error?.message || e?.message || 'Failed to load drop';
		} finally {
			loading = false;
		}
	}

	async function loadArtwork(id: string) {
		try {
			const response = await getArtworkByDropByMusic({
				path: { dropId: id },
				headers: getAuthHeaders(),
			});
			if (response.data) {
				const blob = response.data as Blob;
				artworkUrl = URL.createObjectURL(blob);
			}
		} catch (e) {
			console.error('Failed to load artwork:', e);
		}
	}

	function handleArtworkUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			uploadArtwork(file);
		}
		// Reset input so the same file can be selected again
		input.value = '';
	}

	async function uploadArtwork(file: File) {
		uploadingArtwork = true;
		try {
			await wsUpload({
				path: `api/@bbn/music/drops/${dropId}/upload`,
				file,
			});
			// Reload artwork to show new image
			artworkUrl = URL.createObjectURL(file);
			toast.show('Artwork updated successfully', 'success');
			hasChanges = true;
		} catch (e: any) {
			console.error('Artwork upload failed:', e);
			toast.show(e?.message || 'Failed to upload artwork', 'error');
		} finally {
			uploadingArtwork = false;
		}
	}

	async function loadShare() {
		try {
			const response = await getIdByShareByDropsByMusic({
				path: { id: dropId },
				headers: getAuthHeaders(),
			});
			if (response.data) {
				share = response.data as Share;
			}
		} catch (e) {
			console.error('Failed to load share:', e);
		}
	}

	async function createShare() {
		shareLoading = true;
		error = null;
		try {
			const response = await postShareByDropsByMusic({
				body: { id: dropId },
				headers: getAuthHeaders(),
			});

			if (response.data) {
				share = response.data as Share;
				successMessage = 'Share link created successfully!';
				setTimeout(() => (successMessage = null), 3000);
			}
		} catch (e: any) {
			error = e?.error?.message || e?.message || 'Failed to create share link';
		} finally {
			shareLoading = false;
		}
	}

	async function deleteShare() {
		if (!share) return;
		shareLoading = true;
		error = null;
		try {
			await deleteIdByShareByDropsByMusic({
				path: { id: share._id },
				headers: getAuthHeaders(),
			});
			share = null;
			successMessage = 'Share link deleted successfully!';
			setTimeout(() => (successMessage = null), 3000);
		} catch (e: any) {
			error = e?.error?.message || e?.message || 'Failed to delete share link';
		} finally {
			shareLoading = false;
		}
	}

	function copyShareUrl() {
		if (!share) return;
		const url = `${window.location.origin}/s/${share.slug}`;
		navigator.clipboard.writeText(url);
		successMessage = 'Share URL copied to clipboard!';
		setTimeout(() => (successMessage = null), 2000);
	}

	async function saveDrop() {
		if (!drop || !isEditable) return;
		saving = true;
		error = null;
		successMessage = null;
		try {
			// Save drop data
			await patchIdByDropsByMusic({
				path: { id: dropId },
				body: {
					title,
					release,
					language,
					primaryGenre,
					secondaryGenre,
					compositionCopyright,
					soundRecordingCopyright,
					gtin: gtin || undefined,
					comments: comments || undefined,
					artists,
					songs,
				},
				headers: getAuthHeaders(),
			});

			// For published drops edited by non-admins, automatically submit for review
			if (drop.type === 'PUBLISHED' && !isAdmin) {
				await postTypeByTypeByDropByMusic({
					path: { dropId, type: 'EDIT_UNDER_REVIEW' },
					headers: getAuthHeaders(),
				});
				successMessage = 'Changes saved and submitted for review';
			} else {
				successMessage = 'Drop saved successfully';
			}
			hasChanges = false;
			await loadDrop();
		} catch (e: any) {
			error = e?.error?.message || e?.message || 'Failed to save drop';
		} finally {
			saving = false;
		}
	}

	function requestStatusChange(newType: DropType) {
		pendingStatusChange = newType;
		showStatusChangeModal = true;
	}

	async function confirmStatusChange() {
		if (!drop || !pendingStatusChange) return;

		saving = true;
		error = null;
		showStatusChangeModal = false;

		try {
			await postTypeByTypeByDropByMusic({
				path: { dropId, type: pendingStatusChange },
				headers: getAuthHeaders(),
			});
			await loadDrop();
			successMessage = 'Status updated successfully';
		} catch (e: any) {
			error = e?.error?.message || e?.message || 'Failed to update status';
		} finally {
			saving = false;
			pendingStatusChange = null;
		}
	}

	function getStatusChangeMessage(type: DropType | null, currentType?: DropType): string {
		if (!type) return '';

		// Special case: canceling edit review goes back to PUBLISHED
		if (type === 'PUBLISHED' && currentType === 'EDIT_UNDER_REVIEW') {
			return 'Cancel the edit review? Your changes will be kept but the review will be cancelled. Your release remains live on all platforms.';
		}

		const messages: Record<string, string> = {
			UNDER_REVIEW:
				'Submit this drop for review? Once submitted, you cannot edit it until the review is complete.',
			UNSUBMITTED: 'Cancel the review? Your drop will be moved back to draft status.',
			TAKEDOWN_REQUESTED: 'Request a takedown? This will remove your release from all platforms.',
			PUBLISHED:
				'Cancel the takedown request? Your release will remain published on all platforms.',
		};

		return messages[type] ?? `Change status to ${type}?`;
	}

	function markChanged() {
		hasChanges = true;
	}

	// Artist management
	function openAddArtist() {
		editingArtist = null;
		editingArtistIndex = null;
		showArtistModal = true;
	}

	function openEditArtist(index: number) {
		editingArtist = artists[index];
		editingArtistIndex = index;
		showArtistModal = true;
	}

	function handleSaveArtist(artist: ArtistRef) {
		if (editingArtistIndex !== null) {
			artists[editingArtistIndex] = artist;
		} else {
			artists = [...artists, artist];
		}
		showArtistModal = false;
		markChanged();
	}

	function removeArtist(index: number) {
		artists = artists.filter((_, i) => i !== index);
		markChanged();
	}

	// Song management
	function openEditSong(index: number) {
		const song = songs[index];
		tempSong = {
			title: song.title,
			explicit: song.explicit ?? false,
			instrumental: song.instrumental ?? false,
			artists: [...song.artists],
			isrc: song.isrc ?? '',
			primaryGenre: song.primaryGenre ?? '',
			secondaryGenre: song.secondaryGenre ?? '',
			year: song.year,
			language: song.language ?? '',
		};
		// Reset prev values to match the loaded song
		prevExplicit = tempSong.explicit;
		prevInstrumental = tempSong.instrumental;
		editingSongIndex = index;
		showSongModal = true;
	}

	function saveSong() {
		if (editingSongIndex === null) return;

		const existingSong = songs[editingSongIndex];
		songs[editingSongIndex] = {
			...existingSong,
			title: tempSong.title,
			explicit: tempSong.explicit,
			instrumental: tempSong.instrumental,
			artists: tempSong.artists,
			isrc: tempSong.isrc,
			primaryGenre: tempSong.primaryGenre || existingSong.primaryGenre,
			secondaryGenre: tempSong.secondaryGenre || existingSong.secondaryGenre,
			year: tempSong.year ?? existingSong.year,
			language: tempSong.language || existingSong.language,
		};
		showSongModal = false;
		editingSongIndex = null;
		markChanged();
	}

	// Song artist management (within song modal)
	function openAddSongArtist() {
		editingSongArtist = null;
		editingSongArtistIndex = null;
		showSongArtistModal = true;
	}

	function openEditSongArtist(index: number) {
		editingSongArtist = tempSong.artists[index];
		editingSongArtistIndex = index;
		showSongArtistModal = true;
	}

	function handleSaveSongArtist(artist: ArtistRef) {
		if (editingSongArtistIndex !== null) {
			tempSong.artists[editingSongArtistIndex] = artist;
		} else {
			tempSong.artists = [...tempSong.artists, artist];
		}
		showSongArtistModal = false;
	}

	function removeSongArtist(index: number) {
		tempSong.artists = tempSong.artists.filter((_, i) => i !== index);
	}

	function getStatusColor(type: DropType | undefined): string {
		switch (type) {
			case 'PUBLISHED':
				return 'bg-green-500/20 text-green-400 border-green-500/30';
			case 'PUBLISHING':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
			case 'UNDER_REVIEW':
				return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
			case 'EDIT_UNDER_REVIEW':
				return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
			case 'TAKEDOWN_REQUESTED':
				return 'bg-red-500/20 text-red-400 border-red-500/30';
			case 'REVIEW_DECLINED':
				return 'bg-red-500/20 text-red-400 border-red-500/30';
			case 'PRIVATE':
				return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
			default:
				return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
		}
	}

	function getStatusLabel(type: DropType | undefined): string {
		switch (type) {
			case 'UNSUBMITTED':
				return 'Draft';
			case 'UNDER_REVIEW':
				return 'Under Review';
			case 'EDIT_UNDER_REVIEW':
				return 'Edit Under Review';
			case 'PUBLISHED':
				return 'Published';
			case 'PUBLISHING':
				return 'Publishing';
			case 'TAKEDOWN_REQUESTED':
				return 'Takedown Requested';
			case 'REVIEW_DECLINED':
				return 'Declined';
			case 'PRIVATE':
				return 'Private';
			default:
				return type ?? 'Unknown';
		}
	}
</script>

<svelte:head>
	<title>{drop?.title ?? 'Loading...'} - Edit Drop - bbn.music</title>
</svelte:head>

<div class="min-h-screen max-w-6xl mx-auto">
	<!-- Header -->
	<div class="flex items-center gap-4 mb-6">
		<Button
			variant="secondary"
			onclick={() => {
				const referrer = document.referrer;
				if (referrer && new URL(referrer).origin === window.location.origin) {
					history.back();
				} else {
					goto('/music/drops');
				}
			}}
		>
			<ArrowLeftOutline class="w-4 h-4" /> Back
		</Button>
		<div class="flex-1">
			<h1 class="text-2xl font-bold text-white">Edit Drop</h1>
		</div>
		{#if drop}
			<span class="px-3 py-1.5 rounded-lg text-sm font-medium border {getStatusColor(drop.type)}">
				{getStatusLabel(drop.type)}
			</span>
		{/if}
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-24">
			<div
				class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"
			></div>
		</div>
	{:else if error && !drop}
		<Alert variant="error">{error}</Alert>
	{:else if drop}
		<!-- Alerts -->
		{#if error}
			<div class="mb-6">
				<Alert variant="error" dismissible ondismiss={() => (error = null)}>{error}</Alert>
			</div>
		{/if}
		{#if successMessage}
			<div class="mb-6">
				<Alert variant="success" dismissible ondismiss={() => (successMessage = null)}
					>{successMessage}</Alert
				>
			</div>
		{/if}

		<!-- Status-specific notices -->
		{#if !isEditable}
			<div
				class="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3"
			>
				<ExclamationCircleOutline class="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
				<div>
					<p class="text-yellow-400 font-medium">Editing Disabled</p>
					<p class="text-yellow-400/70 text-sm">
						{#if drop.type === 'UNDER_REVIEW'}
							This drop is currently under review. You cannot make changes until the review is
							complete.
						{:else}
							This drop cannot be edited in its current status.
						{/if}
					</p>
				</div>
			</div>
		{:else if drop.type === 'PUBLISHED'}
			<div
				class="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3"
			>
				<ExclamationCircleOutline class="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
				<div>
					<p class="text-blue-400 font-medium">Published Release</p>
					<p class="text-blue-400/70 text-sm">
						Your release is live on streaming platforms. You can make edits, but saving will
						automatically submit them for review before going live.
					</p>
				</div>
			</div>
		{:else if drop.type === 'EDIT_UNDER_REVIEW'}
			<div
				class="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3"
			>
				<ExclamationCircleOutline class="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
				<div>
					<p class="text-orange-400 font-medium">Edit Under Review</p>
					<p class="text-orange-400/70 text-sm">
						Your changes are being reviewed. Your release remains live on streaming platforms with
						the original metadata. You can continue making edits or cancel the review.
					</p>
				</div>
			</div>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Left Column: Artwork -->
			<div class="lg:col-span-1">
				<Card variant="glass" padding="md">
					<h3 class="text-lg font-semibold text-white mb-4">Artwork</h3>
					<div class="aspect-square rounded-xl overflow-hidden bg-gray-800 mb-4 relative">
						{#if uploadingArtwork}
							<div class="w-full h-full flex items-center justify-center">
								<div
									class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"
								></div>
							</div>
						{:else if artworkUrl}
							<img src={artworkUrl} alt="Album artwork" class="w-full h-full object-cover" />
						{:else if drop.artwork}
							<div class="w-full h-full flex items-center justify-center">
								<div
									class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"
								></div>
							</div>
						{:else}
							<div class="w-full h-full flex items-center justify-center">
								<ImageOutline class="w-16 h-16 text-gray-600" />
							</div>
						{/if}
					</div>
					{#if isEditable}
						<input
							type="file"
							id="artwork-upload"
							accept="image/jpeg,image/png"
							onchange={handleArtworkUpload}
							class="hidden"
						/>
						<Button
							variant="secondary"
							class="w-full"
							disabled={uploadingArtwork}
							onclick={() => document.getElementById('artwork-upload')?.click()}
						>
							<UploadOutline class="w-4 h-4" />
							{uploadingArtwork ? 'Uploading...' : 'Change Artwork'}
						</Button>
						<p class="text-xs text-gray-500 mt-2 text-center">
							JPG or PNG, 3000x3000px recommended
						</p>
					{/if}
				</Card>

				<!-- Action Buttons -->
				<Card variant="glass" padding="md" class="mt-6">
					<h3 class="text-lg font-semibold text-white mb-4">Actions</h3>
					<div class="space-y-3">
						{#if canSubmitForReview}
							<Button
								class="w-full"
								onclick={() => requestStatusChange('UNDER_REVIEW')}
								disabled={saving || hasChanges}
							>
								<CheckCircleSolid class="w-4 h-4" /> Submit for Review
							</Button>
							{#if hasChanges}
								<p class="text-xs text-yellow-400 text-center">
									Save your changes before submitting
								</p>
							{/if}
						{/if}
						{#if canCancelReview}
							<Button
								variant="secondary"
								class="w-full"
								onclick={() => requestStatusChange('UNSUBMITTED')}
								disabled={saving}
							>
								<CloseCircleSolid class="w-4 h-4" /> Cancel Review
							</Button>
						{/if}
						{#if canCancelEditReview}
							<Button
								variant="secondary"
								class="w-full"
								onclick={() => requestStatusChange('PUBLISHED')}
								disabled={saving}
							>
								<CloseCircleSolid class="w-4 h-4" /> Cancel Edit Review
							</Button>
						{/if}
						{#if canRequestTakedown}
							<Button
								variant="danger"
								class="w-full"
								onclick={() => requestStatusChange('TAKEDOWN_REQUESTED')}
								disabled={saving}
							>
								<TrashBinOutline class="w-4 h-4" /> Request Takedown
							</Button>
						{/if}
						{#if canCancelTakedown}
							<Button
								variant="secondary"
								class="w-full"
								onclick={() => requestStatusChange('PUBLISHED')}
								disabled={saving}
							>
								<CloseCircleSolid class="w-4 h-4" /> Cancel Takedown Request
							</Button>
						{/if}
					</div>
				</Card>

				<!-- Admin Section -->
				{#if isAdmin}
					<Card variant="glass" padding="md" class="mt-6 border-red-500/30">
						<h3 class="text-lg font-semibold text-red-400 mb-4">Admin Actions</h3>
						<div class="space-y-2 text-sm mb-4">
							<p class="text-gray-400">
								Drop ID: <span class="font-mono text-gray-300">{drop._id}</span>
							</p>
							<p class="text-gray-400">
								User: <span class="font-mono text-gray-300">{drop.user}</span>
							</p>
							{#if drop.gtin}
								<p class="text-gray-400">
									GTIN: <span class="font-mono text-gray-300">{drop.gtin}</span>
								</p>
							{/if}
						</div>
						<Button href="/admin/drops/{drop._id}" variant="danger" size="sm" class="w-full">
							Open Admin Review
						</Button>
					</Card>
				{/if}
			</div>

			<!-- Right Column: Details -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Basic Info -->
				<Card variant="glass" padding="md">
					<h3 class="text-lg font-semibold text-white mb-4">Release Details</h3>
					<div class="space-y-4">
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div class="md:col-span-2">
								<Input
									bind:value={title}
									label="Title"
									disabled={!isEditable}
									oninput={markChanged}
								/>
							</div>
							<div>
								<Input
									type="date"
									bind:value={release}
									label="Release Date"
									disabled={!isEditable}
									oninput={markChanged}
								/>
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<Select
								bind:value={primaryGenre}
								label="Primary Genre"
								disabled={!isEditable}
								onchange={markChanged}
							>
								<option value="">Select genre...</option>
								{#each primaryGenres as genre}
									<option value={genre}>{genre}</option>
								{/each}
							</Select>

							<Select
								bind:value={secondaryGenre}
								label="Sub-genre"
								disabled={!isEditable || !primaryGenre}
								onchange={markChanged}
							>
								<option value="">Select sub-genre...</option>
								{#each secondaryGenreOptions as genre}
									<option value={genre}>{genre}</option>
								{/each}
							</Select>

							<Select
								bind:value={language}
								label="Language"
								disabled={!isEditable}
								onchange={markChanged}
							>
								{#each Object.entries(languages) as [code, name]}
									<option value={code}>{name}</option>
								{/each}
							</Select>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Input
								bind:value={compositionCopyright}
								label="Composition Copyright"
								disabled={!isEditable}
								oninput={markChanged}
							/>
							<Input
								bind:value={soundRecordingCopyright}
								label="Sound Recording Copyright"
								disabled={!isEditable}
								oninput={markChanged}
							/>
						</div>

						<Input
							bind:value={gtin}
							label="UPC/EAN"
							disabled={!isGtinEditable}
							oninput={markChanged}
							hint={!isGtinEditable && drop.gtin
								? 'Cannot be changed after publishing'
								: drop.gtin
									? undefined
									: 'Will be auto-generated when published'}
						/>
					</div>
				</Card>

				<!-- Artists -->
				<Card variant="glass" padding="md">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-white">Artists</h3>
						{#if isEditable}
							<Button size="sm" onclick={openAddArtist}>
								<PlusOutline class="w-4 h-4" /> Add Artist
							</Button>
						{/if}
					</div>

					<ArtistList
						{artists}
						editable={isEditable}
						onedit={openEditArtist}
						onremove={removeArtist}
						emptyMessage="No artists added yet"
						resolveName={getArtistNameById}
					/>
				</Card>

				<!-- Songs -->
				<Card variant="glass" padding="md">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-white">Songs</h3>
						<Badge color="gray">{songs.length} song{songs.length !== 1 ? 's' : ''}</Badge>
					</div>

					<div class="space-y-2">
						{#each songs as song, index}
							<div
								class="group flex items-center gap-4 p-3 bg-gray-900/50 rounded-xl border border-gray-700/50"
							>
								<div class="flex items-center gap-3">
									<span class="w-6 text-center text-sm text-gray-500 font-medium">{index + 1}</span>
									<AudioPlayer songId={song._id} size="sm" />
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-white font-medium truncate">{song.title}</p>
									<p class="text-sm text-gray-400 truncate">
										{song.artists
											.filter((a) => a.type === 'PRIMARY')
											.map((a) => ('name' in a ? a.name : getArtistNameById(a._id) || a._id))
											.join(', ') || 'No artists'}
									</p>
								</div>
								<div class="flex items-center gap-2">
									{#if song.explicit}
										<Badge color="red" size="sm">E</Badge>
									{/if}
									{#if song.instrumental}
										<Badge color="blue" size="sm">Inst</Badge>
									{/if}
									{#if song.isrc}
										<span class="text-xs text-gray-500 font-mono">{song.isrc}</span>
									{/if}
									{#if isEditable}
										<IconButton
											onclick={() => openEditSong(index)}
											class="opacity-0 group-hover:opacity-100 transition-opacity"
										>
											<EditOutline class="w-4 h-4" />
										</IconButton>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</Card>

				<!-- Share & Distribution (For Published/Edit Under Review Drops) -->
				{#if drop?.type === 'PUBLISHED' || drop?.type === 'EDIT_UNDER_REVIEW'}
					<Card variant="glass" padding="md">
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-lg font-semibold text-white">Share & Distribution</h3>
							{#if share}
								<Badge color="green">Active</Badge>
							{/if}
						</div>

						<div class="space-y-4">
							{#if share}
								<!-- Share URL Display -->
								<div class="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
									<div
										class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
									>
										<div class="flex-1 min-w-0 space-y-1">
											<p class="text-xs text-green-400">Share URL</p>
											<p class="text-white font-mono text-sm break-all">
												{window.location.origin}/s/{share.slug}
											</p>
											{#if share.services && Object.keys(share.services).length > 0}
												<p class="text-xs text-gray-400 mt-2">
													Streaming on: {Object.keys(share.services).join(', ')}
												</p>
											{/if}
										</div>
										<div class="flex gap-2">
											<Button variant="secondary" onclick={copyShareUrl} size="sm">
												Copy Link
											</Button>
											<Button
												variant="danger"
												onclick={deleteShare}
												disabled={shareLoading}
												size="sm"
											>
												Delete
											</Button>
										</div>
									</div>
								</div>
							{:else}
								<div class="text-center py-8">
									<p class="text-gray-400 mb-4">
										Create a shareable landing page for your release with streaming platform links.
									</p>
									<Button onclick={createShare} disabled={shareLoading} loading={shareLoading}>
										Create Share Link
									</Button>
								</div>
							{/if}
						</div>
					</Card>
				{/if}

				<!-- Comments -->
				<Card variant="glass" padding="md">
					<h3 class="text-lg font-semibold text-white mb-4">Comments for Review Team</h3>
					<Textarea
						bind:value={comments}
						placeholder="Beats/samples used, rights information, special notes..."
						rows={3}
						disabled={!isEditable}
						oninput={markChanged}
					/>
				</Card>

				<!-- Save Button -->
				{#if isEditable}
					<div class="flex justify-end gap-3">
						{#if hasChanges}
							<Button variant="secondary" onclick={loadDrop} disabled={saving}>
								Discard Changes
							</Button>
						{/if}
						<Button onclick={saveDrop} disabled={saving || !hasChanges} loading={saving}>
							{saving ? 'Saving...' : 'Save Changes'}
						</Button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Artist Modal -->
<ArtistModal
	bind:open={showArtistModal}
	artist={editingArtist}
	onclose={() => (showArtistModal = false)}
	onsave={handleSaveArtist}
/>

<!-- Status Change Confirmation Modal -->
<Modal bind:open={showStatusChangeModal} title="Confirm Status Change" size="md">
	<div class="space-y-4">
		<div class="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
			<ExclamationCircleOutline class="w-6 h-6 text-yellow-400 mt-0.5 flex-shrink-0" />
			<p class="text-white">{getStatusChangeMessage(pendingStatusChange, drop?.type)}</p>
		</div>
	</div>

	{#snippet footer()}
		<Button
			variant="secondary"
			onclick={() => {
				showStatusChangeModal = false;
				pendingStatusChange = null;
			}}
		>
			Cancel
		</Button>
		<Button
			variant={pendingStatusChange === 'TAKEDOWN_REQUESTED' ? 'danger' : 'primary'}
			onclick={confirmStatusChange}
			disabled={saving}
		>
			Confirm
		</Button>
	{/snippet}
</Modal>

<!-- Song Edit Modal -->
<Modal bind:open={showSongModal} title="Edit Song" size="xl" class="bg-gray-800">
	<div class="space-y-6">
		<!-- Song Title -->
		<Input
			bind:value={tempSong.title}
			label="Song Title"
			placeholder="Enter song title"
			disabled={!isEditable}
		/>

		<!-- Genre Section -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<Select bind:value={tempSong.primaryGenre} label="Primary Genre" disabled={!isEditable}>
				<option value="">Select primary genre...</option>
				{#each primaryGenres as genre}
					<option value={genre}>{genre}</option>
				{/each}
			</Select>

			<Select
				bind:value={tempSong.secondaryGenre}
				label="Secondary Genre"
				disabled={!isEditable || !tempSong.primaryGenre}
			>
				<option value="">Select secondary genre...</option>
				{#if tempSong.primaryGenre}
					{#each tempSongSecondaryGenreOptions as genre}
						<option value={genre}>{genre}</option>
					{/each}
				{/if}
			</Select>
		</div>

		<!-- Content Flags -->
		<div>
			<span class="block text-sm font-medium text-white mb-3">Content Flags</span>
			<div class="flex gap-6">
				<Toggle bind:checked={tempSong.explicit} label="Explicit Content" disabled={!isEditable} />
				<Toggle bind:checked={tempSong.instrumental} label="Instrumental" disabled={!isEditable} />
			</div>
		</div>

		<!-- Song Artists -->
		<ArtistList
			artists={tempSong.artists}
			editable={isEditable}
			onadd={openAddSongArtist}
			onedit={openEditSongArtist}
			onremove={removeSongArtist}
			emptyMessage="No artists added yet"
			compact={true}
			resolveName={getArtistNameById}
		/>

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
						value={tempSong.year?.toString() ?? ''}
						oninput={(e) => {
							const val = (e.target as HTMLInputElement).value;
							tempSong.year = val ? parseInt(val, 10) : undefined;
						}}
						label="Recording Year"
						placeholder="YYYY"
						hint="Year when this song was originally recorded"
						disabled={!isEditable}
					/>
					<Select
						bind:value={tempSong.language}
						label="Language"
						hint="Language of the song (defaults to drop language)"
						disabled={!isEditable}
					>
						<option value="">Use drop language</option>
						{#each Object.entries(languages) as [code, name]}
							<option value={code}>{name}</option>
						{/each}
					</Select>
				</div>
				<Input
					bind:value={tempSong.isrc}
					label="ISRC Code"
					placeholder="CC-XXX-YY-NNNNN"
					disabled={!isIsrcEditable}
					hint={!isIsrcEditable && tempSong.isrc
						? 'Cannot be changed after publishing'
						: 'International Standard Recording Code - leave empty to auto-generate'}
				/>
			</div>
		</details>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showSongModal = false)}>Cancel</Button>
		<Button onclick={saveSong} disabled={!tempSong.title.trim() || !isEditable}>Save Song</Button>
	{/snippet}
</Modal>

<!-- Song Artist Modal -->
<ArtistModal
	bind:open={showSongArtistModal}
	artist={editingSongArtist}
	onclose={() => (showSongArtistModal = false)}
	onsave={handleSaveSongArtist}
	title={editingSongArtistIndex !== null ? 'Edit Song Artist' : 'Add Song Artist'}
/>
