export interface FormatDateOptions {
	/** Include time in the output */
	includeTime?: boolean;
	/** Locale to use (default: 'en-US') */
	locale?: string;
}

/**
 * Format a date string or timestamp for display.
 * Handles ISO strings, Unix timestamps (seconds or milliseconds), and Date objects.
 *
 * @param input - Date string, Unix timestamp, or Date object
 * @param options - Formatting options
 * @returns Formatted date string (e.g., "Jan 15, 2024" or "Jan 15, 2024, 3:30 PM")
 */
export function formatDate(
	input: string | number | Date | undefined | null,
	options: FormatDateOptions = {}
): string {
	if (!input) return 'N/A';

	const { includeTime = false, locale = 'en-US' } = options;

	let date: Date;

	if (input instanceof Date) {
		date = input;
	} else if (typeof input === 'number') {
		// If it's a small number, it's likely seconds; convert to milliseconds
		date = new Date(input < 10000000000 ? input * 1000 : input);
	} else if (typeof input === 'string' && /^\d+$/.test(input)) {
		// Handle numeric strings (Unix timestamps as strings)
		const num = parseInt(input, 10);
		date = new Date(num < 10000000000 ? num * 1000 : num);
	} else {
		date = new Date(input);
	}

	if (isNaN(date.getTime())) {
		return 'Invalid date';
	}

	const dateOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	};

	if (includeTime) {
		dateOptions.hour = 'numeric';
		dateOptions.minute = '2-digit';
	}

	return date.toLocaleDateString(locale, dateOptions);
}
