import { client } from './api/client.gen.ts';

export const APITools = {
	baseUrl: () => {
		if (typeof window !== 'undefined') {
			const override = localStorage.getItem('OVERRIDE_BASE_URL');
			if (override) return override;
			if (location.hostname === 'localhost') {
				return 'http://localhost:8443/';
			}
		}
		return 'https://bbn.music/';
	},
	oauthRedirect: (provider: 'discord' | 'google' | 'microsoft') => {
		const baseUrl = APITools.baseUrl();
		const goal =
			typeof window === 'undefined' ? '/music' : (localStorage.getItem('goal') ?? '/music');
		return `${baseUrl}api/@bbn/auth/redirect/${provider}?goal=${encodeURIComponent(goal)}`;
	},
};

if (typeof window !== 'undefined') {
	client.setConfig({ baseUrl: APITools.baseUrl() });
}

export function initApiClient(): void {
	if (typeof window === 'undefined') return;
	client.setConfig({ baseUrl: APITools.baseUrl() });
}

export const getBaseUrl = APITools.baseUrl;

export function getAuthHeaders(): Record<string, string> {
	if (typeof window === 'undefined') return {};
	const token = localStorage.getItem('access-token');
	if (!token) return {};
	return { Authorization: `JWT ${token}` };
}
