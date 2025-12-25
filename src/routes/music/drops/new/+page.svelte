<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Modal, Spinner } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast';
	import {
		ArrowLeftOutline,
		ArrowRightOutline,
		PlusOutline,
		TrashBinOutline,
		UploadOutline,
		CheckCircleSolid,
		EditOutline,
		CloseOutline,
		MusicSolid,
		ImageOutline,
		ClipboardListSolid,
		ChevronDownOutline,
		ExclamationCircleOutline,
	} from 'flowbite-svelte-icons';

	// Shared UI components
	import { Button, Input, SearchableSelect, Textarea, Card, Badge, Alert } from '$lib/components/ui';
	import ArtistModal from '$lib/components/ArtistModal.svelte';
	import ArtistList from '$lib/components/ArtistList.svelte';
	import SongModal from '$lib/components/SongModal.svelte';
	import ImageCropper from '$lib/components/ImageCropper.svelte';

	import { getSecondaryGenres } from '$lib/data/genres';
	import { getLanguageName } from '$lib/data/languages';
	import { primaryGenreOptions, languageOptions, getSecondaryGenreOptions } from '$lib/data/options';
	import {
		createInitialDropState,
		stepOneSchema,
		stepTwoSchema,
		stepThreeSchema,
		type ArtistRef,
		type Song,
	} from '$lib/types/drop';
	import {
		getIdByDropsByMusic,
		getArtworkByDropByMusic,
		patchIdByDropsByMusic,
		getArtistsByMusic,
		postDropByDropsByMusic,
		postTypeByTypeByDropByMusic,
		getIdBySongsByMusic,
	} from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import { auth } from '$lib/stores/auth';
	import { uploadViaWebSocket as wsUpload } from '$lib/utils/wsUpload';
	import type {
		FullDrop,
		ArtistRef as ApiArtistRef,
		Song as ApiSong,
		Artist,
	} from '$lib/api/types.gen';

	// Get drop ID from URL - required
	const dropId = $page.url.searchParams.get('id');

	// Redirect if no ID provided
	if (!dropId) {
		goto('/music/drops');
	}

	// Redirect if email not verified
	$effect(() => {
		if (!$auth.user?.profile.verified.email) {
			goto('/music/drops');
		}
	});

	// Form state using Svelte 5 runes
	let formState = $state(createInitialDropState(dropId!));
	let initialLoading = $state(true);
	let loadError = $state<string | null>(null);
	let copyrightDisabled = $state(true); // Disable by default, enable based on copyrightEditable
	let allArtists = $state<Artist[]>([]); // For resolving artist IDs to names

	// Helper function to resolve artist name from ID
	function getArtistNameById(id: string): string | undefined {
		const artist = allArtists.find((a) => a._id === id);
		return artist?.name;
	}

	// Load existing drop data on mount
	onMount(async () => {
		if (!dropId) return;

		try {
			// Load all artists first for name resolution
			try {
				const artistsResponse = await getArtistsByMusic({
					headers: getAuthHeaders(),
				});
				if (artistsResponse.data) {
					allArtists = artistsResponse.data as Artist[];
				}
			} catch {
				toast.show('Failed to load artists', 'error');
			}

			const response = await getIdByDropsByMusic({
				path: { id: dropId },
				headers: getAuthHeaders(),
			});

			if (response.data) {
				const drop = response.data as unknown as FullDrop & {
					copyrightEditable?: boolean;
				};

				// Set copyright field disabled state based on copyrightEditable
				copyrightDisabled = !(drop.copyrightEditable ?? false);

				// Populate form state with existing data
				formState.title = drop.title || '';
				formState.release = drop.release || '';
				formState.language = drop.language || 'en';

				// Map API artists to form artists with name resolution
				formState.artists = drop.artists?.length
					? drop.artists.map((a: ApiArtistRef): ArtistRef => {
							if (a.type === 'PRIMARY' || a.type === 'FEATURING') {
								const _id = '_id' in a ? a._id : '';
								return { type: a.type, _id };
							} else {
								let name = 'name' in a ? a.name : '';
								// If we have an ID but no name, look it up
								if (!name && '_id' in a) {
									const artist = allArtists.find((art) => art._id === a._id);
									if (artist) name = artist.name;
								}
								return { type: a.type, name };
							}
						})
					: [];

				formState.primaryGenre = drop.primaryGenre || '';
				formState.secondaryGenre = drop.secondaryGenre || '';
				formState.gtin = drop.gtin || '';
				formState.compositionCopyright = drop.compositionCopyright || 'bbn.music';
				formState.soundRecordingCopyright = drop.soundRecordingCopyright || 'bbn.music';
				formState.artwork = drop.artwork || '';

				// Map API songs to form songs with artist name resolution
				formState.songs = drop.songs?.length
					? drop.songs.map((s: ApiSong) => {
							const songData: any = {
								_id: s._id,
								title: s.title,
								artists:
									s.artists?.map((a: ApiArtistRef): ArtistRef => {
										if (a.type === 'PRIMARY' || a.type === 'FEATURING') {
											const _id = '_id' in a ? a._id : '';
											return { type: a.type, _id };
										} else {
											let name = 'name' in a ? a.name : '';
											// If we have an ID but no name, look it up
											if (!name && '_id' in a) {
												const artist = allArtists.find((art) => art._id === a._id);
												if (artist) name = artist.name;
											}
											return { type: a.type, name };
										}
									}) || [],
								instrumental: !s.explicit, // API doesn't have instrumental, use inverse of explicit as default
								explicit: s.explicit,
								primaryGenre: s.primaryGenre,
								secondaryGenre: s.secondaryGenre,
								isrc: s.isrc,
							};

							// Preserve year and language from backend if available
							if ('year' in s) songData.year = (s as any).year;
							if ('language' in s) songData.language = (s as any).language;

							return songData;
						})
					: [];

				formState.comments = drop.comments || '';

				// Load artwork preview if exists
				if (drop.artwork) {
					try {
						const artworkResponse = await getArtworkByDropByMusic({
							path: { dropId },
							headers: getAuthHeaders(),
						});
						if (artworkResponse.data) {
							formState.artworkPreview = URL.createObjectURL(artworkResponse.data as Blob);
						}
					} catch {
						// Artwork load failed, ignore
					}
				}
			}
		} catch (e: any) {
			loadError = e?.error?.message || e?.message || 'Failed to load drop data';
		} finally {
			initialLoading = false;
		}
	});

	// Step configuration
	const steps = [
		{
			id: 1,
			label: 'Details',
			icon: ClipboardListSolid,
			description: 'Drop info & artists',
		},
		{ id: 2, label: 'Artwork', icon: ImageOutline, description: 'Artwork' },
		{ id: 3, label: 'Songs', icon: MusicSolid, description: 'Songs' },
		{
			id: 4,
			label: 'Review',
			icon: CheckCircleSolid,
			description: 'Submit for review',
		},
	];

	// Derived values
	const secondaryGenreOptions = $derived(getSecondaryGenres(formState.primaryGenre));
	const secondaryGenreSelectOptions = $derived(getSecondaryGenreOptions(formState.primaryGenre));

	// Modals
	let showArtistModal = $state(false);
	let showSongModal = $state(false);
	let editingArtistIndex = $state<number | null>(null);
	let editingSongIndex = $state<number | null>(null);

	// Drag state for artwork
	let isDraggingArtwork = $state(false);

	// Advanced settings toggle
	let showAdvancedSettings = $state(false);

	// Release date warning modal
	let showReleaseDateWarning = $state(false);

	// Duplicate song detection
	let showDuplicateSongModal = $state(false);
	let duplicateSongId = $state<string | null>(null);
	let pendingDuplicateFile = $state<File | null>(null);
	let duplicateSongDetails = $state<{
		title: string;
		artists: ArtistRef[];
		isrc?: string;
		primaryGenre: string;
		secondaryGenre: string;
		year?: number;
		language: string;
		explicit: boolean;
		instrumental: boolean;
	} | null>(null);
	let loadingDuplicateSong = $state(false);

	// Editing state for artists
	let editingArtist = $state<ArtistRef | null>(null);

	// Song editing state - matches SongModal's expected prop type
	interface TempSong {
		_id?: string;
		file?: string;
		title: string;
		explicit: boolean;
		instrumental: boolean;
		artists: ArtistRef[];
		primaryGenre: string;
		secondaryGenre: string;
		isrc: string;
		year?: number;
		language: string;
	}

	let tempSong = $state<TempSong>({
		_id: crypto.randomUUID(),
		title: '',
		artists: [],
		instrumental: false,
		explicit: false,
		primaryGenre: '',
		secondaryGenre: '',
		isrc: '',
		year: undefined,
		language: 'en',
	});

	// Reset secondary genre when primary changes
	$effect(() => {
		if (formState.primaryGenre && !secondaryGenreOptions.includes(formState.secondaryGenre)) {
			formState.secondaryGenre = '';
		}
	});

	// Save drop data to backend
	async function saveDrop() {
		if (!dropId) return;

		try {
			// Build body object
			const body: any = {
				title: formState.title,
				release: formState.release,
				language: formState.language,
				primaryGenre: formState.primaryGenre,
				secondaryGenre: formState.secondaryGenre,
				artists: formState.artists,
				compositionCopyright: formState.compositionCopyright,
				soundRecordingCopyright: formState.soundRecordingCopyright,
				comments: formState.comments,
			};

			// Only include gtin if it has a value
			if (formState.gtin) {
				body.gtin = formState.gtin;
			}

			// Include artwork if it has a valid ID
			if (formState.artwork) {
				body.artwork = formState.artwork;
			}

			// Map songs with required fields
			body.songs = formState.songs.map((song) => {
				// Use song-specific year/language if available, otherwise fall back to drop-level values
				const year =
					(song as any).year ??
					(formState.release
						? new Date(formState.release).getFullYear()
						: new Date().getFullYear());
				const language = (song as any).language ?? formState.language;

				const songData: any = {
					_id: song._id,
					file: song.file,
					title: song.title,
					artists: song.artists,
					explicit: song.explicit,
					instrumental: song.instrumental,
					year: year,
					language: language,
				};

				// Only include optional fields if they have values
				if (song.primaryGenre) songData.primaryGenre = song.primaryGenre;
				if (song.secondaryGenre) songData.secondaryGenre = song.secondaryGenre;
				if (song.isrc) songData.isrc = song.isrc;

				return songData;
			});

			const response = await patchIdByDropsByMusic({
				path: { id: dropId },
				headers: getAuthHeaders(),
				body,
			});

			// If we had new artists (with _id: null), refetch the artists list
			// so they can be resolved to names in the UI
			const hadNewArtists =
				formState.artists.some((a) => (a as any)._id === null) ||
				formState.songs.some((s) => s.artists?.some((a) => (a as any)._id === null));

			if (hadNewArtists && response.data) {
				// Refetch artists to get the newly created ones
				try {
					const artistsResponse = await getArtistsByMusic({
						headers: getAuthHeaders(),
					});
					if (artistsResponse.data) {
						allArtists = artistsResponse.data as Artist[];
					}
				} catch {
					// Non-critical, continue without updated artists list
				}

				// Update formState with the new artist IDs from the response
				const updatedDrop = response.data as any;
				if (updatedDrop.artists) {
					formState.artists = updatedDrop.artists.map((a: any) => {
						if (a.type === 'PRIMARY' || a.type === 'FEATURING') {
							return { type: a.type, _id: a._id };
						} else {
							return { type: a.type, name: a.name || '' };
						}
					});
				}
				if (updatedDrop.songs) {
					formState.songs = formState.songs.map((song, idx) => {
						const updatedSong = updatedDrop.songs[idx];
						if (updatedSong?.artists) {
							return {
								...song,
								_id: updatedSong._id || song._id,
								artists: updatedSong.artists.map((a: any) => {
									if (a.type === 'PRIMARY' || a.type === 'FEATURING') {
										return { type: a.type, _id: a._id };
									} else {
										return { type: a.type, name: a.name || '' };
									}
								}),
							};
						}
						return song;
					});
				}
			}
		} catch (e: any) {
			const errorMessage = e?.error?.message || e?.message || 'Unknown error';
			toast.show(`Failed to save progress: ${errorMessage}`, 'error');
			throw e; // Re-throw to prevent navigation
		}
	}

	// Validation
	function validateStep(step: number): boolean {
		formState.errors = {};

		try {
			const data = {
				title: formState.title,
				release: formState.release,
				language: formState.language,
				primaryGenre: formState.primaryGenre,
				secondaryGenre: formState.secondaryGenre,
				artists: formState.artists,
				compositionCopyright: formState.compositionCopyright,
				soundRecordingCopyright: formState.soundRecordingCopyright,
				gtin: formState.gtin || undefined,
				artwork: formState.artwork || undefined,
				songs: formState.songs,
			};

			if (step === 1) stepOneSchema.parse(data);
			else if (step === 2) stepTwoSchema.parse(data);
			else if (step === 3) stepThreeSchema.parse(data);

			return true;
		} catch (error: any) {
			if (error.issues) {
				error.issues.forEach((err: any) => {
					const field = err.path.join('.');
					// Only keep the first error per field (refinements run in order)
					if (!formState.errors[field]) {
						formState.errors[field] = err.message;
					}

					// Auto-expand advanced settings if there are errors in those fields
					if (
						field === 'compositionCopyright' ||
						field === 'soundRecordingCopyright' ||
						field === 'gtin'
					) {
						showAdvancedSettings = true;
					}
				});
			}
			return false;
		}
	}

	async function nextStep() {
		if (validateStep(formState.currentStep)) {
			if (formState.currentStep === 1 && formState.release) {
				const releaseDate = new Date(formState.release);
				const now = new Date();
				const fourteenDaysFromNow = new Date();
				fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

				if (releaseDate >= now && releaseDate <= fourteenDaysFromNow) {
					showReleaseDateWarning = true;
					return;
				}
			}

			// Save progress before moving to next step
			try {
				await saveDrop();
				// Only advance if save was successful
				formState.currentStep++;
			} catch (e) {
				// Error already shown in saveDrop via toast
				// DO NOT advance to next step if save failed
				return; // Explicitly return to prevent any further execution
			}
		}
	}

	async function proceedWithShortNotice() {
		showReleaseDateWarning = false;

		// Save progress before moving to next step
		try {
			await saveDrop();
			// Only advance if save was successful
			formState.currentStep++;
		} catch (e) {
			// Error already shown in saveDrop via toast
			// DO NOT advance to next step if save failed
			return; // Explicitly return to prevent any further execution
		}
	}

	function prevStep() {
		if (formState.currentStep > 1) {
			formState.currentStep--;
			formState.errors = {};
		}
	}

	function goToStep(step: number) {
		if (step < formState.currentStep) {
			formState.currentStep = step;
			formState.errors = {};
		}
	}

	// Artist management
	function openAddArtist() {
		editingArtist = null;
		editingArtistIndex = null;
		showArtistModal = true;
	}

	function openEditArtist(index: number) {
		editingArtist = formState.artists[index];
		editingArtistIndex = index;
		showArtistModal = true;
	}

	function handleSaveArtist(artist: ArtistRef) {
		// Check for duplicates
		const isDuplicate = formState.artists.some((a, index) => {
			if (editingArtistIndex !== null && index === editingArtistIndex) return false;
			if (a.type !== artist.type) return false;

			// Check based on artist type (discriminated union)
			if (
				(a.type === 'PRIMARY' || a.type === 'FEATURING') &&
				(artist.type === 'PRIMARY' || artist.type === 'FEATURING')
			) {
				return a._id === artist._id;
			} else if (
				(a.type === 'SONGWRITER' || a.type === 'PRODUCER') &&
				(artist.type === 'SONGWRITER' || artist.type === 'PRODUCER')
			) {
				return a.name.toLowerCase() === artist.name.toLowerCase();
			}
			return false;
		});

		if (isDuplicate) {
			toast.show(
				`This artist is already added as a ${getArtistTypeLabel(artist.type).toLowerCase()}`,
				'warning',
			);
			return;
		}

		if (editingArtistIndex !== null) {
			formState.artists[editingArtistIndex] = artist;
		} else {
			formState.artists = [...formState.artists, artist];
		}
		showArtistModal = false;
	}

	function removeArtist(index: number) {
		formState.artists = formState.artists.filter((_, i) => i !== index);
	}

	// Song management
	let uploadingSong = $state(false);
	let songUploadProgress = $state(0);
	let songFileUploaded = $state(false);
	let uploadedSongFilename = $state<string>('');

	function openAddSong() {
		// Extract year from release date, default to current year
		const year = formState.release
			? new Date(formState.release).getFullYear()
			: new Date().getFullYear();

		tempSong = {
			_id: crypto.randomUUID(),
			title: '',
			artists: [...formState.artists],
			instrumental: false,
			explicit: false,
			primaryGenre: formState.primaryGenre || '',
			secondaryGenre: formState.secondaryGenre || '',
			isrc: '',
			year: year,
			language: formState.language || 'en',
		};
		editingSongIndex = null;
		uploadingSong = false;
		songUploadProgress = 0;
		songFileUploaded = false;
		uploadedSongFilename = '';
		showSongModal = true;
	}

	function openEditSong(index: number) {
		const song = formState.songs[index];
		// Extract year from release date, default to current year (fallback if song doesn't have year)
		const defaultYear = formState.release
			? new Date(formState.release).getFullYear()
			: new Date().getFullYear();

		tempSong = {
			...song,
			primaryGenre: song.primaryGenre || '',
			secondaryGenre: song.secondaryGenre || '',
			isrc: song.isrc || '', // Ensure all optional strings are never undefined
			// Preserve song's existing year/language if available, otherwise use drop-level defaults
			year: (song as any).year ?? defaultYear,
			language: (song as any).language ?? (formState.language || 'en'),
		};
		editingSongIndex = index;
		songFileUploaded = true; // Existing songs already have audio uploaded
		uploadedSongFilename = song.file || 'Previously uploaded file';
		showSongModal = true;
	}

	function saveSong() {
		// Validate at least one artist
		if (!tempSong.artists || tempSong.artists.length === 0) {
			toast.show('Please add at least one artist to the song', 'error');
			return;
		}

		const song: Song & { year?: number; language?: string } = {
			_id: tempSong._id ?? crypto.randomUUID(),
			file: tempSong.file,
			title: tempSong.title ?? '',
			artists: tempSong.artists ?? [],
			instrumental: tempSong.instrumental ?? false,
			explicit: tempSong.explicit ?? false,
			primaryGenre: tempSong.primaryGenre,
			secondaryGenre: tempSong.secondaryGenre,
			isrc: tempSong.isrc,
			year: tempSong.year,
			language: tempSong.language,
		};

		if (editingSongIndex !== null) {
			formState.songs[editingSongIndex] = song as Song;
		} else {
			formState.songs = [...formState.songs, song as Song];
		}
		showSongModal = false;
	}

	function removeSong(index: number) {
		formState.songs = formState.songs.filter((_, i) => i !== index);
	}

	// Song drag and drop state
	let draggedSongIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let dropPosition = $state<'above' | 'below' | null>(null);

	function handleSongDragStart(e: DragEvent, index: number) {
		draggedSongIndex = index;
		// Set drag effect
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleSongDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		if (draggedSongIndex !== null && draggedSongIndex !== index) {
			dragOverIndex = index;
			// Determine if dropping above or below based on mouse position
			const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
			const midpoint = rect.top + rect.height / 2;
			dropPosition = e.clientY < midpoint ? 'above' : 'below';
		}
	}

	function handleSongDragLeave(e: DragEvent) {
		// Only clear if leaving the element entirely (not entering a child)
		const relatedTarget = e.relatedTarget as HTMLElement;
		if (!relatedTarget || !(e.currentTarget as HTMLElement).contains(relatedTarget)) {
			dragOverIndex = null;
			dropPosition = null;
		}
	}

	function handleSongDrop(index: number) {
		if (draggedSongIndex === null || draggedSongIndex === index) {
			draggedSongIndex = null;
			dragOverIndex = null;
			dropPosition = null;
			return;
		}

		const newSongs = [...formState.songs];
		const [draggedSong] = newSongs.splice(draggedSongIndex, 1);

		// Calculate insert position based on drop position and indices
		let insertIndex = index;
		if (dropPosition === 'below') {
			insertIndex = draggedSongIndex < index ? index : index + 1;
		} else {
			insertIndex = draggedSongIndex < index ? index - 1 : index;
		}
		insertIndex = Math.max(0, Math.min(insertIndex, newSongs.length));

		newSongs.splice(insertIndex, 0, draggedSong);
		formState.songs = newSongs;

		draggedSongIndex = null;
		dragOverIndex = null;
		dropPosition = null;
	}

	function handleSongDragEnd() {
		draggedSongIndex = null;
		dragOverIndex = null;
		dropPosition = null;
	}

	// Song upload
	function handleSongFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) processSongFile(file);
	}

	async function processSongFile(file: File) {
		if (!file.type.startsWith('audio/')) {
			toast.show('Please select an audio file', 'error');
			return;
		}

		// Clean up title from filename
		const cleanedTitle = file.name
			.replaceAll('_', ' ')
			.replaceAll('-', ' ')
			.replace(/\.[^/.]+$/, '');

		// Update temp song title if empty
		if (!tempSong.title) {
			tempSong.title = cleanedTitle;
		}

		uploadingSong = true;
		songUploadProgress = 0;

		try {
			// Step 1: Upload file via WebSocket and get file ID
			const fileId = await uploadSongViaWebSocket(file);

			// Check if this is a duplicate song
			if (fileId.startsWith('duplicate:')) {
				const existingSongId = fileId.substring('duplicate:'.length);
				duplicateSongId = existingSongId;
				pendingDuplicateFile = file;
				uploadingSong = false;
				songUploadProgress = 0;

				// Fetch existing song details
				loadingDuplicateSong = true;
				showDuplicateSongModal = true;
				try {
					const response = await getIdBySongsByMusic({
						path: { id: existingSongId },
						headers: getAuthHeaders(),
					});
					if (response.data) {
						duplicateSongDetails = {
							title: response.data.title,
							artists: response.data.artists as ArtistRef[],
							isrc: response.data.isrc,
							primaryGenre: response.data.primaryGenre,
							secondaryGenre: response.data.secondaryGenre,
							year: response.data.year,
							language: response.data.language,
							explicit: response.data.explicit,
							instrumental: response.data.instrumental,
						};
					}
				} catch {
					// Failed to fetch details, modal will show without them
				} finally {
					loadingDuplicateSong = false;
				}
				return;
			}

			// Step 2: Create song record in backend with the uploaded file
			await createSongRecord(fileId, cleanedTitle, file.name);
		} catch (e: any) {
			const errorMsg = e?.error?.message || e?.message || 'Failed to upload song';
			toast.show(errorMsg, 'error');
			uploadingSong = false;
			songUploadProgress = 0;
		}
	}

	async function createSongRecord(fileId: string, cleanedTitle: string, originalFilename: string) {
		try {
			const response = await postDropByDropsByMusic({
				path: { dropId: dropId! },
				headers: getAuthHeaders(),
				body: {
					file: fileId,
					filename: cleanedTitle,
				},
			});

			if (!response.data) {
				throw new Error('Failed to create song record');
			}

			// Update tempSong with the backend-returned song data
			const createdSong = response.data;
			tempSong._id = createdSong._id;
			tempSong.file = createdSong.file;
			tempSong.title = tempSong.title || createdSong.title;
			// Preserve any metadata returned from backend
			tempSong.year = createdSong.year;
			tempSong.language = createdSong.language;

			songFileUploaded = true;
			uploadedSongFilename = originalFilename;
			toast.show('Song uploaded successfully', 'success');
		} finally {
			uploadingSong = false;
			songUploadProgress = 0;
		}
	}

	async function handleDuplicateSongConfirm() {
		if (!duplicateSongId || !pendingDuplicateFile) return;

		const file = pendingDuplicateFile;
		const cleanedTitle = file.name
			.replaceAll('_', ' ')
			.replaceAll('-', ' ')
			.replace(/\.[^/.]+$/, '');

		// Pre-populate tempSong with existing song data if available
		if (duplicateSongDetails) {
			tempSong.title = duplicateSongDetails.title || tempSong.title || cleanedTitle;
			if (duplicateSongDetails.artists.length > 0) {
				tempSong.artists = [...duplicateSongDetails.artists];
			}
			tempSong.isrc = duplicateSongDetails.isrc || tempSong.isrc;
			tempSong.primaryGenre = duplicateSongDetails.primaryGenre || tempSong.primaryGenre;
			tempSong.secondaryGenre = duplicateSongDetails.secondaryGenre || tempSong.secondaryGenre;
			tempSong.year = duplicateSongDetails.year ?? tempSong.year;
			tempSong.language = duplicateSongDetails.language || tempSong.language;
			tempSong.explicit = duplicateSongDetails.explicit;
			tempSong.instrumental = duplicateSongDetails.instrumental;
		}

		showDuplicateSongModal = false;
		uploadingSong = true;

		try {
			await createSongRecord(duplicateSongId, tempSong.title || cleanedTitle, file.name);
		} catch (e: any) {
			const errorMsg = e?.error?.message || e?.message || 'Failed to add song';
			toast.show(errorMsg, 'error');
		} finally {
			duplicateSongId = null;
			pendingDuplicateFile = null;
			duplicateSongDetails = null;
		}
	}

	function handleDuplicateSongCancel() {
		showDuplicateSongModal = false;
		duplicateSongId = null;
		pendingDuplicateFile = null;
		duplicateSongDetails = null;

		// Reset song modal state so user can try a different file
		tempSong.title = '';
		songFileUploaded = false;
		uploadedSongFilename = '';
	}

	async function uploadSongViaWebSocket(file: File): Promise<string> {
		return wsUpload({
			path: 'api/@bbn/music/songs/upload',
			file,
			onProgress: (percent) => {
				songUploadProgress = percent;
			},
		});
	}

	// Artwork upload
	let uploadingArtwork = $state(false);

	// Image cropper state
	let showCropper = $state(false);
	let cropperFile = $state<File | null>(null);

	function handleArtworkUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) processArtworkFile(file);
	}

	async function processArtworkFile(file: File) {
		if (!file.type.startsWith('image/')) return;

		// Check aspect ratio before uploading
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			if (img.naturalWidth !== img.naturalHeight) {
				// Not 1:1 - show cropper
				cropperFile = file;
				showCropper = true;
			} else {
				// Already 1:1 - upload directly
				formState.artworkPreview = url;
				uploadArtwork(file);
			}
		};
		img.src = url;
	}

	function handleCropComplete(blob: Blob) {
		showCropper = false;
		cropperFile = null;
		const file = new File([blob], 'artwork.jpg', { type: 'image/jpeg' });
		formState.artworkPreview = URL.createObjectURL(blob);
		uploadArtwork(file);
	}

	function handleCropCancel() {
		showCropper = false;
		cropperFile = null;
	}

	async function uploadArtwork(file: File) {
		if (!dropId) return;

		uploadingArtwork = true;
		try {
			const artworkId = await wsUpload({
				path: `api/@bbn/music/drops/${dropId}/upload`,
				file,
			});
			formState.artwork = artworkId;
			toast.show('Artwork uploaded successfully', 'success');
		} catch (e: any) {
			const errorMsg = e?.error?.message || e?.message || 'Failed to upload artwork';
			toast.show(errorMsg, 'error');
			formState.artworkPreview = '';
			formState.artwork = '';
		} finally {
			uploadingArtwork = false;
		}
	}

	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDraggingArtwork = false;
		const file = event.dataTransfer?.files[0];
		if (file) await processArtworkFile(file);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDraggingArtwork = true;
	}

	function handleDragLeave() {
		isDraggingArtwork = false;
	}

	// Submit
	async function submitDrop() {
		if (!validateStep(3)) return;

		// Validate at least one song exists
		if (formState.songs.length === 0) {
			toast.show('You must have at least one song before submitting for review', 'error');
			return;
		}

		formState.isLoading = true;

		try {
			// Save any final changes
			await saveDrop();

			// Submit drop for review by changing type to UNDER_REVIEW
			await postTypeByTypeByDropByMusic({
				path: { dropId: dropId!, type: 'UNDER_REVIEW' },
				headers: getAuthHeaders(),
			});

			toast.show('Drop submitted for review!', 'success');
			goto('/music/drops');
		} catch (e: any) {
			const errorMsg = e?.error?.message || e?.message || 'Failed to submit drop';
			formState.errors['submit'] = errorMsg;
			toast.show(errorMsg, 'error');
		} finally {
			formState.isLoading = false;
		}
	}

	function getArtistTypeLabel(type: string): string {
		return type.charAt(0) + type.slice(1).toLowerCase();
	}

	function getArtistTypeColor(type: string): 'orange' | 'blue' | 'green' | 'purple' {
		switch (type) {
			case 'PRIMARY':
				return 'orange';
			case 'FEATURING':
				return 'blue';
			case 'SONGWRITER':
				return 'green';
			case 'PRODUCER':
				return 'purple';
			default:
				return 'orange';
		}
	}
