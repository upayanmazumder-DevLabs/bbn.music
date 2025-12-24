<script lang="ts">
	import type { FullDrop, ArtistRef, Song, Artist } from '$lib/api/types.gen';
	import { Badge, Card } from '$lib/components/ui';
	import { ChevronDownOutline, ChevronUpOutline } from 'flowbite-svelte-icons';

	interface Props {
		current: FullDrop;
		published: FullDrop;
		artistList?: Artist[];
	}

	let { current, published, artistList = [] }: Props = $props();

	// Track expanded sections
	let expandedSongs = $state<Record<string, boolean>>({});

	function resolveArtistName(artistId: string): string {
		return artistList.find((a) => a._id === artistId)?.name ?? artistId;
	}

	function getArtistDisplayName(artist: ArtistRef): string {
		return 'name' in artist ? artist.name : resolveArtistName(artist._id);
	}

	function isDifferent(a: unknown, b: unknown): boolean {
		return JSON.stringify(a) !== JSON.stringify(b);
	}

	// Compare drop-level fields
	const metadataFields = $derived([
		{ key: 'title', label: 'Title', current: current.title, published: published.title },
		{ key: 'release', label: 'Release Date', current: current.release, published: published.release },
		{ key: 'artwork', label: 'Artwork', current: current.artwork, published: published.artwork },
		{ key: 'language', label: 'Language', current: current.language, published: published.language },
		{ key: 'primaryGenre', label: 'Primary Genre', current: current.primaryGenre, published: published.primaryGenre },
		{ key: 'secondaryGenre', label: 'Secondary Genre', current: current.secondaryGenre, published: published.secondaryGenre },
		{ key: 'compositionCopyright', label: 'Composition (C)', current: current.compositionCopyright, published: published.compositionCopyright },
		{ key: 'soundRecordingCopyright', label: 'Sound Recording (P)', current: current.soundRecordingCopyright, published: published.soundRecordingCopyright },
		{ key: 'gtin', label: 'GTIN', current: current.gtin, published: published.gtin },
		{ key: 'comments', label: 'Comments', current: current.comments, published: published.comments },
	]);

	const changedMetadata = $derived(metadataFields.filter((f) => isDifferent(f.current, f.published)));
	const unchangedMetadata = $derived(metadataFields.filter((f) => !isDifferent(f.current, f.published)));

	// Compare artists
	function artistsMatch(a: ArtistRef, b: ArtistRef): boolean {
		if (a.type !== b.type) return false;
		if ('name' in a && 'name' in b) return a.name === b.name;
		if ('_id' in a && '_id' in b) return a._id === b._id;
		return false;
	}

	const artistChanges = $derived.by(() => {
		const added: ArtistRef[] = [];
		const removed: ArtistRef[] = [];
		const unchanged: ArtistRef[] = [];

		// Find removed and unchanged
		for (const pubArtist of published.artists) {
			const found = current.artists.find((a) => artistsMatch(a, pubArtist));
			if (found) {
				unchanged.push(pubArtist);
			} else {
				removed.push(pubArtist);
			}
		}

		// Find added
		for (const curArtist of current.artists) {
			const found = published.artists.find((a) => artistsMatch(a, curArtist));
			if (!found) {
				added.push(curArtist);
			}
		}

		return { added, removed, unchanged };
	});

	// Compare songs by ISRC or by index if no ISRC
	const songChanges = $derived.by(() => {
		const added: Song[] = [];
		const removed: Song[] = [];
		const modified: Array<{ current: Song; published: Song; changes: string[] }> = [];
		const unchanged: Song[] = [];

		// Map published songs by ISRC for quick lookup
		const publishedByIsrc = new Map<string, Song>();
		const publishedNoIsrc: Song[] = [];
		for (const song of published.songs) {
			if (song.isrc) {
				publishedByIsrc.set(song.isrc, song);
			} else {
				publishedNoIsrc.push(song);
			}
		}

		// Map current songs by ISRC
		const currentByIsrc = new Map<string, Song>();
		const currentNoIsrc: Song[] = [];
		for (const song of current.songs) {
			if (song.isrc) {
				currentByIsrc.set(song.isrc, song);
			} else {
				currentNoIsrc.push(song);
			}
		}

		// Find modified and unchanged (by ISRC)
		for (const [isrc, pubSong] of publishedByIsrc) {
			const curSong = currentByIsrc.get(isrc);
			if (curSong) {
				const changes = getSongChanges(curSong, pubSong);
				if (changes.length > 0) {
					modified.push({ current: curSong, published: pubSong, changes });
				} else {
					unchanged.push(pubSong);
				}
			} else {
				removed.push(pubSong);
			}
		}

		// Find added songs (by ISRC)
		for (const [isrc, curSong] of currentByIsrc) {
			if (!publishedByIsrc.has(isrc)) {
				added.push(curSong);
			}
		}

		// Handle songs without ISRC by matching by title
		for (const pubSong of publishedNoIsrc) {
			const curSong = currentNoIsrc.find((s) => s.title === pubSong.title);
			if (curSong) {
				const changes = getSongChanges(curSong, pubSong);
				if (changes.length > 0) {
					modified.push({ current: curSong, published: pubSong, changes });
				} else {
					unchanged.push(pubSong);
				}
			} else {
				removed.push(pubSong);
			}
		}

		for (const curSong of currentNoIsrc) {
			const found = publishedNoIsrc.find((s) => s.title === curSong.title);
			if (!found) {
				added.push(curSong);
			}
		}

		return { added, removed, modified, unchanged };
	});

	function getSongChanges(current: Song, published: Song): string[] {
		const changes: string[] = [];
		if (current.title !== published.title) changes.push('title');
		if (current.file !== published.file) changes.push('file');
		if (current.isrc !== published.isrc) changes.push('isrc');
		if (current.explicit !== published.explicit) changes.push('explicit');
		if (current.instrumental !== published.instrumental) changes.push('instrumental');
		if (current.primaryGenre !== published.primaryGenre) changes.push('primaryGenre');
		if (current.secondaryGenre !== published.secondaryGenre) changes.push('secondaryGenre');
		if (current.year !== published.year) changes.push('year');
		if (current.language !== published.language) changes.push('language');
		if (current.country !== published.country) changes.push('country');
		if (current.lyrics !== published.lyrics) changes.push('lyrics');
		if (current.timedLyrics !== published.timedLyrics) changes.push('timedLyrics');
		if (JSON.stringify(current.artists) !== JSON.stringify(published.artists)) changes.push('artists');
		return changes;
	}

	const hasAnyChanges = $derived(
		changedMetadata.length > 0 ||
		artistChanges.added.length > 0 ||
		artistChanges.removed.length > 0 ||
		songChanges.added.length > 0 ||
		songChanges.removed.length > 0 ||
		songChanges.modified.length > 0
	);

	function toggleSong(songId: string) {
		expandedSongs[songId] = !expandedSongs[songId];
	}
