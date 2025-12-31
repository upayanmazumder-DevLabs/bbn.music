export type FieldErrors = Record<string, string>;

/**
 * Extract field-specific errors from Zod validation errors.
 * Returns a map of field names to error messages.
 * For non-Zod errors or general errors, returns { _general: message }.
 *
 * @param error - The error to extract field errors from
 * @param fallback - Fallback message if no error message can be extracted
 * @returns A map of field names to error messages
 */
export function extractFieldErrors(error: unknown, fallback = 'An error occurred'): FieldErrors {
	if (!error) return { _general: fallback };

	const message = getErrorMessage(error);
	if (!message) return { _general: fallback };

	// Try to parse as Zod errors
	const fieldErrors = tryParseZodFieldErrors(message);
	if (fieldErrors && Object.keys(fieldErrors).length > 0) {
		return fieldErrors;
	}

	// Not a Zod error, return as general error
	return { _general: message };
}

/**
 * Get the raw error message from various error formats.
 */
function getErrorMessage(error: unknown): string | null {
	if (typeof error === 'string') return error;

	if (typeof error === 'object' && error !== null) {
		const err = error as Record<string, unknown>;

		// Check for nested error.message
		if (err.error && typeof err.error === 'object' && err.error !== null) {
			const nested = err.error as Record<string, unknown>;
			if (typeof nested.message === 'string') {
				return nested.message;
			}
		}

		// Check for direct message property
		if (typeof err.message === 'string') {
			return err.message;
		}
	}

	return null;
}

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
 * Try to parse a string as Zod validation errors and return field-specific errors.
 * Returns null if the string is not a valid Zod error array.
 */
function tryParseZodFieldErrors(message: string): FieldErrors | null {
	const trimmed = message.trim();
	if (!trimmed.startsWith('[')) return null;

	try {
		const issues = JSON.parse(trimmed) as ZodIssue[];
		if (!Array.isArray(issues) || issues.length === 0) return null;

		const fieldErrors: FieldErrors = {};

		for (const issue of issues) {
			// Get the field name from the path (skip 'body' prefix)
			const path = issue.path || [];
			const fieldPath = path[0] === 'body' ? path.slice(1) : path;
			const fieldName = fieldPath[0];

			// Use the first field name as the key, or '_general' for root-level errors
			const key = typeof fieldName === 'string' ? fieldName : '_general';

			// Only keep the first error for each field
			if (!fieldErrors[key]) {
				fieldErrors[key] = formatZodIssueForField(issue);
			}
		}

		return fieldErrors;
	} catch {
		return null;
	}
}

/**
 * Format a Zod issue for field-specific display (without the field name prefix).
 */
function formatZodIssueForField(issue: ZodIssue): string {
	const fieldName = issue.path?.[issue.path.length - 1];
	const fieldNameStr = typeof fieldName === 'string' ? fieldName : undefined;
	const prettyMessage = issue.message ? prettifyZodMessage(issue.message, fieldNameStr) : undefined;

	switch (issue.code) {
		case 'invalid_type':
			if (issue.received === 'undefined') {
				return 'This field is required';
			}
			return 'Invalid value';

		case 'too_small':
			// Extract the min requirement from the message
			if (issue.message?.includes('at least')) {
				const match = issue.message.match(/at least (\d+)/);
				if (match) {
					return `Must be at least ${match[1]} characters`;
				}
			}
			return prettyMessage || 'Value is too short';

		case 'too_big':
			if (issue.message?.includes('at most')) {
				const match = issue.message.match(/at most (\d+)/);
				if (match) {
					return `Must be at most ${match[1]} characters`;
				}
			}
			return prettyMessage || 'Value is too long';

		case 'invalid_string':
			if (issue.message?.toLowerCase().includes('email')) {
				return 'Please enter a valid email address';
			}
			return prettyMessage || 'Invalid format';

		default:
			return prettyMessage || 'Invalid value';
	}
}

/**
 * Format a single Zod issue into a human-readable message.
 */
