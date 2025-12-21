import { browser } from '$app/environment';
import posthog from 'posthog-js';

let initialized = false;

export function initPostHog(): void {
	if (!browser || initialized) {
		return;
	}

	posthog.init('phc_JZUdortcJ5IA9FtbzYXLv5QzqFE8umJaUz2PSvo9yzJ', {
		api_host: 'https://eu.i.posthog.com',
		capture_pageview: false, // We'll handle this manually for SPA navigation
		capture_pageleave: true,
		persistence: 'localStorage+cookie',
	});

	initialized = true;
}

export function identifyUser(user: {
	id: string;
	email: string;
	username: string;
	isAdmin?: boolean;
}): void {
	if (!browser || !initialized) return;

	posthog.identify(user.id, {
		email: user.email,
		username: user.username,
		is_admin: user.isAdmin ?? false,
	});
}

export function resetUser(): void {
	if (!browser || !initialized) return;

	posthog.reset();
}

export function trackPageView(url: string): void {
	if (!browser || !initialized) return;

	posthog.capture('$pageview', {
		$current_url: url,
	});
}

export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
	if (!browser || !initialized) return;

	posthog.capture(eventName, properties);
}

export { posthog };
