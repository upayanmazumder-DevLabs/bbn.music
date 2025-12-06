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
		ArtistSearch,
	} from '$lib/components/ui';
	import { primaryGenres, getSecondaryGenres } from '$lib/data/genres';
	import { languages, getLanguageName } from '$lib/data/languages';
	import {
		getIdByDropsByMusic,
		patchIdByDropsByMusic,
		postTypeByTypeByDropByMusic,
		getArtworkByDropByMusic,
		postShareByDropsByMusic,
		getIdByShareByDropsByMusic,
		deleteIdByShareByDropsByMusic,
	} from '$lib/api';
	import { getAuthHeaders, auth } from '$lib/stores/auth';
	import type { FullDrop, DropType, Song, ArtistRef, Share } from '$lib/api/types.gen';
	import { artistTypes, type ArtistType } from '$lib/types/drop';

	// Drop ID is always defined in this route (guaranteed by SvelteKit routing)
	const dropId = $page.params.id!;

	// Form state
	let drop = $state<FullDrop | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let artworkUrl = $state<string | null>(null);

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
	let tempArtist = $state<{ type: ArtistType; _id: string | null; name: string }>({
		type: 'PRIMARY',
		_id: null,
		name: '',
	});
	let showStatusChangeModal = $state(false);
	let pendingStatusChange = $state<DropType | null>(null);

	// Derived values
	const secondaryGenreOptions = $derived(getSecondaryGenres(primaryGenre));
	const isEditable = $derived(drop?.type === 'UNSUBMITTED' || drop?.type === 'PRIVATE');
	const canSubmitForReview = $derived(drop?.type === 'UNSUBMITTED');
	const canCancelReview = $derived(drop?.type === 'UNDER_REVIEW');
	const canRequestTakedown = $derived(drop?.type === 'PUBLISHED');
	const canCancelTakedown = $derived(drop?.type === 'TAKEDOWN_REQUESTED');
	const isAdmin = $derived($auth.user?.isAdmin ?? false);

	onMount(async () => {
		await loadDrop();
	});

	async function loadDrop() {
		loading = true;
		error = null;
		try {
			const response = await getIdByDropsByMusic({
				path: { id: dropId },
				headers: getAuthHeaders(),
			});
			if (response.data) {
				drop = response.data as FullDrop;
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
				artists = [...drop.artists];

				// Load artwork if available
				if (drop.artwork) {
					loadArtwork(drop._id);
				}

				// Load share link only for published drops
				if (drop.type === 'PUBLISHED') {
					await loadShare();
				}
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load drop';
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
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create share link';
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
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete share link';
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
				},
				headers: getAuthHeaders(),
			});
			successMessage = 'Drop saved successfully';
			hasChanges = false;
			await loadDrop();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save drop';
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
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update status';
		} finally {
			saving = false;
			pendingStatusChange = null;
		}
	}

	function getStatusChangeMessage(type: DropType | null): string {
		if (!type) return '';

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
		tempArtist = { type: 'PRIMARY', _id: null, name: '' };
		editingArtistIndex = null;
		showArtistModal = true;
	}

	function openEditArtist(index: number) {
		const artist = artists[index];
		if ('_id' in artist) {
			tempArtist = {
				type: artist.type as ArtistType,
				_id: artist._id,
				name: '',
			};
		} else {
			tempArtist = {
				type: artist.type as ArtistType,
				_id: null,
				name: artist.name,
			};
		}
		editingArtistIndex = index;
		showArtistModal = true;
	}

	function saveArtist() {
		let newArtist: ArtistRef;
		if (tempArtist.type === 'PRIMARY' || tempArtist.type === 'FEATURING') {
			newArtist = { _id: tempArtist._id ?? '', type: tempArtist.type };
		} else {
			newArtist = { name: tempArtist.name, type: tempArtist.type };
		}

		if (editingArtistIndex !== null) {
			artists[editingArtistIndex] = newArtist;
		} else {
			artists = [...artists, newArtist];
		}
		showArtistModal = false;
		markChanged();
	}

	function removeArtist(index: number) {
		artists = artists.filter((_, i) => i !== index);
		markChanged();
	}

	function getStatusColor(type: DropType | undefined): string {
		switch (type) {
			case 'PUBLISHED':
				return 'bg-green-500/20 text-green-400 border-green-500/30';
			case 'PUBLISHING':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
			case 'UNDER_REVIEW':
				return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
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

	function getArtistTypeLabel(type: string): string {
		return type.charAt(0) + type.slice(1).toLowerCase();
	}

	function getArtistDisplayName(artist: ArtistRef): string {
		if ('name' in artist) return artist.name;
		return artist._id;
	}
</script>

<svelte:head>
	<title>{drop?.title ?? 'Loading...'} - Edit Drop - bbn.music</title>
</svelte:head>

<div class="min-h-screen max-w-6xl mx-auto">
	<!-- Header -->
	<div class="flex items-center gap-4 mb-6">
		<Button variant="secondary" href="/drops">
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

		<!-- Non-editable notice -->
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
						{:else if drop.type === 'PUBLISHED'}
							This drop has been published. To make changes, you'll need to request a takedown
							first.
						{:else}
							This drop cannot be edited in its current status.
						{/if}
					</p>
				</div>
			</div>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Left Column: Artwork -->
			<div class="lg:col-span-1">
				<Card variant="glass" padding="md">
					<h3 class="text-lg font-semibold text-white mb-4">Artwork</h3>
					<div class="aspect-square rounded-xl overflow-hidden bg-gray-800 mb-4">
						{#if artworkUrl}
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
						<Button variant="secondary" class="w-full" disabled>
							<UploadOutline class="w-4 h-4" /> Change Artwork
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
						<div class="space-y-2 text-sm">
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
							disabled={!isEditable}
							oninput={markChanged}
							hint={drop.gtin ? undefined : 'Will be auto-generated when published'}
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

					<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
						{#each artists as artist, index}
							<div
								class="group flex items-center gap-3 p-3 bg-gray-900/50 rounded-xl border border-gray-700/50"
							>
								<div
									class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"
								>
									<UserSolid class="w-5 h-5 text-orange-400" />
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-white font-medium truncate">{getArtistDisplayName(artist)}</p>
									<p class="text-sm text-gray-400">{getArtistTypeLabel(artist.type)}</p>
								</div>
								{#if isEditable}
									<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<IconButton onclick={() => openEditArtist(index)}>
											<EditOutline class="w-4 h-4" />
										</IconButton>
										<IconButton onclick={() => removeArtist(index)}>
											<TrashBinOutline class="w-4 h-4 text-red-400" />
										</IconButton>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</Card>

				<!-- Songs -->
				<Card variant="glass" padding="md">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-white">Songs</h3>
						<Badge color="gray">{drop.songs.length} track{drop.songs.length !== 1 ? 's' : ''}</Badge
						>
					</div>

					<div class="space-y-2">
						{#each drop.songs as song, index}
							<div
								class="flex items-center gap-4 p-3 bg-gray-900/50 rounded-xl border border-gray-700/50"
							>
								<div
									class="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-sm"
								>
									{index + 1}
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-white font-medium truncate">{song.title}</p>
									<p class="text-sm text-gray-400 truncate">
										{song.artists
											.filter((a) => a.type === 'PRIMARY')
											.map((a) => ('name' in a ? a.name : a._id))
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
								</div>
							</div>
						{/each}
					</div>
				</Card>

				<!-- Share & Distribution (Only for Published Drops) -->
				{#if drop?.type === 'PUBLISHED'}
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

		<ArtistSearch
			selectedArtist={{ _id: tempArtist._id, name: tempArtist.name }}
			onselect={(artist) => {
				tempArtist._id = artist._id;
				tempArtist.name = artist.name;
			}}
			label={tempArtist.type === 'SONGWRITER' || tempArtist.type === 'PRODUCER'
				? 'Full Name (First Last)'
				: 'Artist Name'}
			placeholder={tempArtist.type === 'SONGWRITER' || tempArtist.type === 'PRODUCER'
				? 'Search or enter full name...'
				: 'Search existing artists or create new...'}
		/>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showArtistModal = false)}>Cancel</Button>
		<Button onclick={saveArtist} disabled={!tempArtist.name && !tempArtist._id}>Save Artist</Button>
	{/snippet}
</Modal>

<!-- Status Change Confirmation Modal -->
<Modal bind:open={showStatusChangeModal} title="Confirm Status Change" size="md">
	<div class="space-y-4">
		<div class="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
			<ExclamationCircleOutline class="w-6 h-6 text-yellow-400 mt-0.5 flex-shrink-0" />
			<p class="text-white">{getStatusChangeMessage(pendingStatusChange)}</p>
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