function formatZodIssue(issue: ZodIssue): string {
	const path = formatPath(issue.path);
	const fieldName = issue.path?.[issue.path.length - 1];
	const fieldNameStr = typeof fieldName === 'string' ? fieldName : undefined;

	// Use the prettifier for the message
	const prettyMessage = issue.message ? prettifyZodMessage(issue.message, fieldNameStr) : undefined;

	switch (issue.code) {
		case 'invalid_type':
			if (issue.received === 'undefined') {
				return path ? `${path} is required` : 'This field is required';
			}
			return path ? `${path} has an invalid value` : `Invalid value`;

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
					return unique[0] || prettyMessage || 'Invalid value';
				}
			}
			return path ? `${path} is invalid` : 'Invalid value';

		case 'invalid_value':
			return path
				? `${path} must be one of: ${issue.values?.join(', ')}`
				: `Must be one of: ${issue.values?.join(', ')}`;

		case 'too_small':
			return prettyMessage || (path ? `${path} is too small` : 'Value is too small');

		case 'too_big':
			return prettyMessage || (path ? `${path} is too large` : 'Value is too large');

		case 'invalid_string':
			return prettyMessage || (path ? `${path} has an invalid format` : 'Invalid format');

		case 'custom':
			return prettyMessage || (path ? `${path} is invalid` : 'Validation error');

		default:
			if (prettyMessage && prettyMessage !== 'Invalid input') {
				return path ? `${path}: ${prettyMessage}` : prettyMessage;
			}
			return path ? `${path} is invalid` : 'Invalid value';
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

/**
 * Prettify a Zod validation error message.
 * Converts technical Zod messages to user-friendly ones.
 *
 * @param message - The raw Zod error message
 * @param fieldName - Optional field name to include in the message
 * @returns A prettified error message
 */
export function prettifyZodMessage(message: string, fieldName?: string): string {
	// Already good custom messages - return as-is
	if (
		message.includes('is required') ||
		message.includes('is too') ||
		message.includes('At least') ||
		message.includes('must be') ||
		message.includes('Invalid')
	) {
		return message;
	}

	const field = fieldName ? humanizeFieldName(fieldName) : '';

	// Map common Zod default messages to user-friendly versions
	const patterns: [RegExp, string | ((match: RegExpMatchArray) => string)][] = [
		[/^Required$/, field ? `${field} is required` : 'This field is required'],
		[
			/^String must contain at least (\d+) character\(s\)$/,
			field ? `${field} is required` : 'This field is required',
		],
		[
			/^String must contain at most (\d+) character\(s\)$/,
			(m) =>
				field
					? `${field} is too long (max ${m[1]} characters)`
					: `Too long (max ${m[1]} characters)`,
		],
		[
			/^Number must be greater than or equal to (\d+)$/,
			(m) => (field ? `${field} must be at least ${m[1]}` : `Must be at least ${m[1]}`),
		],
		[
			/^Number must be less than or equal to (\d+)$/,
			(m) => (field ? `${field} must be at most ${m[1]}` : `Must be at most ${m[1]}`),
		],
		[
			/^Array must contain at least (\d+) element\(s\)$/,
			(m) =>
				field
					? `At least ${m[1]} ${field.toLowerCase()} required`
					: `At least ${m[1]} item(s) required`,
		],
		[/^Expected .+, received .+$/, field ? `${field} has an invalid value` : 'Invalid value'],
		[/^Invalid enum value\..+$/, field ? `${field} has an invalid value` : 'Invalid value'],
		[/^Invalid input$/, field ? `${field} is invalid` : 'Invalid input'],
		[/^Invalid date$/, field ? `${field} must be a valid date` : 'Must be a valid date'],
		[/^Invalid email$/, field ? `${field} must be a valid email` : 'Must be a valid email'],
		[/^Invalid url$/, field ? `${field} must be a valid URL` : 'Must be a valid URL'],
	];

	for (const [pattern, replacement] of patterns) {
		const match = message.match(pattern);
		if (match) {
			return typeof replacement === 'function' ? replacement(match) : replacement;
		}
	}

	// If no pattern matched, return original message
	return message;
}
