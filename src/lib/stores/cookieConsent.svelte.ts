import { browser } from '$app/environment';

const CONSENT_KEY = 'cookie-consent';

export type ConsentState = 'pending' | 'accepted' | 'declined';

function getStoredConsent(): ConsentState {
	if (!browser) return 'pending';
	const stored = localStorage.getItem(CONSENT_KEY);
	if (stored === 'accepted' || stored === 'declined') return stored;
	return 'pending';
}

let state = $state<ConsentState>(getStoredConsent());

export const cookieConsent = {
	get state() {
		return state;
	},

	accept() {
		state = 'accepted';
		if (browser) {
			localStorage.setItem(CONSENT_KEY, 'accepted');
		}
	},

	decline() {
		state = 'declined';
		if (browser) {
			localStorage.setItem(CONSENT_KEY, 'declined');
		}
	},

	reset() {
		state = 'pending';
		if (browser) {
			localStorage.removeItem(CONSENT_KEY);
		}
	},
};
