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
		UserSolid,
		MusicSolid,
		ImageOutline,
		ClipboardListSolid,
		ChevronDownOutline,
		ExclamationCircleOutline,
	} from 'flowbite-svelte-icons';

	// Shared UI components
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
		ArtistSearch,
	} from '$lib/components/ui';

	import { primaryGenres, getSecondaryGenres } from '$lib/data/genres';
	import { languages, getLanguageName } from '$lib/data/languages';
	import {
		createInitialDropState,
		stepOneSchema,
		stepTwoSchema,
		stepThreeSchema,
		type ArtistRef,
		type ArtistType,
		type Song,
		artistTypes,
	} from '$lib/types/drop';
	import {
		getIdByDropsByMusic,
		getArtworkByDropByMusic,
		patchIdByDropsByMusic,
		getArtistsByMusic,
		postDropByDropsByMusic,
		postTypeByTypeByDropByMusic,
	} from '$lib/api/sdk.gen';
	import { getAuthHeaders, getBaseUrl } from '$lib/apiClient';
	import { auth } from '$lib/stores/auth';
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
		goto('/drops');
	}

	// Form state using Svelte 5 runes
	let formState = $state(createInitialDropState(dropId!));
	let initialLoading = $state(true);
	let loadError = $state<string | null>(null);
	let copyrightDisabled = $state(true); // Disable by default, enable based on copyrightEditable
	let allArtists = $state<Artist[]>([]); // For resolving artist IDs to names

	// Helper function to resolve artist name from ID
	function getArtistName(artistRef: ArtistRef): string {
		// If we have a name directly, use it
		if (artistRef.name) return artistRef.name;

		// If we have an ID, look it up in allArtists
		if (artistRef._id) {
			const artist = allArtists.find((a) => a._id === artistRef._id);
			if (artist) return artist.name;
			return artistRef._id; // Fallback to showing ID
		}

		return 'Unknown Artist';
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
			} catch (err) {
				console.error('Failed to load artists:', err);
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
					? drop.artists.map((a: ApiArtistRef) => {
							const _id = '_id' in a ? a._id : null;
							let name = 'name' in a ? a.name : undefined;

							// If we have an ID but no name, look it up
							if (_id && !name) {
								const artist = allArtists.find((art) => art._id === _id);
								if (artist) name = artist.name;
							}

							return {
								type: a.type,
								_id,
								name,
							};
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
									s.artists?.map((a: ApiArtistRef) => {
										const _id = '_id' in a ? a._id : null;
										let name = 'name' in a ? a.name : undefined;

										// If we have an ID but no name, look it up
										if (_id && !name) {
											const artist = allArtists.find((art) => art._id === _id);
											if (artist) name = artist.name;
										}

										return {
											type: a.type,
											_id,
											name,
										};
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

	// Temp artist/song for editing
	let tempArtist = $state<ArtistRef>({ type: 'PRIMARY', _id: null, name: '' });
	let tempArtistFirstName = $state('');
	let tempArtistLastName = $state('');
	let tempSong = $state<Partial<Song> & { year?: number; language?: string }>({
		_id: crypto.randomUUID(),
		title: '',
		artists: [],
		instrumental: false,
		explicit: false,
		year: undefined,
		language: undefined,
	});

	// Track previous values to prevent infinite loops
	let prevExplicit = $state(false);
	let prevInstrumental = $state(false);

	// Make explicit and instrumental mutually exclusive
	$effect(() => {
		// If explicit was just turned on, turn off instrumental
		if (tempSong.explicit && !prevExplicit && tempSong.instrumental) {
			tempSong.instrumental = false;
		}
		// If instrumental was just turned on, turn off explicit
		else if (tempSong.instrumental && !prevInstrumental && tempSong.explicit) {
			tempSong.explicit = false;
		}

		// Update previous values
		prevExplicit = tempSong.explicit ?? false;
		prevInstrumental = tempSong.instrumental ?? false;
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

			console.log('Saving drop with data:', JSON.stringify(body, null, 2));

			await patchIdByDropsByMusic({
				path: { id: dropId },
				headers: getAuthHeaders(),
				body,
			});
		} catch (e: any) {
			console.error('Failed to save drop:', e);
			console.error('Error details:', JSON.stringify(e, null, 2));
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
					formState.errors[field] = err.message;

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
				console.error('Failed to save before advancing step:', e);
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
			console.error('Failed to save before advancing step:', e);
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
		tempArtist = { type: 'PRIMARY', _id: null, name: '' };
		tempArtistFirstName = '';
		tempArtistLastName = '';
		editingArtistIndex = null;
		showArtistModal = true;
	}

	function openEditArtist(index: number) {
		const artist = formState.artists[index];
		tempArtist = { ...artist };

		// For producer/songwriter, split the name at the last space
		if ((artist.type === 'PRODUCER' || artist.type === 'SONGWRITER') && artist.name) {
			const lastSpaceIndex = artist.name.lastIndexOf(' ');
			if (lastSpaceIndex > 0) {
				tempArtistFirstName = artist.name.substring(0, lastSpaceIndex);
				tempArtistLastName = artist.name.substring(lastSpaceIndex + 1);
			} else {
				// No space found, put everything in first name
				tempArtistFirstName = artist.name;
				tempArtistLastName = '';
			}
		} else {
			tempArtistFirstName = '';
			tempArtistLastName = '';
		}

		editingArtistIndex = index;
		showArtistModal = true;
	}

	function saveArtist() {
		// For producer/songwriter, merge first and last name
		const artistToSave = { ...tempArtist };
		if (tempArtist.type === 'PRODUCER' || tempArtist.type === 'SONGWRITER') {
			const fullName = [tempArtistFirstName.trim(), tempArtistLastName.trim()]
				.filter(Boolean)
				.join(' ');
			artistToSave.name = fullName;
			artistToSave._id = null; // Producer/songwriter don't use artist refs
		}

		// Check for duplicates (same artist with same type)
		const isDuplicate = formState.artists.some((artist, index) => {
			// Skip the current artist if we're editing
			if (editingArtistIndex !== null && index === editingArtistIndex) return false;

			// Check if same type and same artist (by _id or name)
			if (artist.type === artistToSave.type) {
				if (artistToSave._id && artist._id === artistToSave._id) return true;
				if (artistToSave.name && artist.name?.toLowerCase() === artistToSave.name.toLowerCase())
					return true;
			}
			return false;
		});

		if (isDuplicate) {
			toast.show(
				`This artist is already added as a ${getArtistTypeLabel(artistToSave.type).toLowerCase()}`,
				'warning',
			);
			return;
		}

		if (editingArtistIndex !== null) {
			formState.artists[editingArtistIndex] = { ...artistToSave };
		} else {
			formState.artists = [...formState.artists, { ...artistToSave }];
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
		// Reset tracking variables
		prevExplicit = false;
		prevInstrumental = false;
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
		// Initialize tracking variables with current values
		prevExplicit = song.explicit ?? false;
		prevInstrumental = song.instrumental ?? false;
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

	// Song artist management
	let showSongArtistModal = $state(false);
	let tempSongArtist = $state<{
		type: ArtistType;
		_id: string | null;
		name: string;
	}>({ type: 'PRIMARY', _id: null, name: '' });
	let tempSongArtistFirstName = $state('');
	let tempSongArtistLastName = $state('');

	function openAddSongArtist() {
		tempSongArtist = { type: 'PRIMARY', _id: null, name: '' };
		tempSongArtistFirstName = '';
		tempSongArtistLastName = '';
		showSongArtistModal = true;
	}

	function saveSongArtist() {
		let artistName = tempSongArtist.name;
		let artistId = tempSongArtist._id;

		// For producer/songwriter, merge first and last name
		if (tempSongArtist.type === 'PRODUCER' || tempSongArtist.type === 'SONGWRITER') {
			artistName = [tempSongArtistFirstName.trim(), tempSongArtistLastName.trim()]
				.filter(Boolean)
				.join(' ');
			artistId = null; // Producer/songwriter don't use artist refs

			if (!artistName) {
				toast.show('Please enter first and last name', 'error');
				return;
			}
		} else if (!artistName && !artistId) {
			toast.show('Please select or enter an artist name', 'error');
			return;
		}

		const newArtist: ArtistRef = {
			type: tempSongArtist.type,
			_id: artistId,
			name: artistName,
		};

		tempSong.artists = [...(tempSong.artists || []), newArtist];
		showSongArtistModal = false;
	}

	function removeSong(index: number) {
		formState.songs = formState.songs.filter((_, i) => i !== index);
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

			// Step 2: Create song record in backend with the uploaded file
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

			// Step 3: Update tempSong with the backend-returned song data
			const createdSong = response.data;
			tempSong._id = createdSong._id;
			tempSong.title = tempSong.title || createdSong.title;
			// Preserve any metadata returned from backend
			tempSong.year = createdSong.year;
			tempSong.language = createdSong.language;

			songFileUploaded = true;
			uploadedSongFilename = file.name;
			toast.show('Song uploaded successfully', 'success');
		} catch (e: any) {
			console.error('Song upload failed:', e);
			const errorMsg = e?.error?.message || e?.message || 'Failed to upload song';
			toast.show(errorMsg, 'error');
		} finally {
			uploadingSong = false;
			songUploadProgress = 0;
		}
	}

	async function uploadSongViaWebSocket(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const baseUrl = getBaseUrl();
			const wsUrl = `${baseUrl.replace('https:', 'wss:').replace('http:', 'ws:')}api/@bbn/music/songs/upload`;
			const ws = new WebSocket(wsUrl);

			const reader = file.stream().getReader();
			let totalBytes = 0;

			ws.onopen = () => {
				const token = auth.getStoredToken();
				if (!token) {
					reject(new Error('No authentication token'));
					ws.close();
					return;
				}
				ws.send(`JWT ${token}`);
			};

			ws.onmessage = async ({ data }) => {
				if (data.startsWith('failed')) {
					console.error('Upload failed:', data);
					ws.close();
					reject(new Error(data));
				} else if (data === 'file') {
					ws.send(`file ${JSON.stringify({ filename: file.name, type: file.type })}`);
				} else if (data === 'next') {
					const chunk = await reader.read();

					if (chunk.value) {
						ws.send(chunk.value);
						totalBytes += chunk.value.length;
						songUploadProgress = Math.round((totalBytes / file.size) * 100);
					}

					if (chunk.done) {
						ws.send('end');
					}
				} else {
					// Upload complete - data contains the song ID
					reader.releaseLock();
					ws.close();
					resolve(data);
				}
			};

			ws.onerror = (event) => {
				reader.releaseLock();
				reject(new Error('WebSocket connection error'));
			};

			ws.onclose = (event) => {
				if (!event.wasClean && totalBytes === 0) {
					reject(new Error('Connection closed unexpectedly'));
				}
			};
		});
	}

	// Artwork upload
	let uploadingArtwork = $state(false);

	function handleArtworkUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) processArtworkFile(file);
	}

	async function processArtworkFile(file: File) {
		if (!file.type.startsWith('image/')) return;

		// Show preview immediately
		const url = URL.createObjectURL(file);
		formState.artworkPreview = url;

		// Upload the file to get artwork ID
		await uploadArtwork(file);
	}

	async function uploadArtwork(file: File) {
		if (!dropId) return;

		uploadingArtwork = true;
		try {
			const artworkId = await uploadViaWebSocket(file, dropId);
			formState.artwork = artworkId;
			toast.show('Artwork uploaded successfully', 'success');
		} catch (e: any) {
			console.error('Artwork upload failed:', e);
			const errorMsg = e?.error?.message || e?.message || 'Failed to upload artwork';
			toast.show(errorMsg, 'error');
			formState.artworkPreview = '';
			formState.artwork = '';
		} finally {
			uploadingArtwork = false;
		}
	}

	async function uploadViaWebSocket(file: File, dropId: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const baseUrl = getBaseUrl();
			const wsUrl = `${baseUrl.replace('https:', 'wss:').replace('http:', 'ws:')}api/@bbn/music/drops/${dropId}/upload`;
			const ws = new WebSocket(wsUrl);

			const reader = file.stream().getReader();
			let uploadProgress = 0;

			ws.onopen = () => {
				const token = auth.getStoredToken();
				if (!token) {
					reject(new Error('No authentication token'));
					ws.close();
					return;
				}
				ws.send(`JWT ${token}`);
			};

			ws.onmessage = async ({ data }) => {
				if (data.startsWith('failed')) {
					console.error('Upload failed:', data);
					ws.close();
					reject(new Error(data));
				} else if (data === 'file') {
					ws.send(`file ${JSON.stringify({ filename: file.name, type: file.type })}`);
				} else if (data === 'next') {
					const chunk = await reader.read();

					if (chunk.value) {
						ws.send(chunk.value);
						uploadProgress += chunk.value.length;
					}

					if (chunk.done) {
						ws.send('end');
					}
				} else {
					// Upload complete - data contains the artwork ID
					reader.releaseLock();
					ws.close();
					resolve(data);
				}
			};

			ws.onerror = (event) => {
				reader.releaseLock();
				reject(new Error('WebSocket connection error'));
			};

			ws.onclose = (event) => {
				if (!event.wasClean && uploadProgress === 0) {
					reject(new Error('Connection closed unexpectedly'));
				}
			};
		});
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
			goto('/drops');
		} catch (e: any) {
			console.error('Submit failed:', e);
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
			<div
				class="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4"
			></div>
			<p class="text-gray-400">Loading drop data...</p>
		</div>
	{:else if loadError}
		<Card variant="default" padding="lg">
			<div class="text-center py-8">
				<p class="text-red-400 mb-4">{loadError}</p>
				<Button onclick={() => goto('/drops')}>Back to Drops</Button>
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
					style="width: calc({((formState.currentStep - 1) / 3) * 100}% - {(formState.currentStep - 1) / 3 * 2}rem)"
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
							<Button onclick={openAddArtist}>
								<PlusOutline class="w-4 h-4" /> Add Artist
							</Button>
						</div>

						{#if formState.errors['artists']}
							<p class="text-sm text-red-400 mb-2">{formState.errors['artists']}</p>
						{/if}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							{#each formState.artists as artist, index}
								<div
									class="group flex items-center gap-4 p-4 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700/50 hover:border-orange-500/50 focus-within:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 focus-within:shadow-lg focus-within:shadow-orange-500/10"
								>
									<div
										class="w-12 h-12 rounded-xl bg-gradient-to-br from-{getArtistTypeColor(
											artist.type,
										)}-500 to-{getArtistTypeColor(
											artist.type,
										)}-600 flex items-center justify-center shadow-lg flex-shrink-0"
									>
										<UserSolid class="w-6 h-6 text-white" />
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-white font-semibold truncate">
											{artist.name || 'Unnamed Artist'}
										</p>
										<p class="text-sm text-gray-400 font-medium">
											{getArtistTypeLabel(artist.type)}
										</p>
									</div>
									<div class="flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
										<button
											onclick={() => openEditArtist(index)}
											class="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white/10"
											aria-label="Edit artist"
										>
											<EditOutline
												class="w-4 h-4 text-gray-400 hover:text-white transition-colors"
											/>
										</button>
										<button
											onclick={() => removeArtist(index)}
											class="p-2 hover:bg-red-500/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-red-500/10"
											aria-label="Remove artist"
										>
											<TrashBinOutline
												class="w-4 h-4 text-gray-400 hover:text-red-400 transition-colors"
											/>
										</button>
									</div>
								</div>
							{/each}

							{#if formState.artists.length === 0}
								<div
									class="col-span-full text-center py-12 border-2 border-dashed border-gray-700 rounded-2xl"
								>
									<div
										class="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4"
									>
										<UserSolid class="w-8 h-8 text-gray-500" />
									</div>
									<p class="text-gray-400 font-medium mb-1">No artists yet</p>
									<p class="text-gray-400 text-sm">Click "Add Artist" to get started</p>
								</div>
							{/if}
						</div>
					</div>

					<!-- Genre Section -->
					<div class="space-y-4">
						<div>
							<h3 class="text-lg font-semibold text-white">Target Audience</h3>
							<p class="text-sm text-gray-400">Select genres to help fans discover your music</p>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<Select
								bind:value={formState.primaryGenre}
								label="Primary Genre"
								required
								error={formState.errors['primaryGenre']}
							>
								<option value="">Select genre...</option>
								{#each primaryGenres as genre}
									<option value={genre}>{genre}</option>
								{/each}
							</Select>

							<Select
								bind:value={formState.secondaryGenre}
								label="Sub-genre"
								required
								disabled={!formState.primaryGenre}
								error={formState.errors['secondaryGenre']}
							>
								<option value="">Select sub-genre...</option>
								{#each secondaryGenreOptions as genre}
									<option value={genre}>{genre}</option>
								{/each}
							</Select>

							<Select
								bind:value={formState.language}
								label="Language"
								required
								error={formState.errors['language']}
							>
								{#each Object.entries(languages) as [code, name]}
									<option value={code}>{name}</option>
								{/each}
							</Select>
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
									<div
										class="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4"
									></div>
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

					<div class="space-y-3">
						{#each formState.songs as song, index}
							<div
								class="group flex items-center gap-4 p-5 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700/50 hover:border-orange-500/50 focus-within:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 focus-within:shadow-lg focus-within:shadow-orange-500/10"
							>
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
											.filter((a) => a.type === 'PRIMARY')
											.map((a) => a.name || a._id)
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
									class="flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex-shrink-0"
								>
									<button
										onclick={() => openEditSong(index)}
										class="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white/10"
										aria-label="Edit song"
									>
										<EditOutline class="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
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
					<Button variant="secondary" href="/drops">
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
<Modal
	bind:open={showArtistModal}
	title={editingArtistIndex !== null ? 'Edit Artist' : 'Add Artist'}
	size="md"
	class="bg-gray-800"
>
	<div class="space-y-4">
		<Select bind:value={tempArtist.type} label="Artist Type">
			{#each artistTypes as type}
				<option value={type}>{getArtistTypeLabel(type)}</option>
			{/each}
		</Select>

		{#if tempArtist.type === 'SONGWRITER' || tempArtist.type === 'PRODUCER'}
			<div class="grid grid-cols-2 gap-4">
				<Input
					bind:value={tempArtistFirstName}
					label="First Name"
					placeholder="John"
					required
				/>
				<Input
					bind:value={tempArtistLastName}
					label="Last Name"
					placeholder="Doe"
					required
				/>
			</div>
			<p class="text-xs text-gray-500">
				Enter the legal name of the {tempArtist.type.toLowerCase()}. This will be displayed as "{tempArtistFirstName || 'First'} {tempArtistLastName || 'Last'}".
			</p>
		{:else}
			<ArtistSearch
				selectedArtist={{ _id: tempArtist._id, name: tempArtist.name ?? '' }}
				onselect={(artist) => {
					tempArtist._id = artist._id;
					tempArtist.name = artist.name;
				}}
				label="Artist Name"
				placeholder="Search existing artists or create new..."
			/>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showArtistModal = false)}>Cancel</Button>
		<Button
			onclick={saveArtist}
			disabled={(tempArtist.type === 'SONGWRITER' || tempArtist.type === 'PRODUCER')
				? !tempArtistFirstName.trim() || !tempArtistLastName.trim()
				: !tempArtist.name}
		>
			Save Artist
		</Button>
	{/snippet}
</Modal>

<!-- Song Modal -->
<Modal
	bind:open={showSongModal}
	title={editingSongIndex !== null ? 'Edit Song' : 'Add New Song'}
	size="xl"
>
	<div class="space-y-8">
		<!-- Step 1: Audio File Upload - Make this prominent and first -->
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
						{#if !editingSongIndex}
							<span class="text-orange-400">*</span>
						{/if}
					</h3>
					<p class="text-sm text-gray-400">
						Upload your song in WAV or FLAC format (16-bit/44.1kHz minimum)
					</p>
				</div>
			</div>

			<div
				class="border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 {uploadingSong
					? 'border-orange-500/50 bg-orange-500/5 cursor-wait'
					: songFileUploaded
						? 'border-green-500/50 bg-green-500/5 cursor-pointer hover:border-green-500'
						: 'border-gray-600 bg-gray-800/30 cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5'}"
				role="button"
				tabindex="0"
				aria-labelledby="audio-file-label"
				onclick={() => !uploadingSong && document.getElementById('song-file')?.click()}
				onkeydown={(e) =>
					!uploadingSong && e.key === 'Enter' && document.getElementById('song-file')?.click()}
			>
				{#if uploadingSong}
					<div
						class="w-16 h-16 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin mx-auto mb-4"
					></div>
					<p class="text-white font-semibold mb-1">Uploading... {songUploadProgress}%</p>
					<p class="text-gray-400 text-sm">Please wait while we process your file</p>
				{:else if songFileUploaded}
					<div
						class="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
					>
						<CheckCircleSolid class="w-8 h-8 text-green-400" />
					</div>
					<p class="text-white font-semibold mb-1">Audio file uploaded successfully!</p>
					{#if uploadedSongFilename}
						<p class="text-green-400 text-sm font-medium mb-2">{uploadedSongFilename}</p>
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
				id="song-file"
				accept="audio/wav,audio/x-wav,audio/flac,audio/x-flac"
				onchange={handleSongFileUpload}
				class="hidden"
				aria-label="Upload song file"
			/>
		</div>

		<!-- Step 2: Song Details -->
		<div class="space-y-6">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center">
					<ClipboardListSolid class="w-4 h-4 text-gray-400" />
				</div>
				<h3 class="text-lg font-semibold text-white">Song Details</h3>
			</div>

			<div class="grid gap-6">
				<Input
					bind:value={tempSong.title}
					label="Song Title"
					placeholder="Enter song title"
					required
					hint="This will appear on all streaming platforms"
				/>

				<!-- Genres in two columns -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Select bind:value={tempSong.primaryGenre} label="Primary Genre" required>
						<option value="">Select primary genre...</option>
						{#each primaryGenres as genre}
							<option value={genre}>{genre}</option>
						{/each}
					</Select>
					<Select
						bind:value={tempSong.secondaryGenre}
						label="Secondary Genre"
						disabled={!tempSong.primaryGenre}
					>
						<option value="">Select secondary genre...</option>
						{#if tempSong.primaryGenre}
							{#each getSecondaryGenres(tempSong.primaryGenre) as genre}
								<option value={genre}>{genre}</option>
							{/each}
						{/if}
					</Select>
				</div>

				<!-- Flags - Side by side -->
				<div>
					<span class="block text-sm font-medium text-white mb-3">Content Flags</span>
					<div class="flex gap-6">
						<Toggle bind:checked={tempSong.explicit} label="Explicit Content" color="red" />
						<Toggle bind:checked={tempSong.instrumental} label="Instrumental" color="blue" />
					</div>
					<p class="text-xs text-gray-500 mt-2">
						Mark if this song contains explicit lyrics or is purely instrumental (mutually
						exclusive)
					</p>
				</div>
			</div>
		</div>

		<!-- Step 3: Artists (collapsible/minimal) -->
		<div class="space-y-4">
			<div class="flex items-center justify-between gap-3">
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
				<Button size="sm" onclick={openAddSongArtist}>
					<PlusOutline class="w-4 h-4" /> Add Artist
				</Button>
			</div>

			{#if tempSong.artists && tempSong.artists.length > 0}
				<div class="space-y-2">
					{#each tempSong.artists as artist, index}
						<div
							class="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
						>
							<UserSolid class="w-4 h-4 text-gray-500 flex-shrink-0" />
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-white truncate">
									{artist.name || 'Unknown Artist'}
								</p>
								<p class="text-xs text-gray-500">{artist.type}</p>
							</div>
							<IconButton
								size="sm"
								onclick={() => {
									tempSong.artists = tempSong.artists?.filter((_, i) => i !== index) || [];
								}}
							>
								<TrashBinOutline class="w-4 h-4" />
							</IconButton>
						</div>
					{/each}
				</div>
			{:else}
				<div class="p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg text-center">
					<p class="text-sm text-gray-400">No artists assigned yet</p>
				</div>
			{/if}
		</div>

		<!-- Step 4: Advanced (ISRC, Year, Language) -->
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
					/>
					<Select
						bind:value={tempSong.language}
						label="Language"
						hint="Language of the song (defaults to drop language)"
					>
						{#each Object.entries(languages) as [code, name]}
							<option value={code}>{name}</option>
						{/each}
					</Select>
				</div>
				<Input
					bind:value={tempSong.isrc}
					label="ISRC Code"
					placeholder="CC-XXX-YY-NNNNN"
					hint="International Standard Recording Code - leave empty to auto-generate"
				/>
			</div>
		</details>
	</div>

	{#snippet footer()}
		<div class="flex items-center justify-between gap-4 w-full">
			<p class="text-sm text-gray-400">
				{#if !songFileUploaded && !editingSongIndex}
					<span class="text-orange-400">•</span> Audio file required
				{:else if !tempSong.title}
					<span class="text-orange-400">•</span> Song title required
				{:else if !tempSong.artists || tempSong.artists.length === 0}
					<span class="text-orange-400">•</span> At least one artist required
				{:else}
					<span class="text-green-400">✓</span> Ready to save
				{/if}
			</p>
			<div class="flex gap-3">
				<Button variant="secondary" onclick={() => (showSongModal = false)}>Cancel</Button>
				<Button
					onclick={saveSong}
					disabled={(!songFileUploaded && !editingSongIndex) ||
						!tempSong.title ||
						!tempSong.artists ||
						tempSong.artists.length === 0}
				>
					{editingSongIndex !== null ? 'Update Song' : 'Add Song'}
				</Button>
			</div>
		</div>
	{/snippet}
</Modal>

<!-- Song Artist Modal -->
<Modal bind:open={showSongArtistModal} title="Add Artist to Song" size="md" class="bg-gray-800">
	<div class="space-y-4">
		<Select bind:value={tempSongArtist.type} label="Artist Type">
			{#each artistTypes as type}
				<option value={type}>{getArtistTypeLabel(type)}</option>
			{/each}
		</Select>

		{#if tempSongArtist.type === 'SONGWRITER' || tempSongArtist.type === 'PRODUCER'}
			<div class="grid grid-cols-2 gap-4">
				<Input
					bind:value={tempSongArtistFirstName}
					label="First Name"
					placeholder="John"
					required
				/>
				<Input
					bind:value={tempSongArtistLastName}
					label="Last Name"
					placeholder="Doe"
					required
				/>
			</div>
			<p class="text-xs text-gray-500">
				Enter the legal name of the {tempSongArtist.type.toLowerCase()}. This will be displayed as "{tempSongArtistFirstName || 'First'} {tempSongArtistLastName || 'Last'}".
			</p>
		{:else}
			<ArtistSearch
				selectedArtist={{ _id: tempSongArtist._id, name: tempSongArtist.name }}
				onselect={(artist) => {
					tempSongArtist._id = artist._id;
					tempSongArtist.name = artist.name;
				}}
				label="Artist Name"
				placeholder="Search existing artists or create new..."
			/>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showSongArtistModal = false)}>Cancel</Button>
		<Button
			onclick={saveSongArtist}
			disabled={(tempSongArtist.type === 'SONGWRITER' || tempSongArtist.type === 'PRODUCER')
				? !tempSongArtistFirstName.trim() || !tempSongArtistLastName.trim()
				: !tempSongArtist.name}
		>
			Add Artist
		</Button>
	{/snippet}
</Modal>

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
