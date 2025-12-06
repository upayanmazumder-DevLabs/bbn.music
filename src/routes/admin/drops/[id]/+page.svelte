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
	import { getAuthHeaders, auth } from '$lib/stores/auth';
	import { toast } from '$lib/stores/toast';
	import type { SingleAdminDrop, AdminDrop, DropType, ShazamResults } from '$lib/api/types.gen';
	import { Card, Badge, Button } from '$lib/components/ui';
	import {
		ArrowLeftOutline,
		UserOutline,
		CalendarMonthOutline,
		MusicOutline,
		CheckCircleSolid,
		CloseCircleSolid,
		ExclamationCircleOutline,
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
	let drop = $state<SingleAdminDrop | null>(null);
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
					...(dropResponse.data as SingleAdminDrop),
					...(adminResponse.data as SingleAdminDrop),
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
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load drop';
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
		} catch (e) {
			console.error('Failed to submit response:', e);
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
		} catch (e) {
			console.error('Failed to change type:', e);
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
		} catch (e) {
			console.error('Publish failed:', e);
			toast.show(
				'Publish failed: ' + (e instanceof Error ? e.message : 'Unknown error'),
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

	function getArtistNames(artists: SingleAdminDrop['artists']) {
		if (!artists) return 'Unknown';
		return artists
			.filter((a) => a.type === 'PRIMARY')
			.map((a) => ('name' in a ? a.name : a._id))
			.join(', ');
	}
</script>

<svelte:head>
	<title>{drop?.title ?? 'Loading...'} - Admin Review - bbn.music</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<button
			onclick={() => history.back()}
			class="p-2 hover:bg-gray-800 rounded-lg transition-colors"
		>
			<ArrowLeftOutline class="w-5 h-5 text-gray-400" />
		</button>
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
			<div
				class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"
			></div>
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
				<Button variant="secondary" onclick={() => goto(`/drops/${dropId}/edit`)}>Edit Drop</Button>
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
							<div>
								<h2 class="text-2xl font-bold text-white">{drop.title || '(No title)'}</h2>
								<p class="text-gray-400">{getArtistNames(drop.artists)}</p>
							</div>

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

				<!-- Songs -->
				<Card variant="default" padding="md">
					<h3 class="text-lg font-semibold text-white mb-4">Songs ({drop.songs?.length || 0})</h3>
					{#if drop.songs && drop.songs.length > 0}
						<div class="space-y-2">
							{#each drop.songs as song, i}
								<div class="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg">
									<span class="text-gray-500 w-6 text-center">{i + 1}</span>
									<div class="flex-1 min-w-0">
										<p class="text-white font-medium truncate">{song.title}</p>
										<p class="text-gray-400 text-sm truncate">
											{song.artists?.map((a) => ('name' in a ? a.name : a._id)).join(', ')}
										</p>
									</div>
									<div class="text-right text-sm">
										<p class="text-gray-400">{song.isrc || 'No ISRC'}</p>
										<p class="text-gray-500 text-xs">{song.filename}</p>
									</div>
									<div class="flex gap-2">
										{#if song.explicit}
											<Badge color="red" size="sm">E</Badge>
										{/if}
										{#if song.instrumental}
											<Badge color="blue" size="sm">Inst</Badge>
										{/if}
									</div>
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

				<!-- IDs -->
				<Card variant="default" padding="sm">
					<div class="flex gap-6 text-xs text-gray-500">
						<span>Drop ID: <code class="text-gray-400">{drop._id}</code></span>
						<span>User ID: <code class="text-gray-400">{drop.user}</code></span>
					</div>
				</Card>
			</div>

			<!-- Right Column: User Info -->
			<div class="space-y-6">
				<!-- User Profile -->
				<Card variant="default" padding="md">
					<h3 class="text-lg font-semibold text-white mb-4">User Info</h3>
					{#if drop.userInfo}
						<div class="space-y-4">
							<div class="flex items-center gap-4">
								<div
									class="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden"
								>
									{#if userAvatarUrl}
										<img
											src={userAvatarUrl}
											alt="Avatar"
											class="w-full h-full object-cover"
										/>
									{:else}
										<UserOutline class="w-8 h-8 text-gray-500" />
									{/if}
								</div>
								<div>
									<p class="text-white font-semibold">{drop.userInfo.profile.username}</p>
									<p class="text-gray-400 text-sm">{drop.userInfo.profile.email}</p>
									{#if drop.userInfo.profile.verified?.email}
										<Badge color="green" size="sm">Verified</Badge>
									{:else}
										<Badge color="gray" size="sm">Unverified</Badge>
									{/if}
								</div>
							</div>

							<div class="text-sm space-y-2">
								<div class="flex justify-between">
									<span class="text-gray-500">User ID</span>
									<code class="text-gray-400 text-xs">{drop.userInfo._id}</code>
								</div>
								{#if drop.userInfo.groups && drop.userInfo.groups.length > 0}
									<div>
										<span class="text-gray-500">Groups</span>
										<div class="flex flex-wrap gap-1 mt-1">
											{#each drop.userInfo.groups as group}
												<Badge color="purple" size="sm">{group}</Badge>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						</div>
					{:else}
						<p class="text-gray-500">No user info available</p>
					{/if}
				</Card>

				<!-- User Events -->
				{#if drop.events && drop.events.length > 0}
					<Card variant="default" padding="md">
						<h3 class="text-lg font-semibold text-white mb-4">Recent Activity</h3>
						<div class="space-y-2 max-h-64 overflow-y-auto">
							{#each drop.events.slice(0, 10) as event}
								<div class="text-sm p-2 bg-gray-800/50 rounded">
									<div class="flex justify-between">
										<span class="text-gray-300">{event.type}</span>
										<span class="text-gray-500 text-xs">{event.source?.platform || 'Unknown'}</span>
									</div>
									{#if event.ip}
										<p class="text-gray-500 text-xs">{event.ip}</p>
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
							<button
								onclick={() => loadUserDrops(userDrops.length)}
								disabled={loadingUserDrops}
								class="w-full mt-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
							>
								{loadingUserDrops ? 'Loading...' : 'Load more'}
							</button>
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
