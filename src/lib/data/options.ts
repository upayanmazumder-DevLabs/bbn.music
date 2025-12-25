/**
 * Shared select options for drop and song forms.
 * Centralizes the creation of options arrays used across multiple pages.
 */

import { primaryGenres, getSecondaryGenres } from './genres';
import { languages } from './languages';

/** Options for primary genre select */
export const primaryGenreOptions = primaryGenres.map((g) => ({ value: g, label: g }));

/** Options for language select */
export const languageOptions = Object.entries(languages).map(([code, name]) => ({
	value: code,
	label: name,
}));

/** Get options for secondary genre select based on primary genre */
export function getSecondaryGenreOptions(primaryGenre: string) {
	return getSecondaryGenres(primaryGenre).map((g) => ({ value: g, label: g }));
}
