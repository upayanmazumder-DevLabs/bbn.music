/**
 * Extract an error message from various error formats.
 * Handles API errors, standard Error objects, and unknown error types.
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
				return nested.message;
			}
		}

		// Check for direct message property
		if (typeof err.message === 'string') {
			return err.message;
		}
	}

	// Handle string errors
	if (typeof error === 'string') {
		return error;
	}

	return fallback;
}
