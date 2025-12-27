import type { Artist, ArtistRef } from '$lib/api/types.gen';

/**
 * Get artist name by ID from a list of artists.
 */
export function getArtistNameById(artists: Artist[], id: string): string | undefined {
	return artists.find((a) => a._id === id)?.name;
}

/**
 * Get display name for an ArtistRef.
 * Handles both direct name (PRODUCER/SONGWRITER) and ID reference (PRIMARY/FEATURING).
 */
export function getArtistDisplayName(
	artist: ArtistRef,
	artists: Artist[],
	fallback = 'Unknown',
): string {
	if ('name' in artist && artist.name) {
		return artist.name;
	}
	if ('_id' in artist) {
		return getArtistNameById(artists, artist._id) ?? fallback;
	}
	return fallback;
}

/**
 * Get comma-separated artist names from a list of ArtistRefs.
 * Optionally filter by type (e.g., 'PRIMARY').
 */
export function formatArtistNames(
	refs: ArtistRef[] | undefined,
	artists: Artist[],
	filterType?: ArtistRef['type'],
): string {
	if (!refs || refs.length === 0) return 'Unknown Artist';

	const filtered = filterType ? refs.filter((r) => r.type === filterType) : refs;
	if (filtered.length === 0) return 'Unknown Artist';

	return filtered.map((r) => getArtistDisplayName(r, artists)).join(', ');
}
