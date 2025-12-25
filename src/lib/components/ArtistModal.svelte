<script lang="ts">
	import { Modal, Button, Input, Select } from '$lib/components/ui';
	import ArtistSearch from '$lib/components/ui/ArtistSearch.svelte';
	import { artistTypes, type ArtistType, type ArtistRef } from '$lib/types/drop';
	import { getArtistTypeLabel } from '$lib/utils/artistTypes';

	interface Props {
		open: boolean;
		artist: ArtistRef | null;
		onclose: () => void;
		onsave: (artist: ArtistRef) => void;
		title?: string;
	}

	let { open = $bindable(), artist, onclose, onsave, title }: Props = $props();

	// Internal state
	let artistType = $state<ArtistType>('PRIMARY');
	let artistId = $state<string | null>(null);
	let artistName = $state('');
	let firstName = $state('');
	let lastName = $state('');

	// Reset form when artist changes or modal opens
	$effect(() => {
		if (open) {
			if (artist) {
				artistType = artist.type;

				if (artist.type === 'SONGWRITER' || artist.type === 'PRODUCER') {
					// PRODUCER/SONGWRITER have name, no _id
					artistId = null;
					artistName = '';
					const name = artist.name || '';
					// Split the name at the last space
					const lastSpaceIndex = name.lastIndexOf(' ');
					if (lastSpaceIndex > 0) {
						firstName = name.substring(0, lastSpaceIndex);
						lastName = name.substring(lastSpaceIndex + 1);
					} else {
						firstName = name;
						lastName = '';
					}
				} else {
					// PRIMARY/FEATURING have _id, optionally name (for new artists)
					artistId = '_id' in artist ? artist._id : null;
					artistName = ('name' in artist && artist.name) || '';
					firstName = '';
					lastName = '';
				}
			} else {
				// New artist
				artistType = 'PRIMARY';
				artistId = null;
				artistName = '';
				firstName = '';
				lastName = '';
			}
		}
	});

	// Check if form is valid
	const isValid = $derived.by(() => {
		if (artistType === 'SONGWRITER' || artistType === 'PRODUCER') {
			return firstName.trim().length > 0 && lastName.trim().length > 0;
		}
		return artistName.trim().length > 0 || artistId !== null;
	});

	function handleSave() {
		let newArtist: ArtistRef;

		if (artistType === 'SONGWRITER' || artistType === 'PRODUCER') {
			// PRODUCER/SONGWRITER only have name, no _id
			const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
			newArtist = { type: artistType, name: fullName };
		} else {
			// PRIMARY/FEATURING have _id, include name for new artists (when _id is null)
			newArtist = {
				type: artistType,
				_id: artistId,
				...(artistId === null && artistName ? { name: artistName } : {}),
			};
		}

		onsave(newArtist);
	}

	function handleClose() {
		onclose();
	}
</script>

<Modal
	bind:open
	title={title ?? (artist ? 'Edit Artist' : 'Add Artist')}
	size="md"
	class="bg-gray-800"
>
	<div class="space-y-4">
		<Select bind:value={artistType} label="Artist Type">
			{#each artistTypes as type}
				<option value={type}>{getArtistTypeLabel(type)}</option>
			{/each}
		</Select>

		{#if artistType === 'SONGWRITER' || artistType === 'PRODUCER'}
			<div class="grid grid-cols-2 gap-4">
				<Input bind:value={firstName} label="First Name" placeholder="John" required />
				<Input bind:value={lastName} label="Last Name" placeholder="Doe" required />
			</div>
			<p class="text-xs text-gray-500">
				Enter the legal name of the {artistType.toLowerCase()}. This will be displayed as "{firstName ||
					'First'}
				{lastName || 'Last'}".
			</p>
		{:else}
			<ArtistSearch
				selectedArtist={{ _id: artistId, name: artistName }}
				onselect={(selected) => {
					artistId = selected._id;
					artistName = selected.name;
				}}
				label="Artist Name"
				placeholder="Search existing artists or create new..."
			/>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={handleClose}>Cancel</Button>
		<Button onclick={handleSave} disabled={!isValid}>Save Artist</Button>
	{/snippet}
</Modal>
