import { browser } from '$app/environment';
import posthog from 'posthog-js';

let initialized = false;

/**
 * Initialize PostHog with cookieless mode for GDPR/TTDSG compliance.
 *
 * With cookieless_mode: 'on_reject':
 * - Before consent decision: no tracking
 * - After accept: full tracking with cookies/localStorage
 * - After decline: anonymous cookieless tracking (privacy-preserving hash)
 *
 * This allows maximum tracking while remaining legally compliant in Germany.
 * PostHog is disabled on localhost to avoid polluting analytics with dev traffic.
 */
export function initPostHog(): void {
	if (!browser || initialized) return;

	// Don't load PostHog on localhost
	if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
		return;
	}

	posthog.init('phc_JZUdortcJ5IA9FtbzYXLv5QzqFE8umJaUz2PSvo9yzJ', {
		api_host: 'https://hedgehog.bbn.music',
		capture_pageview: false, // We control this manually
		capture_pageleave: true, // Track when users leave pages
		autocapture: true, // Auto-track clicks, form submissions, etc.
		persistence: 'localStorage+cookie',
		// GDPR/TTDSG compliant: cookieless tracking for users who decline
		cookieless_mode: 'on_reject',
		// Session recording (only for consented users)
		disable_session_recording: false,
		session_recording: {
			// Mask all text inputs for privacy
			maskAllInputs: true,
			// Mask sensitive text content
			maskTextSelector: '[data-mask]',
		},
		// Capture performance metrics
		capture_performance: true,
	});

	initialized = true;
}

/**
 * User accepted cookies - enable full tracking with persistence.
 */
export function acceptTracking(): void {
	if (!browser || !initialized) return;
	posthog.opt_in_capturing();
}

/**
 * User declined cookies - switch to cookieless anonymous tracking.
 * With cookieless_mode: 'on_reject', this enables privacy-preserving tracking.
 */
export function declineTracking(): void {
	if (!browser || !initialized) return;
	posthog.opt_out_capturing();
}

/**
 * Identify user with personal data (only when consent given).
 */
export function identifyUser(user: {
	id: string;
	email: string;
	username: string;
	isAdmin?: boolean;
}): void {
	// Only identify if user has opted in (has given cookie consent)
	// In cookieless mode, identify() is not allowed
	if (!browser || !initialized || !posthog.has_opted_in_capturing()) return;

	posthog.identify(user.id, {
		email: user.email,
		username: user.username,
		is_admin: user.isAdmin ?? false,
	});
}

/**
 * Reset user identity (on logout).
 */
export function resetUser(): void {
	if (!browser || !initialized) return;
	posthog.reset();
}

/**
 * Track a page view. Works in both full and cookieless mode.
 */
export function trackPageView(url: string): void {
	if (!browser || !initialized) return;

	posthog.capture('$pageview', {
		$current_url: url,
	});
}

/**
 * Track a custom event with optional properties.
 * Works in both full and cookieless mode.
 *
 * @example
 * trackEvent('song_uploaded', { genre: 'electronic', duration: 180 });
 * trackEvent('payout_requested', { amount: 150.00 });
 * trackEvent('drop_published', { songCount: 5 });
 */
export function trackEvent(
	event: string,
	properties?: Record<string, string | number | boolean | null | undefined>,
): void {
	if (!browser || !initialized) return;

	posthog.capture(event, properties);
}

/**
 * Capture an exception/error with context.
 * Useful for error tracking and debugging.
 *
 * @example
 * try {
 *   await uploadSong(file);
 * } catch (error) {
 *   captureException(error, { file_name: file.name, file_size: file.size });
 * }
 */
export function captureException(
	error: Error | string,
	context?: Record<string, string | number | boolean | null | undefined>,
): void {
	if (!browser || !initialized) return;

	const errorMessage = error instanceof Error ? error.message : error;
	const errorStack = error instanceof Error ? error.stack : undefined;

	posthog.capture('$exception', {
		$exception_message: errorMessage,
		$exception_stack_trace_raw: errorStack,
		$exception_type: error instanceof Error ? error.name : 'Error',
		...context,
	});
}

/**
 * Set user properties that persist across sessions.
 * Only works when user has given consent.
 *
 * @example
 * setUserProperties({ subscription_tier: 'pro', artist_count: 3 });
 */
export function setUserProperties(
	properties: Record<string, string | number | boolean | null | undefined>,
): void {
	if (!browser || !initialized || !posthog.has_opted_in_capturing()) return;

	posthog.people.set(properties);
}

/**
 * Track a user action that should only be counted once.
 * Useful for tracking first-time events like first upload, first payout, etc.
 *
 * @example
 * trackOnce('first_song_uploaded');
 * trackOnce('first_payout_received');
 */
export function trackOnce(
	event: string,
	properties?: Record<string, string | number | boolean | null | undefined>,
): void {
	if (!browser || !initialized) return;

	posthog.capture(event, {
		...properties,
		$set_once: { [`${event}_at`]: new Date().toISOString() },
	});
}

/**
 * Start a timed event. Call stopTimer with the same event name to capture duration.
 * Useful for measuring how long actions take.
 *
 * @example
 * startTimer('song_upload');
 * await uploadSong(file);
 * stopTimer('song_upload', { file_size: file.size });
 */
const timers: Map<string, number> = new Map();

export function startTimer(event: string): void {
	if (!browser) return;
	timers.set(event, Date.now());
}

export function stopTimer(
	event: string,
	properties?: Record<string, string | number | boolean | null | undefined>,
): void {
	if (!browser || !initialized) return;

	const startTime = timers.get(event);
	if (!startTime) return;

	const duration = Date.now() - startTime;
	timers.delete(event);

	posthog.capture(event, {
		...properties,
		duration_ms: duration,
	});
}