</script>

<svelte:head>
	<title>Create New Drop - bbn.music</title>
</svelte:head>

<div class="min-h-screen max-w-4xl mx-auto px-4 py-8">
	<!-- Simple Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-white mb-1">Create New Drop</h1>
		<p class="text-gray-400">Share your music with the world</p>
	</div>

	{#if initialLoading}
		<div class="flex flex-col items-center justify-center py-24">
			<Spinner size="xl" class="mb-4" />
			<p class="text-gray-400">Loading drop data...</p>
		</div>
	{:else if loadError}
		<Card variant="default" padding="lg">
			<div class="text-center py-8">
				<p class="text-red-400 mb-4">{loadError}</p>
				<Button onclick={() => goto('/music/drops')}>Back to Drops</Button>
			</div>
		</Card>
	{:else}
		<!-- Minimal Stepper -->
		<div class="mb-10">
			<div class="flex items-center justify-between relative max-w-2xl mx-auto">
				<!-- Background progress line (offset by half circle width to align with circle centers) -->
				<div class="absolute top-4 left-4 right-4 h-0.5 bg-gray-700"></div>
				<!-- Active progress line -->
				<div
					class="absolute top-4 left-4 h-0.5 bg-orange-500 transition-all duration-500"
					style="width: calc({((formState.currentStep - 1) / 3) * 100}% - {((formState.currentStep -
						1) /
						3) *
						2}rem)"
				></div>

				{#each steps as step}
					{@const isActive = formState.currentStep === step.id}
					{@const isCompleted = formState.currentStep > step.id}
					{@const isClickable = step.id < formState.currentStep}

					<button
						type="button"
						class="relative z-10 flex flex-col items-center group transition-all duration-200 {isClickable
							? 'cursor-pointer'
							: 'cursor-default'}"
						onclick={() => isClickable && goToStep(step.id)}
						disabled={!isClickable}
					>
						<!-- Simple circle with number -->
						<div
							class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 border-2 {isCompleted
								? 'bg-orange-500 border-orange-500'
								: isActive
									? 'bg-orange-500 border-orange-500'
									: 'bg-gray-900 border-gray-600 group-hover:border-gray-500'}"
						>
							{#if isCompleted}
								<CheckCircleSolid class="w-4 h-4 text-white" />
							{:else}
								<span class="text-sm font-semibold {isActive ? 'text-white' : 'text-gray-500'}"
									>{step.id}</span
								>
							{/if}
						</div>

						<!-- Label -->
						<span
							class="mt-2 text-xs font-medium {isActive || isCompleted
								? 'text-white'
								: 'text-gray-500'} transition-colors"
						>
							{step.label}
						</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Global Error Alert (for submit errors only) -->
		{#if formState.errors['submit']}
			<div class="mb-6">
				<Alert variant="error" dismissible ondismiss={() => delete formState.errors['submit']}>
					{formState.errors['submit']}
				</Alert>
			</div>
		{/if}

		<!-- Step Content -->
		<Card variant="glass" padding="lg">
			{#if formState.currentStep === 1}
				<!-- Step 1: Basic Details -->
				<div class="space-y-8">
					<div>
						<h2 class="text-2xl font-bold text-white mb-1">Drop Details</h2>
						<p class="text-gray-400">Tell us about your drop</p>
					</div>

					<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div class="lg:col-span-2">
							<Input
								bind:value={formState.title}
								label="Title"
								placeholder="Drop title"
								required
								error={formState.errors['title']}
							/>
						</div>
						<div>
							<Input
								type="date"
								bind:value={formState.release}
								label="Release Date"
								required
								error={formState.errors['release']}
							/>
						</div>
					</div>

					<!-- Artists Section -->
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div>
								<h3 class="text-lg font-semibold text-white">Artists</h3>
								<p class="text-sm text-gray-400">
									Add primary artists, features, songwriters & producers
								</p>
							</div>
						</div>

						{#if formState.errors['artists']}
							<p class="text-sm text-red-400 mb-2">{formState.errors['artists']}</p>
						{/if}
						<ArtistList
							artists={formState.artists}
							editable
							onadd={openAddArtist}
							onedit={openEditArtist}
							onremove={removeArtist}
							emptyMessage="No artists yet. Click 'Add Artist' to get started."
							resolveName={getArtistNameById}
						/>
					</div>

					<!-- Genre Section -->
					<div class="space-y-4">
						<div>
							<h3 class="text-lg font-semibold text-white">Target Audience</h3>
							<p class="text-sm text-gray-400">Select genres to help fans discover your music</p>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<SearchableSelect
								bind:value={formState.primaryGenre}
								options={primaryGenreOptions}
								label="Primary Genre"
								placeholder="Select genre..."
								required
								error={formState.errors['primaryGenre']}
							/>

							<SearchableSelect
								bind:value={formState.secondaryGenre}
								options={secondaryGenreSelectOptions}
								label="Sub-genre"
								placeholder="Select sub-genre..."
								required
								disabled={!formState.primaryGenre}
								error={formState.errors['secondaryGenre']}
							/>

							<SearchableSelect
								bind:value={formState.language}
								options={languageOptions}
								label="Language"
								placeholder="Select language..."
								required
								error={formState.errors['language']}
							/>
						</div>
					</div>

					<!-- Advanced Settings Toggle -->
					<div class="border-t border-gray-700 pt-6">
						<button
							type="button"
							onclick={() => (showAdvancedSettings = !showAdvancedSettings)}
							class="flex items-center justify-between w-full p-4 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors border border-gray-700 hover:border-gray-600"
						>
							<div class="flex items-center gap-3">
								<div class="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
									<ClipboardListSolid class="w-4 h-4 text-gray-400" />
								</div>
								<div class="text-left">
									<h3 class="text-sm font-semibold text-white">Advanced Settings</h3>
									<p class="text-xs text-gray-400">Copyright information & UPC/EAN</p>
								</div>
							</div>
							<ChevronDownOutline
								class="w-5 h-5 text-gray-400 transition-transform {showAdvancedSettings
									? 'rotate-180'
									: ''}"
							/>
						</button>

						{#if showAdvancedSettings}
							<div class="mt-4 space-y-4 p-4 bg-gray-800/20 rounded-lg border border-gray-700">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Input
										bind:value={formState.compositionCopyright}
										label="Composition Copyright"
										required
										disabled={copyrightDisabled}
										error={formState.errors['compositionCopyright']}
									/>
									<Input
										bind:value={formState.soundRecordingCopyright}
										label="Sound Recording Copyright"
										required
										disabled={copyrightDisabled}
										error={formState.errors['soundRecordingCopyright']}
									/>
								</div>

								<div class="max-w-md">
									<Input
										bind:value={formState.gtin}
										label="UPC/EAN"
										placeholder="Leave empty to auto-generate"
										error={formState.errors['gtin']}
										hint="Optional - will be generated if not provided"
										inputmode="numeric"
										pattern="[0-9]*"
										oninput={(e) => {
											const input = e.currentTarget as HTMLInputElement;
											input.value = input.value.replace(/\D/g, '');
											formState.gtin = input.value;
										}}
									/>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{:else if formState.currentStep === 2}
				<!-- Step 2: Artwork -->
				<div class="space-y-8">
					<div class="text-center">
						<h2 class="text-3xl font-bold text-white mb-2">Artwork</h2>
						<p class="text-gray-400 text-lg">Upload a square, high-quality image</p>
						<p class="text-gray-500 text-sm mt-1">Recommended: 3000×3000px, JPG or PNG format</p>
					</div>

					<div class="flex justify-center">
						<div
							role="button"
							tabindex="0"
							class="relative w-96 h-96 rounded-3xl overflow-hidden {uploadingArtwork
								? 'cursor-wait'
								: 'cursor-pointer'} group transition-all duration-500 {isDraggingArtwork
								? 'ring-4 ring-orange-500 ring-offset-4 ring-offset-gray-900 scale-105 shadow-2xl shadow-orange-500/30'
								: 'hover:ring-2 hover:ring-orange-500/50 hover:scale-[1.02] shadow-xl'}"
							ondrop={handleDrop}
							ondragover={handleDragOver}
							ondragleave={handleDragLeave}
							onclick={() => !uploadingArtwork && document.getElementById('artwork')?.click()}
							onkeydown={(e) =>
								!uploadingArtwork &&
								e.key === 'Enter' &&
								document.getElementById('artwork')?.click()}
						>
							{#if uploadingArtwork}
								<!-- Loading overlay -->
								<div
									class="w-full h-full bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 flex flex-col items-center justify-center"
								>
									<Spinner size="xl" class="mb-4" />
									<p class="text-white font-semibold">Uploading artwork...</p>
								</div>
							{:else if formState.artworkPreview}
								<img
									src={formState.artworkPreview}
									alt="Artwork preview"
									class="w-full h-full object-cover"
								/>
								<div
									class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center"
								>
									<div
										class="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
									>
										<UploadOutline class="w-10 h-10 text-white" />
									</div>
									<p class="text-white font-bold text-lg">Change Artwork</p>
									<p class="text-gray-300 text-sm mt-1">Click or drop a new image</p>
								</div>
							{:else}
								<div
									class="w-full h-full bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 border-3 border-dashed {isDraggingArtwork
										? 'border-orange-500 bg-orange-500/5'
										: 'border-gray-600 group-hover:border-orange-500/50'} rounded-3xl flex flex-col items-center justify-center transition-all duration-300"
								>
									<div
										class="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-orange-500/30"
									>
										<ImageOutline class="w-12 h-12 text-orange-500" />
									</div>
									<p class="text-white font-bold text-xl mb-2">Drop your artwork here</p>
									<p class="text-gray-400">or click to browse files</p>
									<div class="mt-8 px-6 py-3 bg-gray-800/50 rounded-xl border border-gray-700">
										<p class="text-gray-400 text-sm">
											<span class="text-orange-400 font-semibold">3000×3000px</span> · JPG or PNG
										</p>
									</div>
								</div>
							{/if}
						</div>
					</div>

					<input
						type="file"
						id="artwork"
						accept="image/jpeg,image/png"
						onchange={handleArtworkUpload}
						class="hidden"
						aria-label="Upload artwork"
					/>

					<div class="flex flex-col items-center gap-4">
						<Button
							size="lg"
							onclick={() => document.getElementById('artwork')?.click()}
							disabled={uploadingArtwork}
						>
							<UploadOutline class="w-5 h-5" />
							{uploadingArtwork ? 'Uploading...' : 'Browse Files'}
						</Button>
						<div class="flex items-center gap-6 text-sm">
							<div class="flex items-center gap-2 text-gray-400">
								<CheckCircleSolid class="w-4 h-4 text-green-400" />
								<span>Square format</span>
							</div>
							<div class="flex items-center gap-2 text-gray-400">
								<CheckCircleSolid class="w-4 h-4 text-green-400" />
								<span>High resolution</span>
							</div>
							<div class="flex items-center gap-2 text-gray-400">
								<CheckCircleSolid class="w-4 h-4 text-green-400" />
								<span>No URLs or promo text</span>
							</div>
						</div>
					</div>
				</div>
			{:else if formState.currentStep === 3}
				<!-- Step 3: Songs -->
				<div class="space-y-6">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-2xl font-bold text-white mb-1">Songs</h2>
							<p class="text-gray-400">
								Add your songs ({formState.songs.length} song{formState.songs.length !== 1
									? 's'
									: ''})
							</p>
						</div>
						<Button onclick={openAddSong}>
							<PlusOutline class="w-4 h-4" /> Add Song
						</Button>
					</div>

					<div class="space-y-1" role="list">
						{#each formState.songs as song, index}
							<div class="relative">
								<!-- Drop indicator above -->
								{#if dragOverIndex === index && dropPosition === 'above'}
									<div
										class="absolute -top-1 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent rounded-full z-10"
									>
										<div
											class="absolute left-1/2 -translate-x-1/2 -top-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-gray-900"
										></div>
									</div>
								{/if}

								<div
									draggable="true"
									ondragstart={(e) => handleSongDragStart(e, index)}
									ondragover={(e) => handleSongDragOver(e, index)}
									ondragleave={(e) => handleSongDragLeave(e)}
									ondrop={() => handleSongDrop(index)}
									ondragend={handleSongDragEnd}
									class="group flex items-center gap-4 p-5 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border-2 transition-all duration-200 select-none
										{draggedSongIndex === index
										? 'opacity-40 scale-[0.98] border-gray-600 shadow-none'
										: draggedSongIndex !== null
											? 'border-gray-700/50'
											: 'border-gray-700/50 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10'}
										{draggedSongIndex === null ? 'cursor-grab' : 'cursor-grabbing'}"
									role="listitem"
									aria-grabbed={draggedSongIndex === index}
								>
									<!-- Drag handle - grip pattern -->
									<div
										class="flex-shrink-0 flex flex-col gap-1 p-1 -ml-1 text-gray-600 hover:text-gray-400 transition-colors"
									>
										<div class="flex gap-1">
											<div class="w-1 h-1 rounded-full bg-current"></div>
											<div class="w-1 h-1 rounded-full bg-current"></div>
										</div>
										<div class="flex gap-1">
											<div class="w-1 h-1 rounded-full bg-current"></div>
											<div class="w-1 h-1 rounded-full bg-current"></div>
										</div>
										<div class="flex gap-1">
											<div class="w-1 h-1 rounded-full bg-current"></div>
											<div class="w-1 h-1 rounded-full bg-current"></div>
										</div>
									</div>
									<div
										class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/30 to-orange-600/30 flex items-center justify-center text-orange-400 font-bold text-lg shadow-lg border border-orange-500/20 flex-shrink-0"
									>
										{index + 1}
									</div>
									<MusicSolid class="w-5 h-5 text-gray-500 flex-shrink-0" />
									<div class="flex-1 min-w-0">
										<p class="text-white font-semibold truncate text-lg">
											{song.title || 'Untitled Song'}
										</p>
										<p class="text-sm text-gray-400 truncate">
											{song.artists
												.filter((a): a is { type: 'PRIMARY'; _id: string } => a.type === 'PRIMARY')
												.map((a) => {
													const artist = allArtists.find((art) => art._id === a._id);
													return artist?.name || a._id;
												})
												.join(', ') || 'No artists assigned'}
										</p>
									</div>
									<div class="flex items-center gap-2 flex-shrink-0">
										{#if song.explicit}
											<Badge color="red" size="sm">Explicit</Badge>
										{/if}
										{#if song.instrumental}
											<Badge color="blue" size="sm">Instrumental</Badge>
										{/if}
									</div>
									<div
										class="flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex-shrink-0"
									>
										<button
											onclick={() => openEditSong(index)}
											class="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white/10"
											aria-label="Edit song"
										>
											<EditOutline
												class="w-4 h-4 text-gray-400 hover:text-white transition-colors"
											/>
										</button>
										<button
											onclick={() => removeSong(index)}
											class="p-2 hover:bg-red-500/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-red-500/10"
											aria-label="Remove song"
										>
											<TrashBinOutline
												class="w-4 h-4 text-gray-400 hover:text-red-400 transition-colors"
											/>
										</button>
									</div>
								</div>

								<!-- Drop indicator below -->
								{#if dragOverIndex === index && dropPosition === 'below'}
									<div
										class="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent rounded-full z-10"
									>
										<div
											class="absolute left-1/2 -translate-x-1/2 -top-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-gray-900"
										></div>
									</div>
								{/if}
							</div>
						{/each}

						{#if formState.songs.length === 0}
							<div
								class="text-center py-20 border-2 border-dashed border-gray-700 rounded-3xl bg-gradient-to-br from-gray-800/30 to-gray-900/30"
							>
								<div
									class="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 flex items-center justify-center mx-auto mb-5 shadow-lg"
								>
									<MusicSolid class="w-10 h-10 text-gray-500" />
								</div>
								<p class="text-white font-bold text-lg mb-2">No songs yet</p>
								<p class="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
									Add your first song to start building your drop
								</p>
								<Button size="lg" onclick={openAddSong}>
									<PlusOutline class="w-5 h-5" /> Add Your First Song
								</Button>
							</div>
						{/if}
					</div>
				</div>
			{:else if formState.currentStep === 4}
				<!-- Step 4: Review & Submit -->
				<div class="space-y-8">
					<div class="text-center">
						<div
							class="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 flex items-center justify-center mx-auto mb-4"
						>
							<CheckCircleSolid class="w-8 h-8 text-white" />
						</div>
						<h2 class="text-2xl font-bold text-white mb-1">Ready to Submit!</h2>
						<p class="text-gray-400">Review your drop details before submitting</p>
					</div>

					<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
						<div class="space-y-6">
							<Card variant="default" padding="md">
								<div class="flex items-center gap-3 pb-3 border-b border-gray-700 mb-4">
									<ClipboardListSolid class="w-5 h-5 text-orange-500" />
									<h3 class="font-semibold text-white">Release Details</h3>
								</div>
								<div class="grid grid-cols-2 gap-4 text-sm">
									<div>
										<p class="text-gray-500">Title</p>
										<p class="text-white font-medium">{formState.title}</p>
									</div>
									<div>
										<p class="text-gray-500">Release Date</p>
										<p class="text-white">{formState.release}</p>
									</div>
									<div>
										<p class="text-gray-500">Genre</p>
										<p class="text-white">{formState.primaryGenre} / {formState.secondaryGenre}</p>
									</div>
									<div>
										<p class="text-gray-500">Language</p>
										<p class="text-white">{getLanguageName(formState.language)}</p>
									</div>
								</div>
							</Card>

							<Card variant="default" padding="md">
								<div class="flex items-center gap-3 pb-3 border-b border-gray-700 mb-4">
									<MusicSolid class="w-5 h-5 text-orange-500" />
									<h3 class="font-semibold text-white">Songs</h3>
									<Badge color="gray">{formState.songs.length} songs</Badge>
								</div>
								<div class="space-y-2 max-h-48 overflow-y-auto">
									{#each formState.songs as song, index}
										<div class="flex items-center gap-3 text-sm">
											<span class="text-gray-500 w-6">{index + 1}.</span>
											<span class="text-white flex-1 truncate">{song.title}</span>
											{#if song.explicit}
												<Badge color="red" size="sm">E</Badge>
											{/if}
										</div>
									{/each}
								</div>
							</Card>
						</div>

						<div class="space-y-6">
							{#if formState.artworkPreview}
								<div class="flex justify-center lg:justify-start">
									<img
										src={formState.artworkPreview}
										alt="Artwork"
										class="w-48 h-48 object-cover rounded-xl shadow-xl"
									/>
								</div>
							{/if}

							<Textarea
								bind:value={formState.comments}
								label="Comments for Review Team"
								placeholder="Beats/samples used, rights information, special notes..."
								rows={4}
							/>
						</div>
					</div>
				</div>
			{/if}

			<!-- Navigation -->
			<div class="flex justify-between mt-8 pt-6 border-t border-gray-700/50">
				{#if formState.currentStep === 1}
					<Button variant="secondary" href="/music/drops">
						<CloseOutline class="w-4 h-4" /> Cancel
					</Button>
				{:else}
					<Button variant="secondary" onclick={prevStep}>
						<ArrowLeftOutline class="w-4 h-4" /> Back
					</Button>
				{/if}

				{#if formState.currentStep < 4}
					<Button size="lg" onclick={nextStep}>
						Next <ArrowRightOutline class="w-4 h-4" />
					</Button>
				{:else}
					<Button
						size="lg"
						onclick={submitDrop}
						disabled={formState.isLoading}
						loading={formState.isLoading}
					>
						{#if formState.isLoading}
							Submitting...
						{:else}
							Submit for Review <CheckCircleSolid class="w-4 h-4" />
						{/if}
					</Button>
				{/if}
			</div>
		</Card>
	{/if}
</div>

<!-- Artist Modal -->
<ArtistModal
	bind:open={showArtistModal}
	artist={editingArtist}
	onclose={() => (showArtistModal = false)}
	onsave={handleSaveArtist}
/>

<!-- Song Modal -->
<SongModal
	bind:open={showSongModal}
	title={editingSongIndex !== null ? 'Edit Song' : 'Add New Song'}
	bind:song={tempSong}
	isUploading={uploadingSong}
	uploadProgress={songUploadProgress}
	fileUploaded={songFileUploaded}
	uploadedFilename={uploadedSongFilename}
	requiresFile={editingSongIndex === null}
	resolveName={getArtistNameById}
	onclose={() => (showSongModal = false)}
	onsave={saveSong}
	onfileselect={processSongFile}
/>

<!-- Image Cropper Modal -->
<ImageCropper
	bind:open={showCropper}
	imageFile={cropperFile}
	oncrop={handleCropComplete}
	oncancel={handleCropCancel}
/>

<!-- Release Date Warning Modal -->
<Modal bind:open={showReleaseDateWarning} title="Short Notice Warning" size="md">
	<div class="space-y-4">
		<div class="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
			<ExclamationCircleOutline class="w-6 h-6 text-yellow-400 mt-0.5 flex-shrink-0" />
			<div>
				<p class="text-white font-medium mb-2">Your release date is within 14 days</p>
				<p class="text-gray-300 text-sm">
					Drops submitted with less than 14 days notice may not be available on all platforms by
					your target date. Some stores require longer lead times for processing.
				</p>
			</div>
		</div>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showReleaseDateWarning = false)}>Go Back</Button>
		<Button onclick={proceedWithShortNotice}>Proceed Anyway</Button>
	{/snippet}
</Modal>

<!-- Duplicate Song Modal -->
<Modal bind:open={showDuplicateSongModal} title="Duplicate Song Detected" size="md">
	<div class="space-y-4">
		<div class="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
			<ExclamationCircleOutline class="w-6 h-6 text-blue-400 mt-0.5 flex-shrink-0" />
			<div>
				<p class="text-white font-medium mb-2">This audio file already exists</p>
				<p class="text-gray-300 text-sm">
					This exact audio file has already been uploaded to the system. Would you like to add the
					existing song to this drop?
				</p>
			</div>
		</div>

		{#if loadingDuplicateSong}
			<div class="flex items-center justify-center py-4">
				<Spinner size="md" />
			</div>
		{:else if duplicateSongDetails}
			<div class="p-4 bg-gray-800 rounded-lg">
				<p class="text-sm text-gray-400 mb-1">Existing song:</p>
				<p class="text-white font-medium">{duplicateSongDetails.title}</p>
				{#if duplicateSongDetails.artists.length > 0}
					<p class="text-sm text-gray-400 mt-1">
						{duplicateSongDetails.artists
							.filter((a) => a.type === 'PRIMARY' || a.type === 'FEATURING')
							.map((a) => ('name' in a ? a.name : getArtistNameById(a._id ?? '') ?? 'Unknown'))
							.join(', ')}
					</p>
				{/if}
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={handleDuplicateSongCancel}>Cancel</Button>
		<Button onclick={handleDuplicateSongConfirm} disabled={loadingDuplicateSong}>Add Existing Song</Button>
	{/snippet}
</Modal>
