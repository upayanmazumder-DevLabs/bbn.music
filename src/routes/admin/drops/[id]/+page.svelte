<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Modal } from '$lib/components/ui';
	import {
		getIdByDropsByAdmin,
		getIdByDropsByMusic,
		getDropsByAdmin,
		getArtworkByDropByMusic,
		getPictureByUserByUser,
		postReviewByDropByMusic,
		getIdByShazamByMusic,
		getIdByProviderByPublishByMusic,
		postTypeByTypeByDropByMusic,
	} from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import { auth } from '$lib/stores/auth';
	import { toast } from '$lib/stores/toast';
	import type {
		SingleAdminDrop,
		AdminDrop,
		DropType,
		ShazamResults,
		ArtistRef,
		Song,
		Artist,
		FullDrop,
		AccountType,
	} from '$lib/api/types.gen';

	// Merged type for admin drop view (combines admin data with drop data)
	type MergedAdminDrop = SingleAdminDrop & {
		title?: string;
		gtin?: string;
		artists?: Array<ArtistRef>;
		release?: string;
		language?: string;
		primaryGenre?: string;
		secondaryGenre?: string;
		compositionCopyright?: string;
		soundRecordingCopyright?: string;
		artwork?: string;
		songs?: Array<Song>;
		comments?: string;
		_id?: string;
		user?: string;
		type?: DropType;
		copyrightEditable?: boolean;
		// From AdminDrop
		accountType?: AccountType;
		priority?: number;
		// From SingleAdminDrop
		artistList?: Array<Artist>;
		filenames?: Array<string>;
		publishedSnapshot?: FullDrop | null;
	};
	import { Card, Badge, Button, IconButton, Spinner } from '$lib/components/ui';
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';
	import {
		ArrowLeftOutline,
		UserOutline,
		CalendarMonthOutline,
		MusicOutline,
		CheckCircleSolid,
		CloseCircleSolid,
		ExclamationCircleOutline,
		ChevronDownOutline,
		ChevronUpOutline,
		LinkOutline,
		ClockOutline,
	} from 'flowbite-svelte-icons';

	// Drop ID is guaranteed by SvelteKit routing
	const dropId = $page.params.id!;

	// Template keys type
	type TemplateKey =
		| 'Copyright bad'
		| 'Beat license needed'
		| 'Full Songwriter Name'
		| 'AI Generated'
		| 'Wrong Language'
		| 'Artwork low quality'
		| 'Accepted'
		| 'Takedown Accepted'
		| 'Takedown Declined';

	// State
	let drop = $state<MergedAdminDrop | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let artworkUrl = $state<string | null>(null);
	let userAvatarUrl = $state<string | null>(null);
	let userDrops = $state<AdminDrop[]>([]);
	let loadingUserDrops = $state(false);
	let hasMoreUserDrops = $state(true);

	// Response dialog state
	let showResponseDialog = $state(false);
	let responseAction = $state<'ACCEPT' | 'REJECT'>('ACCEPT');
	let responseTemplate = $state<TemplateKey>('Copyright bad');
	let responseTitle = $state('');
	let responseBody = $state('');
	let denyEdits = $state(false);
	let submittingResponse = $state(false);

	// Change type dialog
	let showTypeDialog = $state(false);
	let selectedType = $state<DropType>('UNDER_REVIEW');

	// Publish dialog
	let showPublishDialog = $state(false);
	let selectedProvider = $state('musixmatch');
	let publishing = $state(false);

	// Shazam results
	let shazamResults = $state<ShazamResults | null>(null);
	let loadingShazam = $state(false);

	// Expandable sections
	let expandedLyrics = $state<Record<string, boolean>>({});
	let showPublishedSnapshot = $state(false);

	// Email templates
	const getTemplates = (): Record<TemplateKey, [string, string]> => ({
		'Copyright bad': [
			`Issue with drop: ${drop?.title} [IMPORTANT - Your action required]`,
			`Hey ${drop?.userInfo?.profile.username},\n\nI just reviewed your Drop ${drop?.title} with ID (${dropId}) and our Systems detected Copyright Issues with your Drop.\nCould you please send over proof that you own the rights to the Music?\nYou must own 100% of the legal rights to the music you are distributing.\nThis includes all types of samples or remixes.\nI have marked your Drop as rejected for now, until you send over the proof.\n\nBest regards,\n${$auth.user?.profile.username}`,
		],
		'Beat license needed': [
			`Issue with drop: ${drop?.title} [IMPORTANT - Your action required]`,
			`Hey ${drop?.userInfo?.profile.username},\n\nI just reviewed your Drop ${drop?.title} with ID (${dropId}) and noticed that we need a beat license for the music you are using.\nPlease supply the necessary licenses or proof that you produced the music yourself and resubmit your Drop for review.\n\nBest regards,\n${$auth.user?.profile.username}`,
		],
		'Full Songwriter Name': [
			`Issue with drop: ${drop?.title} [IMPORTANT - Your action required]`,
			`Hey ${drop?.userInfo?.profile.username},\n\nI just reviewed your Drop ${drop?.title} with ID (${dropId}) and noticed missing Metadata.\nYour Drop is missing the Songwriters Full Name.\nPlease correct the names in the Metadata and resubmit your Drop for review.\n\nBest regards,\n${$auth.user?.profile.username}`,
		],
		'AI Generated': [
			`Issue with drop: ${drop?.title} [IMPORTANT - Your action required]`,
			`Hey ${drop?.userInfo?.profile.username},\n\nI just reviewed your Drop ${drop?.title} with ID (${dropId}) and noticed that the Drop is AI generated.\nWe are currently not accepting AI generated music.\nPlease remove the AI generated music and resubmit your Drop for review.\n\nBest regards,\n${$auth.user?.profile.username}`,
		],
		'Wrong Language': [
			`Issue with drop: ${drop?.title} [IMPORTANT - Your action required]`,
			`Hey ${drop?.userInfo?.profile.username},\n\nI just reviewed your Drop ${drop?.title} with ID (${dropId}) and noticed that the language of the Drop and/or Songs is wrong.\nPlease update the language in the Metadata and resubmit your Drop for review.\n\nBest regards,\n${$auth.user?.profile.username}`,
		],
		'Artwork low quality': [
			`Issue with drop: ${drop?.title} [IMPORTANT - Your action required]`,
			`Hey ${drop?.userInfo?.profile.username},\n\nI just reviewed your Drop ${drop?.title} with ID (${dropId}) and noticed that the Artwork is low quality.\nThe Artwork needs to be 3000x3000px and not blurry.\nPlease update the Artwork in the Metadata and resubmit your Drop for review.\n\nBest regards,\n${$auth.user?.profile.username}`,
		],
		Accepted: [
			`${drop?.title} Accepted!`,
			`Hey ${drop?.userInfo?.profile.username},\n\nI just reviewed your Drop ${drop?.title} with ID (${dropId}) and I am happy to inform you that it has been accepted.\nYour music will now be sent to the stores.\nIt could take up to 72h for all stores to show your Drop.\n\nBest regards,\n${$auth.user?.profile.username}`,
		],
		'Takedown Accepted': [
			`${drop?.title} Takedown Processed!`,
			`Hey ${drop?.userInfo?.profile.username},\n\nI just processed your Takedown for the Drop ${drop?.title} with ID (${dropId}). The takedown has been sent to the stores.\nIt could take up to 72h for all stores to process the takedown.\n\nBest regards,\n${$auth.user?.profile.username}`,
		],
		'Takedown Declined': [
			`${drop?.title} Takedown Declined!`,
			`Hey ${drop?.userInfo?.profile.username},\n\nI just reviewed your Takedown for the Drop ${drop?.title} with ID (${dropId}) and I am sorry to inform you that I have declined your request.\nPlease contact us if you have any questions.\n\nBest regards,\n${$auth.user?.profile.username}`,
		],
	});

	onMount(async () => {
		await loadDrop();
	});

	async function loadDrop() {
		loading = true;
		error = null;

		try {
			// Fetch both admin data and drop data in parallel
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

			// Merge admin data (userInfo, events) with drop data (title, songs, etc.)
			if (adminResponse.data || dropResponse.data) {
				drop = {
					...(dropResponse.data as MergedAdminDrop),
					...(adminResponse.data as MergedAdminDrop),
				};

				// Load artwork
				if (drop.artwork) {
					loadArtwork();
				}

				// Load user avatar
				if (drop.userInfo?.profile?.avatar) {
					loadUserAvatar();
				}

				// Load user's other drops
				if (drop.user || drop.userInfo?._id) {
					loadUserDrops();
				}
			}
		} catch (e: any) {
			error = e?.error?.message || e?.message || 'Failed to load drop';
		} finally {
			loading = false;
		}
	}

	async function loadArtwork() {
		try {
			const response = await getArtworkByDropByMusic({
				path: { dropId },
				headers: getAuthHeaders(),
			});
			if (response.data) {
				artworkUrl = URL.createObjectURL(response.data as Blob);
			}
		} catch {
			// Artwork load failed
		}
	}

	async function loadUserAvatar() {
		const avatar = drop?.userInfo?.profile?.avatar;
		const userId = drop?.user || drop?.userInfo?._id;
		if (!avatar || !userId) return;

		// Check if avatar is already a full URL (OAuth providers)
		if (avatar.startsWith('http')) {
			userAvatarUrl = avatar;
			return;
		}

		// Fetch avatar as blob with authentication
		try {
			const response = await getPictureByUserByUser({
				path: { userId },
				headers: getAuthHeaders(),
			});
			if (response.data) {
				userAvatarUrl = URL.createObjectURL(response.data as Blob);
			}
		} catch {
			// Avatar load failed
		}
	}

	async function loadUserDrops(offset = 0) {
		const userId = drop?.user || drop?.userInfo?._id;
		if (!userId) return;
		loadingUserDrops = true;

		try {
			const response = await getDropsByAdmin({
				query: { user: userId, _limit: 10, _offset: offset },
				headers: getAuthHeaders(),
			});

			if (response.data) {
				const newDrops = response.data as AdminDrop[];
				userDrops = offset === 0 ? newDrops : [...userDrops, ...newDrops];
				hasMoreUserDrops = newDrops.length === 10;
			}
		} catch {
			// Failed to load user drops
		} finally {
			loadingUserDrops = false;
		}
	}

	function openResponseDialog(action: 'ACCEPT' | 'REJECT') {
		responseAction = action;
		const templates = getTemplates();

		if (action === 'ACCEPT') {
			if (drop?.type === 'TAKEDOWN_REQUESTED') {
				responseTemplate = 'Takedown Accepted';
			} else {
				responseTemplate = 'Accepted';
			}
		} else {
			if (drop?.type === 'TAKEDOWN_REQUESTED') {
				responseTemplate = 'Takedown Declined';
			} else {
				responseTemplate = 'Copyright bad';
			}
		}

		const template = templates[responseTemplate];
		if (template) {
			responseTitle = template[0];
			responseBody = template[1];
		}

		showResponseDialog = true;
	}

	function onTemplateChange() {
		const templates = getTemplates();
		const template = templates[responseTemplate];
		if (template) {
			responseTitle = template[0];
			responseBody = template[1];
		}
	}

	async function submitResponse() {
		submittingResponse = true;

		try {
			await postReviewByDropByMusic({
				path: { dropId },
				body: {
					title: responseTitle,
					action: responseAction,
					body: responseBody.replaceAll('\n', '<br>'),
					denyEdits,
				},
				headers: getAuthHeaders(),
			});

			showResponseDialog = false;
			// Reload the page to reflect changes
			await loadDrop();
		} catch (e: any) {
			console.error('Failed to submit response:', e);
			toast.show(e?.error?.message || e?.message || 'Failed to submit response', 'error');
		} finally {
			submittingResponse = false;
		}
	}

	async function changeDropType() {
		try {
			await postTypeByTypeByDropByMusic({
				path: { dropId, type: selectedType },
				headers: getAuthHeaders(),
			});

			showTypeDialog = false;
			await loadDrop();
		} catch (e: any) {
			console.error('Failed to change type:', e);
			toast.show(e?.error?.message || e?.message || 'Failed to change drop type', 'error');
		}
	}

	async function runShazam() {
		loadingShazam = true;
		shazamResults = null;

		try {
			const response = await getIdByShazamByMusic({
				path: { id: dropId },
				headers: getAuthHeaders(),
			});

			// API spec incorrectly types response as null, but it returns ShazamResults
			const data = (response as unknown as { data: ShazamResults }).data;
			if (data) {
				shazamResults = data;
			}
		} catch (e) {
			console.error('Shazam failed:', e);
		} finally {
			loadingShazam = false;
		}
	}

	async function publishDrop() {
		publishing = true;

		try {
			const response = await getIdByProviderByPublishByMusic({
				path: { id: dropId, provider: selectedProvider },
				headers: getAuthHeaders(),
			});

			toast.show('Drop published successfully: ' + JSON.stringify(response.data), 'success', 6000);
			showPublishDialog = false;
		} catch (e: any) {
			console.error('Publish failed:', e);
			toast.show(
				'Publish failed: ' + (e?.error?.message || e?.message || 'Unknown error'),
				'error',
				6000,
			);
		} finally {
			publishing = false;
		}
	}

	function getStatusColor(type: string | undefined) {
		switch (type) {
			case 'PUBLISHED':
				return 'green';
			case 'PUBLISHING':
				return 'blue';
			case 'UNDER_REVIEW':
				return 'orange';
			case 'TAKEDOWN_REQUESTED':
				return 'red';
			case 'REVIEW_DECLINED':
				return 'red';
			case 'PRIVATE':
				return 'gray';
			default:
				return 'gray';
		}
	}

	function formatDate(dateStr: string | undefined) {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	}

	function getArtistNames(artists: MergedAdminDrop['artists']) {
		if (!artists) return 'Unknown';
		return artists
			.filter((a: ArtistRef) => a.type === 'PRIMARY')
			.map((a: ArtistRef) => ('name' in a ? a.name : a._id))
			.join(', ');
	}

	function getAccountTypeColor(
		type: AccountType | undefined,
	): 'green' | 'orange' | 'purple' | 'gray' {
		switch (type) {
			case 'VIP':
				return 'purple';
			case 'SUBSCRIBED':
				return 'green';
			default:
				return 'gray';
		}
	}

	function getAccountTypeLabel(type: AccountType | undefined): string {
		switch (type) {
			case 'VIP':
				return 'VIP';
			case 'SUBSCRIBED':
				return 'Pro';
			case 'DEFAULT':
				return 'Free';
			default:
				return 'Unknown';
		}
	}

	function getAuthMethodLabel(method: { type: string; provider?: string } | undefined): string {
		if (!method) return 'Unknown';
		switch (method.type) {
			case 'oauth':
				return `OAuth (${method.provider || 'unknown'})`;
			case 'password':
				return 'Password';
			case 'webAuthn':
				return 'WebAuthn';
			default:
				return method.type;
		}
	}

	function resolveArtistName(artistId: string): string | undefined {
		return drop?.artistList?.find((a) => a._id === artistId)?.name;
	}

	function getArtistProfile(artistId: string): Artist | undefined {
		return drop?.artistList?.find((a) => a._id === artistId);
	}

	function toggleLyrics(songId: string) {
		expandedLyrics[songId] = !expandedLyrics[songId];
	}

	interface EventInfo {
		title: string;
		detail?: string;
		badge?: { text: string; color: 'green' | 'red' | 'orange' | 'blue' | 'gray' };
	}

	function getEventInfo(event: {
		type: string;
		meta?: Record<string, unknown>;
		userId?: string;
	}): EventInfo {
		if (event.type === 'auth') return { title: 'Logged in' };
		if (event.type === 'refresh-auth') return { title: 'Refreshed session' };

		if (event.type === 'action' && event.meta) {
			const action = event.meta.action as string;
			const targetType = event.meta.type as string | undefined;
			const data = event.meta.data as { type?: string; title?: string } | undefined;
			const previousType = data?.type;

			switch (action) {
				case 'drop-create':
					return { title: 'Created drop' };
				case 'drop-type-change': {
					const typeLabels: Record<string, string> = {
						UNDER_REVIEW: 'Under Review',
						PUBLISHED: 'Published',
						PUBLISHING: 'Publishing',
						PRIVATE: 'Private',
						TAKEDOWN_REQUESTED: 'Takedown Requested',
						REVIEW_DECLINED: 'Declined',
						UNSUBMITTED: 'Draft',
					};
					const typeColors: Record<string, 'green' | 'red' | 'orange' | 'blue' | 'gray'> = {
						UNDER_REVIEW: 'orange',
						PUBLISHED: 'green',
						PUBLISHING: 'blue',
						PRIVATE: 'gray',
						TAKEDOWN_REQUESTED: 'red',
						REVIEW_DECLINED: 'red',
						UNSUBMITTED: 'gray',
					};
					if (targetType && previousType) {
						return {
							title: 'Status changed',
							detail: `${typeLabels[previousType] || previousType} → ${typeLabels[targetType] || targetType}`,
							badge: {
								text: typeLabels[targetType] || targetType,
								color: typeColors[targetType] || 'gray',
							},
						};
					}
					if (targetType) {
						return {
							title: 'Status changed',
							badge: {
								text: typeLabels[targetType] || targetType,
								color: typeColors[targetType] || 'gray',
							},
						};
					}
					return { title: 'Status changed' };
				}
				case 'drop-review':
					return {
						title: 'Reviewed by admin',
						badge: { text: 'Reviewed', color: 'green' },
					};
				case 'shazam-results': {
					const shazamData = event.meta.data as
						| Array<{ title?: string; artist?: string }>
						| undefined;
					// Only count entries with a real title as actual matches
					const validMatches =
						shazamData?.filter((m) => m.title && m.title !== 'No title found') || [];
					const matchCount = validMatches.length;

					if (matchCount === 0) {
						return {
							title: 'Shazam check',
							detail: 'No matches found',
							badge: { text: 'Clear', color: 'green' },
						};
					}

					const firstMatch = validMatches[0];
					const matchInfo = firstMatch.artist
						? `${firstMatch.title} - ${firstMatch.artist}`
						: firstMatch.title!;

					return {
						title: 'Shazam check',
						detail:
							matchCount === 1
								? `Match: ${matchInfo}`
								: `${matchCount} matches found (${matchInfo})`,
						badge: { text: `${matchCount} match${matchCount > 1 ? 'es' : ''}`, color: 'orange' },
					};
				}
				default:
					return { title: action.replace(/-/g, ' ') };
			}
		}

		return { title: event.type };
	}

	function formatEventTime(eventId: string): string {
		// MongoDB ObjectId contains timestamp in first 4 bytes (hex)
		try {
			const timestamp = parseInt(eventId.substring(0, 8), 16) * 1000;
			const date = new Date(timestamp);
			const now = new Date();
			const diffMs = now.getTime() - date.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			const diffHours = Math.floor(diffMs / 3600000);
			const diffDays = Math.floor(diffMs / 86400000);

			if (diffMins < 1) return 'Just now';
			if (diffMins < 60) return `${diffMins}m ago`;
			if (diffHours < 24) return `${diffHours}h ago`;
			if (diffDays < 7) return `${diffDays}d ago`;

			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		} catch {
			return '';
		}
	}
