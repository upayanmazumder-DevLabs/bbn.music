import type { ArtistTypes } from '$lib/api/types.gen';

/**
 * Get a human-readable label for an artist type.
 * @param type - The artist type
 * @param short - If true, returns short form (e.g., "Primary"). If false, returns full form (e.g., "Primary Artist")
 * @returns Human-readable label
 */
export function getArtistTypeLabel(type: ArtistTypes | string, short = false): string {
	if (short) {
		return type.charAt(0) + type.slice(1).toLowerCase();
	}

	switch (type) {
		case 'PRIMARY':
			return 'Primary Artist';
		case 'FEATURING':
			return 'Featuring';
		case 'SONGWRITER':
			return 'Songwriter';
		case 'PRODUCER':
			return 'Producer';
		default:
			return type;
	}
}

type BadgeColor = 'orange' | 'blue' | 'green' | 'purple';

/**
 * Get the badge color for an artist type.
 * @param type - The artist type
 * @returns Badge color
 */
export function getArtistTypeColor(type: ArtistTypes | string): BadgeColor {
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
			return 'blue';
	}
}
