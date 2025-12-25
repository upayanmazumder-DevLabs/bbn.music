/**
 * Extract an error message from various error formats.
 * Handles API errors, Zod validation errors, standard Error objects, and unknown error types.
 *
 * @param error - The error to extract a message from
 * @param fallback - Fallback message if no error message can be extracted
 * @returns The error message
 */
export function extractErrorMessage(error: unknown, fallback = 'An error occurred'): string {
	if (!error) return fallback;

	// Handle API error format: { error: { message: string } }
	if (typeof error === 'object' && error !== null) {
		const err = error as Record<string, unknown>;

		// Check for nested error.message
		if (err.error && typeof err.error === 'object' && err.error !== null) {
			const nested = err.error as Record<string, unknown>;
			if (typeof nested.message === 'string') {
				// Check if the message is a JSON array (Zod validation errors)
				const parsed = tryParseZodErrors(nested.message);
				if (parsed) return parsed;
				return nested.message;
			}
		}

		// Check for direct message property
		if (typeof err.message === 'string') {
			// Check if the message is a JSON array (Zod validation errors)
			const parsed = tryParseZodErrors(err.message);
			if (parsed) return parsed;
			return err.message;
		}
	}

	// Handle string errors
	if (typeof error === 'string') {
		const parsed = tryParseZodErrors(error);
		if (parsed) return parsed;
		return error;
	}

	return fallback;
}

interface ZodIssue {
	code?: string;
	path?: (string | number)[];
	message?: string;
	expected?: string;
	received?: string;
	values?: string[];
	errors?: ZodIssue[][];
}

/**
 * Try to parse a string as Zod validation errors and format them nicely.
 * Returns null if the string is not a valid Zod error array.
 */
function tryParseZodErrors(message: string): string | null {
	// Check if it looks like a JSON array
	const trimmed = message.trim();
	if (!trimmed.startsWith('[')) return null;

	try {
		const issues = JSON.parse(trimmed) as ZodIssue[];
		if (!Array.isArray(issues) || issues.length === 0) return null;

		// Format the issues into human-readable messages
		const messages = issues.map(formatZodIssue).filter(Boolean);

		if (messages.length === 0) return null;
		if (messages.length === 1) return messages[0];
		return messages.join('; ');
	} catch {
		return null;
	}
}

/**
 * Format a single Zod issue into a human-readable message.
 */
function formatZodIssue(issue: ZodIssue): string {
	const path = formatPath(issue.path);

	switch (issue.code) {
		case 'invalid_type':
			return path
				? `${path}: expected ${issue.expected}, got ${issue.received}`
				: `Expected ${issue.expected}, got ${issue.received}`;

		case 'invalid_union':
			// For union errors, try to find the most helpful nested error
			if (issue.errors && issue.errors.length > 0) {
				// Get first error from each union branch and pick the most informative
				const nestedMessages = issue.errors
					.map((branch) => (branch[0] ? formatZodIssue(branch[0]) : null))
					.filter(Boolean);

				if (nestedMessages.length > 0) {
					// If they all say the same thing, just use one
					const unique = [...new Set(nestedMessages)];
					if (path) {
						return `${path}: ${unique[0]}`;
					}
					return unique[0] || issue.message || 'Invalid value';
				}
			}
			return path ? `${path}: invalid value` : 'Invalid value';

		case 'invalid_value':
			return path
				? `${path}: invalid value (expected one of: ${issue.values?.join(', ')})`
				: `Invalid value (expected one of: ${issue.values?.join(', ')})`;

		case 'too_small':
			return path ? `${path}: value is too small` : 'Value is too small';

		case 'too_big':
			return path ? `${path}: value is too large` : 'Value is too large';

		case 'invalid_string':
			return path ? `${path}: invalid format` : 'Invalid format';

		case 'custom':
			return path ? `${path}: ${issue.message}` : issue.message || 'Validation error';

		default:
			if (issue.message && issue.message !== 'Invalid input') {
				return path ? `${path}: ${issue.message}` : issue.message;
			}
			return path ? `${path}: invalid value` : 'Invalid value';
	}
}

/**
 * Format a Zod path array into a human-readable string.
 * E.g., ["body", "artists", 2, "name"] -> "Artist 3 name"
 */
function formatPath(path?: (string | number)[]): string {
	if (!path || path.length === 0) return '';

	// Skip 'body' prefix if present
	const parts = path[0] === 'body' ? path.slice(1) : path;
	if (parts.length === 0) return '';

	// Build a human-readable path
	const segments: string[] = [];

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		const nextPart = parts[i + 1];

		if (typeof part === 'string') {
			// Humanize the field name
			const humanized = humanizeFieldName(part);

			// If the next part is a number, combine them (e.g., "Artist 3")
			if (typeof nextPart === 'number') {
				segments.push(`${humanized} ${nextPart + 1}`);
				i++; // Skip the number
			} else {
				segments.push(humanized);
			}
		} else if (typeof part === 'number') {
			// Standalone number (rare case)
			segments.push(`#${part + 1}`);
		}
	}

	return segments.join(' → ');
}

/**
 * Convert a field name to a human-readable format.
 */
function humanizeFieldName(name: string): string {
	// Common field name mappings
	const mappings: Record<string, string> = {
		_id: 'ID',
		gtin: 'UPC/EAN',
		isrc: 'ISRC',
		artists: 'Artist',
		songs: 'Song',
		primaryGenre: 'Primary genre',
		secondaryGenre: 'Secondary genre',
		compositionCopyright: 'Composition copyright',
		soundRecordingCopyright: 'Sound recording copyright',
		firstName: 'First name',
		lastName: 'Last name',
		dateOfBirth: 'Date of birth',
		postalCode: 'Postal code',
	};

	if (mappings[name]) return mappings[name];

	// Convert camelCase to Title Case with spaces
	return name
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (str) => str.toUpperCase())
		.trim();
}
