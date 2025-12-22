<script lang="ts">
	import { Button, IconButton } from '$lib/components/ui';
	import { PlusOutline, EditOutline, TrashBinOutline, UserSolid } from 'flowbite-svelte-icons';
	import type { ArtistRef, ArtistType } from '$lib/types/drop';
	import { getArtistTypeLabel } from '$lib/utils/artistTypes';

	interface Props {
		artists: ArtistRef[];
		editable?: boolean;
		onadd?: () => void;
		onedit?: (index: number) => void;
		onremove?: (index: number) => void;
		emptyMessage?: string;
		compact?: boolean;
		grid?: boolean;
		resolveName?: (id: string) => string | undefined;
	}

	const {
		artists,
		editable = true,
		onadd,
		onedit,
		onremove,
		emptyMessage = 'No artists added yet',
		compact = false,
		grid = true,
		resolveName,
	}: Props = $props();

	function getArtistDisplayName(artist: ArtistRef): string {
		if ('name' in artist) {
			return artist.name || 'Unknown';
		}
		// PRIMARY or FEATURING - resolve from ID
		if ('_id' in artist && resolveName) {
			return resolveName(artist._id) || 'Unknown Artist';
		}
		return 'Unknown Artist';
	}
</script>

<div class="space-y-3">
	{#if editable && onadd}
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium text-gray-300">Artists</span>
			<Button size="sm" variant="secondary" onclick={onadd}>
				<PlusOutline class="w-3 h-3" /> Add
			</Button>
		</div>
	{/if}

	{#if artists.length === 0}
		<p class="text-sm text-gray-500 italic py-2">{emptyMessage}</p>
	{:else}
		<div class={grid ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2'}>
			{#each artists as artist, index}
				<div
					class="group flex items-center gap-3 p-{compact
						? '2'
						: '3'} bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-orange-500/50 transition-colors"
				>
					<div
						class="w-{compact ? '8' : '10'} h-{compact
							? '8'
							: '10'} rounded-full bg-orange-500/20 flex items-center justify-center"
					>
						<UserSolid class="w-{compact ? '4' : '5'} h-{compact ? '4' : '5'} text-orange-400" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-white {compact ? 'text-sm' : ''} font-medium truncate">
							{getArtistDisplayName(artist)}
						</p>
						<p class="text-xs text-gray-400">{getArtistTypeLabel(artist.type)}</p>
					</div>
					{#if editable && (onedit || onremove)}
						<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							{#if onedit}
								<IconButton onclick={() => onedit(index)} aria-label="Edit artist">
									<EditOutline class="w-{compact ? '3' : '4'} h-{compact ? '3' : '4'}" />
								</IconButton>
							{/if}
							{#if onremove}
								<IconButton onclick={() => onremove(index)} aria-label="Remove artist">
									<TrashBinOutline
										class="w-{compact ? '3' : '4'} h-{compact ? '3' : '4'} text-red-400"
									/>
								</IconButton>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