</script>

<svelte:head>
	<title>{drop?.title ?? 'Loading...'} - Admin Review - bbn.music</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<IconButton onclick={() => history.back()} variant="ghost" aria-label="Go back">
			<ArrowLeftOutline class="w-5 h-5" />
		</IconButton>
		<div class="flex-1">
			<h1 class="text-2xl font-bold text-white">Admin Review</h1>
			<p class="text-gray-400 text-sm">Review and manage drop submission</p>
		</div>
		{#if drop?.type}
			<Badge color={getStatusColor(drop.type)}>{drop.type}</Badge>
		{/if}
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<Spinner size="lg" color="primary" />
		</div>
	{:else if error}
		<Card variant="default" padding="lg">
			<p class="text-red-400">{error}</p>
		</Card>
	{:else if drop}
		<!-- Admin Action Buttons -->
		<Card variant="glass" padding="md">
			<div class="flex flex-wrap gap-3">
				<Button variant="danger" onclick={() => openResponseDialog('REJECT')}>
					<CloseCircleSolid class="w-4 h-4" /> Reject
				</Button>
				<Button
					variant="secondary"
					onclick={() => {
						selectedType = drop?.type ?? 'UNDER_REVIEW';
						showTypeDialog = true;
					}}
				>
					Change Type
				</Button>
				<Button variant="secondary" onclick={runShazam} disabled={loadingShazam}>
					{loadingShazam ? 'Checking...' : 'Check Shazam'}
				</Button>
				<Button variant="secondary" onclick={() => (showPublishDialog = true)}>Publish</Button>
				<Button variant="secondary" onclick={() => goto(`/music/drops/${dropId}/edit`)}
					>Edit Drop</Button
				>
				<Button onclick={() => openResponseDialog('ACCEPT')}>
					<CheckCircleSolid class="w-4 h-4" /> Accept
				</Button>
			</div>
		</Card>

		<!-- Shazam Results -->
		{#if shazamResults && shazamResults.length > 0}
			<Card variant="default" padding="md">
				<h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
					<ExclamationCircleOutline class="w-5 h-5 text-yellow-400" />
					Shazam Matches Found
				</h3>
				<div class="space-y-2">
					{#each shazamResults as result}
						<div class="p-3 bg-gray-800 rounded-lg">
							<p class="text-white font-medium">{result.title}</p>
							<p class="text-gray-400 text-sm">{result.artist}</p>
							<div class="flex gap-2 mt-2">
								{#if result.shazamUrl}
									<a
										href={result.shazamUrl}
										target="_blank"
										class="text-xs text-blue-400 hover:underline">Shazam</a
									>
								{/if}
								{#if result.spotifyUrl}
									<a
										href={result.spotifyUrl}
										target="_blank"
										class="text-xs text-green-400 hover:underline">Spotify</a
									>
								{/if}
								{#if result.appleUrl}
									<a
										href={result.appleUrl}
										target="_blank"
										class="text-xs text-pink-400 hover:underline">Apple</a
									>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</Card>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Left Column: Drop Details -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Drop Info -->
				<Card variant="default" padding="md">
					<div class="flex gap-6">
						<!-- Artwork -->
						<div class="w-40 h-40 flex-shrink-0 rounded-xl overflow-hidden bg-gray-800">
							{#if artworkUrl}
								<img src={artworkUrl} alt="Album artwork" class="w-full h-full object-cover" />
							{:else}
								<div class="w-full h-full flex items-center justify-center">
									<MusicOutline class="w-12 h-12 text-gray-600" />
								</div>
							{/if}
						</div>

						<!-- Details -->
						<div class="flex-1 space-y-3">
							<h2 class="text-2xl font-bold text-white">{drop.title || '(No title)'}</h2>

							<div class="grid grid-cols-2 gap-4 text-sm">
								<div>
									<p class="text-gray-500">Release Date</p>
									<p class="text-white">{formatDate(drop.release)}</p>
								</div>
								<div>
									<p class="text-gray-500">Language</p>
									<p class="text-white">{drop.language || 'N/A'}</p>
								</div>
								<div>
									<p class="text-gray-500">Genre</p>
									<p class="text-white">{drop.primaryGenre} / {drop.secondaryGenre}</p>
								</div>
								<div>
									<p class="text-gray-500">GTIN</p>
									<p class="text-white font-mono text-xs">{drop.gtin || 'N/A'}</p>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-4 text-sm">
								<div>
									<p class="text-gray-500">Composition (C)</p>
									<p class="text-white">{drop.compositionCopyright || 'N/A'}</p>
								</div>
								<div>
									<p class="text-gray-500">Sound Recording (P)</p>
									<p class="text-white">{drop.soundRecordingCopyright || 'N/A'}</p>
								</div>
							</div>
						</div>
					</div>
				</Card>

				<!-- Artists -->
				{#if drop.artists && drop.artists.length > 0}
					<Card variant="default" padding="md">
						<h3 class="text-lg font-semibold text-white mb-4">Artists ({drop.artists.length})</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							{#each drop.artists as artist}
								{@const artistProfile =
									artist.type === 'PRIMARY' || artist.type === 'FEATURING'
										? getArtistProfile(artist._id)
										: null}
								<div
									class="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
								>
									<div
										class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0"
									>
										<UserOutline class="w-5 h-5 text-orange-400" />
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-white font-medium truncate">
											{'name' in artist ? artist.name : resolveArtistName(artist._id) || artist._id}
										</p>
										<div class="flex items-center gap-2">
											<Badge color={artist.type === 'PRIMARY' ? 'orange' : 'gray'} size="sm"
												>{artist.type}</Badge
											>
											{#if artistProfile}
												{#if artistProfile.spotify}
													<a
														href={artistProfile.spotify}
														target="_blank"
														class="text-green-400 hover:text-green-300 text-xs flex items-center gap-1"
													>
														<LinkOutline class="w-3 h-3" /> Spotify
													</a>
												{/if}
												{#if artistProfile.apple}
													<a
														href={artistProfile.apple}
														target="_blank"
														class="text-pink-400 hover:text-pink-300 text-xs flex items-center gap-1"
													>
														<LinkOutline class="w-3 h-3" /> Apple
													</a>
												{/if}
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</Card>
				{/if}

				<!-- Songs -->
				<Card variant="default" padding="md">
					<h3 class="text-lg font-semibold text-white mb-4">Songs ({drop.songs?.length || 0})</h3>
					{#if drop.songs && drop.songs.length > 0}
						<div class="space-y-4">
							{#each drop.songs as song, i}
								<div class="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
									<!-- Song Header -->
									<div class="flex items-start gap-4">
										<span class="text-gray-500 w-6 text-center pt-1 font-mono">{i + 1}</span>
										<AudioPlayer songId={song._id} size="sm" />
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<p class="text-white font-medium">{song.title}</p>
												{#if song.explicit}
													<Badge color="red" size="sm">E</Badge>
												{/if}
												{#if song.instrumental}
													<Badge color="blue" size="sm">Instrumental</Badge>
												{/if}
											</div>
											<p class="text-gray-400 text-sm">
												{song.artists
													?.map((a) => ('name' in a ? a.name : resolveArtistName(a._id) || a._id))
													.join(', ') || 'Unknown Artist'}
											</p>
											{#if drop.filenames?.[i]}
												<p
													class="text-gray-500 text-xs font-mono truncate mt-0.5"
													title={drop.filenames[i]}
												>
													{drop.filenames[i]}
												</p>
											{/if}
										</div>
										<code class="text-xs text-gray-500 font-mono">{song.isrc || 'No ISRC'}</code>
									</div>

									<!-- Song Details Grid -->
									<div
										class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-700/30 text-sm"
									>
										<div>
											<span class="text-gray-500 text-xs">Genre</span>
											<p class="text-gray-300">{song.primaryGenre} / {song.secondaryGenre}</p>
										</div>
										<div>
											<span class="text-gray-500 text-xs">Language</span>
											<p class="text-gray-300">{song.language || 'N/A'}</p>
										</div>
										<div>
											<span class="text-gray-500 text-xs">Year</span>
											<p class="text-gray-300">{song.year || 'N/A'}</p>
										</div>
										<div>
											<span class="text-gray-500 text-xs">Country</span>
											<p class="text-gray-300">{song.country || 'N/A'}</p>
										</div>
									</div>

									<!-- Song Artists Breakdown -->
									{#if song.artists && song.artists.length > 0}
										<div class="mt-3 pt-3 border-t border-gray-700/30">
											<span class="text-gray-500 text-xs">Credits</span>
											<div class="flex flex-wrap gap-2 mt-1">
												{#each song.artists as artist}
													{@const artistProfile =
														artist.type === 'PRIMARY' || artist.type === 'FEATURING'
															? getArtistProfile(artist._id)
															: null}
													<div
														class="flex items-center gap-1 px-2 py-1 bg-gray-700/50 rounded text-xs"
													>
														<span class="text-gray-400">{artist.type}:</span>
														<span class="text-white"
															>{'name' in artist
																? artist.name
																: resolveArtistName(artist._id) || artist._id}</span
														>
														{#if artistProfile?.spotify}
															<a
																href={artistProfile.spotify}
																target="_blank"
																class="text-green-400 hover:text-green-300"
															>
																<LinkOutline class="w-3 h-3" />
															</a>
														{/if}
														{#if artistProfile?.apple}
															<a
																href={artistProfile.apple}
																target="_blank"
																class="text-pink-400 hover:text-pink-300"
															>
																<LinkOutline class="w-3 h-3" />
															</a>
														{/if}
													</div>
												{/each}
											</div>
										</div>
									{/if}

									<!-- Lyrics -->
									{#if song.lyrics || song.timedLyrics}
										<div class="mt-3 pt-3 border-t border-gray-700/30">
											<button
												class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
												onclick={() => toggleLyrics(song._id)}
											>
												{#if expandedLyrics[song._id]}
													<ChevronUpOutline class="w-4 h-4" />
												{:else}
													<ChevronDownOutline class="w-4 h-4" />
												{/if}
												{song.timedLyrics ? 'Timed Lyrics' : 'Lyrics'}
												{#if song.timedLyrics}
													<Badge color="green" size="sm">Synced</Badge>
												{/if}
											</button>
											{#if expandedLyrics[song._id]}
												<pre
													class="mt-2 p-3 bg-gray-900/50 rounded text-sm text-gray-300 whitespace-pre-wrap max-h-60 overflow-y-auto">{song.timedLyrics ||
														song.lyrics}</pre>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-500 text-center py-4">No songs</p>
					{/if}
				</Card>

				<!-- Comments -->
				{#if drop.comments}
					<Card variant="default" padding="md">
						<h3 class="text-lg font-semibold text-white mb-4">User Comments</h3>
						<p class="text-gray-300 whitespace-pre-wrap">{drop.comments}</p>
					</Card>
				{/if}

				<!-- Published Snapshot Comparison -->
				{#if drop.publishedSnapshot}
					<Card variant="default" padding="md">
						<button
							class="w-full flex items-center justify-between"
							onclick={() => (showPublishedSnapshot = !showPublishedSnapshot)}
						>
							<h3 class="text-lg font-semibold text-white flex items-center gap-2">
								<ClockOutline class="w-5 h-5 text-blue-400" />
								Published Version
							</h3>
							{#if showPublishedSnapshot}
								<ChevronUpOutline class="w-5 h-5 text-gray-400" />
							{:else}
								<ChevronDownOutline class="w-5 h-5 text-gray-400" />
							{/if}
						</button>
						{#if showPublishedSnapshot}
							<div class="mt-4 space-y-3">
								<!-- Compare key fields -->
								<div class="grid grid-cols-2 gap-4 text-sm">
									<div class="space-y-2">
										<p class="text-gray-500 text-xs font-medium">CURRENT</p>
										<div class="p-2 bg-gray-900/50 rounded">
											<p class="text-white font-medium">{drop.title}</p>
											<p class="text-gray-400 text-xs">{getArtistNames(drop.artists)}</p>
										</div>
									</div>
									<div class="space-y-2">
										<p class="text-gray-500 text-xs font-medium">PUBLISHED</p>
										<div class="p-2 bg-green-900/20 rounded border border-green-700/30">
											<p class="text-white font-medium">{drop.publishedSnapshot.title}</p>
											<p class="text-gray-400 text-xs">
												{getArtistNames(drop.publishedSnapshot.artists)}
											</p>
										</div>
									</div>
								</div>

								<!-- Metadata comparison -->
								<div class="text-xs space-y-1 p-3 bg-gray-900/30 rounded">
									<div
										class="grid grid-cols-3 gap-2 text-gray-500 font-medium border-b border-gray-700/50 pb-1"
									>
										<span>Field</span>
										<span>Current</span>
										<span>Published</span>
									</div>
									<div class="grid grid-cols-3 gap-2">
										<span class="text-gray-500">Release</span>
										<span class="text-gray-300">{drop.release || 'N/A'}</span>
										<span class="text-gray-300">{drop.publishedSnapshot.release || 'N/A'}</span>
									</div>
									<div class="grid grid-cols-3 gap-2">
										<span class="text-gray-500">Genre</span>
										<span class="text-gray-300">{drop.primaryGenre}/{drop.secondaryGenre}</span>
										<span class="text-gray-300"
											>{drop.publishedSnapshot.primaryGenre}/{drop.publishedSnapshot
												.secondaryGenre}</span
										>
									</div>
									<div class="grid grid-cols-3 gap-2">
										<span class="text-gray-500">Songs</span>
										<span class="text-gray-300">{drop.songs?.length || 0}</span>
										<span class="text-gray-300">{drop.publishedSnapshot.songs?.length || 0}</span>
									</div>
									<div class="grid grid-cols-3 gap-2">
										<span class="text-gray-500">GTIN</span>
										<span class="text-gray-300 font-mono">{drop.gtin || 'N/A'}</span>
										<span class="text-gray-300 font-mono"
											>{drop.publishedSnapshot.gtin || 'N/A'}</span
										>
									</div>
								</div>

								<!-- Published songs list -->
								{#if drop.publishedSnapshot.songs && drop.publishedSnapshot.songs.length > 0}
									<div class="pt-2">
										<p class="text-gray-500 text-xs font-medium mb-2">Published Songs</p>
										<div class="space-y-1">
											{#each drop.publishedSnapshot.songs as song, i}
												<div class="flex items-center gap-2 text-sm p-2 bg-gray-800/30 rounded">
													<span class="text-gray-500 w-4">{i + 1}</span>
													<span class="text-white">{song.title}</span>
													<code class="text-gray-500 text-xs ml-auto">{song.isrc || 'No ISRC'}</code
													>
												</div>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</Card>
				{/if}

				<!-- IDs & Meta -->
				<Card variant="default" padding="md">
					<h3 class="text-sm font-medium text-gray-400 mb-3">Technical Info</h3>
					<div class="space-y-2 text-xs">
						<div class="flex justify-between">
							<span class="text-gray-500">Drop ID</span>
							<code class="text-gray-400">{drop._id}</code>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-500">User ID</span>
							<code class="text-gray-400">{drop.user}</code>
						</div>
						{#if drop.artwork}
							<div class="flex justify-between">
								<span class="text-gray-500">Artwork ID</span>
								<code class="text-gray-400">{drop.artwork}</code>
							</div>
						{/if}
						{#if drop.copyrightEditable !== undefined}
							<div class="flex justify-between items-center">
								<span class="text-gray-500">Copyright Editable</span>
								<Badge color={drop.copyrightEditable ? 'green' : 'gray'} size="sm">
									{drop.copyrightEditable ? 'Yes' : 'No'}
								</Badge>
							</div>
						{/if}
					</div>
				</Card>
			</div>

			<!-- Right Column: User Info -->
			<div class="space-y-6">
				<!-- User Profile -->
				<Card variant="default" padding="md">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-white">User Info</h3>
						{#if drop.accountType}
							<Badge color={getAccountTypeColor(drop.accountType)}
								>{getAccountTypeLabel(drop.accountType)}</Badge
							>
						{/if}
					</div>
					{#if drop.userInfo}
						<div class="space-y-4">
							<div class="flex items-center gap-4">
								<div
									class="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden"
								>
									{#if userAvatarUrl}
										<img src={userAvatarUrl} alt="Avatar" class="w-full h-full object-cover" />
									{:else}
										<UserOutline class="w-8 h-8 text-gray-500" />
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-white font-semibold">{drop.userInfo.profile.username}</p>
									<p class="text-gray-400 text-sm truncate">{drop.userInfo.profile.email}</p>
									<div class="flex items-center gap-2 mt-1">
										{#if drop.userInfo.profile.verified?.email}
											<Badge color="green" size="sm">Email Verified</Badge>
										{:else}
											<Badge color="red" size="sm">Unverified</Badge>
										{/if}
										{#if drop.userInfo.profile.phone}
											{#if drop.userInfo.profile.verified?.phone}
												<Badge color="green" size="sm">Phone Verified</Badge>
											{:else}
												<Badge color="gray" size="sm">Phone</Badge>
											{/if}
										{/if}
									</div>
								</div>
							</div>

							<div class="text-sm space-y-2 pt-2 border-t border-gray-700/50">
								{#if drop.userInfo.profile.phone}
									<div class="flex justify-between">
										<span class="text-gray-500">Phone</span>
										<span class="text-gray-300">{drop.userInfo.profile.phone}</span>
									</div>
								{/if}
								<div class="flex justify-between">
									<span class="text-gray-500">User ID</span>
									<code class="text-gray-400 text-xs">{drop.userInfo._id}</code>
								</div>
								{#if drop.priority !== undefined && drop.priority > 0}
									<div class="flex justify-between">
										<span class="text-gray-500">Priority</span>
										<Badge color="orange" size="sm">{drop.priority}</Badge>
									</div>
								{/if}
							</div>

							<!-- Auth Methods -->
							{#if drop.userInfo.authentication && drop.userInfo.authentication.length > 0}
								<div class="pt-2 border-t border-gray-700/50">
									<span class="text-gray-500 text-sm">Auth Methods</span>
									<div class="flex flex-wrap gap-1 mt-1">
										{#each drop.userInfo.authentication as auth}
											<Badge color="blue" size="sm">{getAuthMethodLabel(auth)}</Badge>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Permissions -->
							{#if drop.userInfo.permissions && drop.userInfo.permissions.length > 0}
								<div class="pt-2 border-t border-gray-700/50">
									<span class="text-gray-500 text-sm">Permissions</span>
									<div class="flex flex-wrap gap-1 mt-1">
										{#each drop.userInfo.permissions.slice(0, 5) as permission}
											<Badge color="gray" size="sm">{permission}</Badge>
										{/each}
										{#if drop.userInfo.permissions.length > 5}
											<Badge color="gray" size="sm"
												>+{drop.userInfo.permissions.length - 5} more</Badge
											>
										{/if}
									</div>
								</div>
							{/if}

							<!-- Groups -->
							{#if drop.userInfo.groups && drop.userInfo.groups.length > 0}
								<div class="pt-2 border-t border-gray-700/50">
									<span class="text-gray-500 text-sm">Groups</span>
									<div class="flex flex-wrap gap-1 mt-1">
										{#each drop.userInfo.groups as group}
											<Badge color="purple" size="sm">{group}</Badge>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<p class="text-gray-500">No user info available</p>
					{/if}
				</Card>

				<!-- User Events -->
				{#if drop.events && drop.events.length > 0}
					<Card variant="default" padding="md">
						<h3 class="text-lg font-semibold text-white mb-4">Recent Activity</h3>
						<!-- TODO: reverse order in backend instead of frontend -->
						<div class="space-y-2 max-h-80 overflow-y-auto">
							{#each [...drop.events].reverse().slice(0, 15) as event}
								{@const info = getEventInfo(
									event as { type: string; meta?: Record<string, unknown>; userId?: string },
								)}
								<div class="text-sm p-3 bg-gray-800/50 rounded-lg">
									<div class="flex items-center justify-between gap-2">
										<div class="flex items-center gap-2 min-w-0">
											<span class="text-white font-medium">{info.title}</span>
											{#if info.badge}
												<Badge color={info.badge.color} size="sm">{info.badge.text}</Badge>
											{/if}
										</div>
										<span class="text-gray-500 text-xs whitespace-nowrap"
											>{formatEventTime(event._id)}</span
										>
									</div>
									{#if info.detail}
										<p class="text-gray-400 text-xs mt-1">{info.detail}</p>
									{/if}
								</div>
							{/each}
						</div>
					</Card>
				{/if}

				<!-- User's Other Drops -->
				<Card variant="default" padding="md">
					<h3 class="text-lg font-semibold text-white mb-4">User's Other Drops</h3>
					{#if userDrops.length > 0}
						<div class="space-y-2">
							{#each userDrops.filter((d) => d._id !== drop?._id) as userDrop}
								<a
									href="/admin/drops/{userDrop._id}"
									class="block p-2 bg-gray-800/50 rounded hover:bg-gray-700/50 transition-colors"
								>
									<p class="text-white text-sm truncate">{userDrop.title || 'Untitled'}</p>
									<div class="flex justify-between text-xs">
										<Badge color={getStatusColor(userDrop.type)} size="sm">{userDrop.type}</Badge>
										<span class="text-gray-500">{formatDate(userDrop.release)}</span>
									</div>
								</a>
							{/each}
						</div>
						{#if hasMoreUserDrops}
							<Button
								onclick={() => loadUserDrops(userDrops.length)}
								disabled={loadingUserDrops}
								variant="ghost"
								size="sm"
								class="w-full mt-3"
							>
								{loadingUserDrops ? 'Loading...' : 'Load more'}
							</Button>
						{/if}
					{:else if loadingUserDrops}
						<p class="text-gray-500 text-center py-4">Loading...</p>
					{:else}
						<p class="text-gray-500 text-center py-4">No other drops</p>
					{/if}
				</Card>
			</div>
		</div>
	{/if}
</div>

<!-- Response Dialog -->
<Modal
	bind:open={showResponseDialog}
	title="{responseAction === 'ACCEPT' ? 'Accept' : 'Reject'} Drop"
>
	<div class="space-y-4">
		<div>
			<label for="template" class="block text-sm text-gray-400 mb-1">Template</label>
			<select
				id="template"
				bind:value={responseTemplate}
				onchange={onTemplateChange}
				class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
			>
				{#each Object.keys(getTemplates()) as template}
					<option value={template}>{template}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="title" class="block text-sm text-gray-400 mb-1">Email Title</label>
			<input
				id="title"
				type="text"
				bind:value={responseTitle}
				class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
			/>
		</div>

		<div>
			<label for="body" class="block text-sm text-gray-400 mb-1">Email Body</label>
			<textarea
				id="body"
				bind:value={responseBody}
				rows="12"
				class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none"
			></textarea>
		</div>

		<div class="flex items-center gap-2">
			<input
				type="checkbox"
				id="denyEdits"
				bind:checked={denyEdits}
				class="rounded bg-gray-800 border-gray-700"
			/>
			<label for="denyEdits" class="text-sm text-gray-400">Deny further edits</label>
		</div>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showResponseDialog = false)}>Cancel</Button>
		<Button
			variant={responseAction === 'ACCEPT' ? 'primary' : 'danger'}
			onclick={submitResponse}
			disabled={submittingResponse}
		>
			{submittingResponse ? 'Submitting...' : responseAction}
		</Button>
	{/snippet}
</Modal>

<!-- Change Type Dialog -->
<Modal bind:open={showTypeDialog} title="Change Drop Type">
	<div>
		<label for="dropType" class="block text-sm text-gray-400 mb-1">New Type</label>
		<select
			id="dropType"
			bind:value={selectedType}
			class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
		>
			<option value="UNSUBMITTED">Unsubmitted</option>
			<option value="PRIVATE">Private</option>
			<option value="UNDER_REVIEW">Under Review</option>
			<option value="REVIEW_DECLINED">Review Declined</option>
			<option value="PUBLISHING">Publishing</option>
			<option value="PUBLISHED">Published</option>
			<option value="TAKEDOWN_REQUESTED">Takedown Requested</option>
		</select>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showTypeDialog = false)}>Cancel</Button>
		<Button onclick={changeDropType}>Change Type</Button>
	{/snippet}
</Modal>

<!-- Publish Dialog -->
<Modal bind:open={showPublishDialog} title="Publish Drop">
	<div>
		<label for="provider" class="block text-sm text-gray-400 mb-1">Provider</label>
		<select
			id="provider"
			bind:value={selectedProvider}
			class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
		>
			<option value="musixmatch">Musixmatch</option>
			<option value="ampsuite">Ampsuite</option>
			<option value="symphonic">Symphonic</option>
		</select>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showPublishDialog = false)}>Cancel</Button>
		<Button onclick={publishDrop} disabled={publishing}>
			{publishing ? 'Publishing...' : 'Publish Now'}
		</Button>
	{/snippet}
</Modal>