</script>

<div class="space-y-4">
	<!-- Summary -->
	<div class="flex items-center gap-3 flex-wrap">
		{#if !hasAnyChanges}
			<Badge color="green">No Changes</Badge>
		{:else}
			{#if changedMetadata.length > 0}
				<Badge color="orange">{changedMetadata.length} metadata changed</Badge>
			{/if}
			{#if artistChanges.added.length > 0}
				<Badge color="green">+{artistChanges.added.length} artists</Badge>
			{/if}
			{#if artistChanges.removed.length > 0}
				<Badge color="red">-{artistChanges.removed.length} artists</Badge>
			{/if}
			{#if songChanges.added.length > 0}
				<Badge color="green">+{songChanges.added.length} songs</Badge>
			{/if}
			{#if songChanges.removed.length > 0}
				<Badge color="red">-{songChanges.removed.length} songs</Badge>
			{/if}
			{#if songChanges.modified.length > 0}
				<Badge color="orange">{songChanges.modified.length} songs modified</Badge>
			{/if}
		{/if}
	</div>

	<!-- Metadata Changes -->
	{#if changedMetadata.length > 0}
		<div class="space-y-2">
			<h4 class="text-sm font-medium text-gray-400">Metadata Changes</h4>
			<div class="overflow-hidden rounded-lg border border-gray-700">
				<table class="w-full text-sm">
					<thead class="bg-gray-800/50">
						<tr>
							<th class="px-3 py-2 text-left text-gray-400 font-medium">Field</th>
							<th class="px-3 py-2 text-left text-gray-400 font-medium">Published</th>
							<th class="px-3 py-2 text-left text-gray-400 font-medium">Current</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-700/50">
						{#each changedMetadata as field}
							<tr class="bg-orange-900/10">
								<td class="px-3 py-2 text-gray-300 font-medium">{field.label}</td>
								<td class="px-3 py-2">
									{#if field.key === 'artwork'}
										<span class="text-red-400 text-xs italic">original</span>
									{:else}
										<span class="text-red-400 line-through">{field.published || '(empty)'}</span>
									{/if}
								</td>
								<td class="px-3 py-2">
									{#if field.key === 'artwork'}
										<span class="text-green-400 text-xs font-medium">replaced</span>
									{:else}
										<span class="text-green-400">{field.current || '(empty)'}</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Unchanged Metadata (collapsed by default) -->
	{#if unchangedMetadata.length > 0 && changedMetadata.length > 0}
		<details class="text-sm">
			<summary class="text-gray-500 cursor-pointer hover:text-gray-400">
				{unchangedMetadata.length} unchanged fields
			</summary>
			<div class="mt-2 grid grid-cols-2 gap-2 text-xs p-3 bg-gray-800/30 rounded-lg">
				{#each unchangedMetadata as field}
					<div>
						<span class="text-gray-500">{field.label}:</span>
						<span class="text-gray-400 ml-1">{field.current || '(empty)'}</span>
					</div>
				{/each}
			</div>
		</details>
	{/if}

	<!-- Artist Changes -->
	{#if artistChanges.added.length > 0 || artistChanges.removed.length > 0}
		<div class="space-y-2">
			<h4 class="text-sm font-medium text-gray-400">Artist Changes</h4>
			<div class="space-y-1">
				{#each artistChanges.removed as artist}
					<div class="flex items-center gap-2 px-3 py-2 bg-red-900/20 rounded-lg border border-red-700/30">
						<span class="text-red-400 font-mono">-</span>
						<Badge color="gray" size="sm">{artist.type}</Badge>
						<span class="text-red-300">{getArtistDisplayName(artist)}</span>
					</div>
				{/each}
				{#each artistChanges.added as artist}
					<div class="flex items-center gap-2 px-3 py-2 bg-green-900/20 rounded-lg border border-green-700/30">
						<span class="text-green-400 font-mono">+</span>
						<Badge color="gray" size="sm">{artist.type}</Badge>
						<span class="text-green-300">{getArtistDisplayName(artist)}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Song Changes -->
	{#if songChanges.added.length > 0 || songChanges.removed.length > 0 || songChanges.modified.length > 0}
		<div class="space-y-2">
			<h4 class="text-sm font-medium text-gray-400">Song Changes</h4>
			<div class="space-y-2">
				<!-- Removed songs -->
				{#each songChanges.removed as song}
					<div class="px-3 py-2 bg-red-900/20 rounded-lg border border-red-700/30">
						<div class="flex items-center gap-2">
							<span class="text-red-400 font-mono">-</span>
							<span class="text-red-300 font-medium">{song.title}</span>
							{#if song.isrc}
								<code class="text-red-400/70 text-xs">{song.isrc}</code>
							{/if}
						</div>
					</div>
				{/each}

				<!-- Added songs -->
				{#each songChanges.added as song}
					<div class="px-3 py-2 bg-green-900/20 rounded-lg border border-green-700/30">
						<div class="flex items-center gap-2">
							<span class="text-green-400 font-mono">+</span>
							<span class="text-green-300 font-medium">{song.title}</span>
							{#if song.isrc}
								<code class="text-green-400/70 text-xs">{song.isrc}</code>
							{/if}
						</div>
					</div>
				{/each}

				<!-- Modified songs -->
				{#each songChanges.modified as { current: curSong, published: pubSong, changes }}
					<div class="bg-orange-900/10 rounded-lg border border-orange-700/30 overflow-hidden">
						<button
							class="w-full px-3 py-2 flex items-center justify-between hover:bg-orange-900/20 transition-colors"
							onclick={() => toggleSong(curSong._id)}
						>
							<div class="flex items-center gap-2">
								<span class="text-orange-400 font-mono">~</span>
								<span class="text-orange-300 font-medium">{curSong.title}</span>
								{#if curSong.isrc}
									<code class="text-orange-400/70 text-xs">{curSong.isrc}</code>
								{/if}
								<Badge color="orange" size="sm">{changes.length} changes</Badge>
							</div>
							{#if expandedSongs[curSong._id]}
								<ChevronUpOutline class="w-4 h-4 text-gray-400" />
							{:else}
								<ChevronDownOutline class="w-4 h-4 text-gray-400" />
							{/if}
						</button>
						{#if expandedSongs[curSong._id]}
							<div class="px-3 py-2 border-t border-orange-700/30 space-y-2">
								{#each changes as change}
									{@const pubValue = pubSong[change as keyof Song]}
									{@const curValue = curSong[change as keyof Song]}
									<div class="grid grid-cols-3 gap-2 text-sm">
										<div class="text-gray-400 font-medium">
											{#if change === 'file'}
												audio file
											{:else}
												{change}
											{/if}
										</div>
										<div class="text-red-400">
											{#if change === 'file'}
												<span class="text-xs italic">original</span>
											{:else if change === 'artists'}
												{(pubValue as ArtistRef[])?.map((a) => getArtistDisplayName(a)).join(', ') || '(none)'}
											{:else if change === 'lyrics' || change === 'timedLyrics'}
												<span class="text-xs">{pubValue ? `${String(pubValue).length} chars` : '(empty)'}</span>
											{:else if typeof pubValue === 'boolean'}
												{pubValue ? 'Yes' : 'No'}
											{:else}
												{pubValue ?? '(empty)'}
											{/if}
										</div>
										<div class="text-green-400">
											{#if change === 'file'}
												<span class="text-xs font-medium">replaced</span>
											{:else if change === 'artists'}
												{(curValue as ArtistRef[])?.map((a) => getArtistDisplayName(a)).join(', ') || '(none)'}
											{:else if change === 'lyrics' || change === 'timedLyrics'}
												<span class="text-xs">{curValue ? `${String(curValue).length} chars` : '(empty)'}</span>
											{:else if typeof curValue === 'boolean'}
												{curValue ? 'Yes' : 'No'}
											{:else}
												{curValue ?? '(empty)'}
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Unchanged songs summary -->
	{#if songChanges.unchanged.length > 0}
		<p class="text-sm text-gray-500">
			{songChanges.unchanged.length} song{songChanges.unchanged.length === 1 ? '' : 's'} unchanged
		</p>
	{/if}
</div>
