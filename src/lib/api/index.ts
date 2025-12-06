import { client } from './client.gen';

// Re-export the client
export { client as apiClient };

// API Tools - matches old webgen app pattern
export const APITools = {
	token: () =>
		typeof window !== 'undefined'
			? localStorage.getItem('access-token')
			: null,
	baseUrl: () => {
		if (typeof window !== 'undefined') {
			const override = localStorage.getItem('OVERRIDE_BASE_URL');
			if (override) return override;

			// Default based on hostname for development
			if (location.hostname === 'localhost') {
				return 'http://localhost:8443/';
			}
		}
		return 'https://bbn.music/';
	},
	oauthRedirect: (provider: 'discord' | 'google' | 'microsoft') => {
		const baseUrl = APITools.baseUrl();
		const goal =
			typeof window !== 'undefined'
				? (localStorage.getItem('goal') ?? '/drops')
				: '/drops';
		return `${baseUrl}api/@bbn/auth/redirect/${provider}?goal=${encodeURIComponent(goal)}`;
	},
};

// Configure client on browser (like old webgen mod.ts)
if (typeof window !== 'undefined') {
	client.setConfig({
		baseUrl: APITools.baseUrl(),
	});
}

// Initialize API client on client-side (call on app mount to pick up localStorage changes)
// Usage: localStorage.setItem("OVERRIDE_BASE_URL", "https://bbn.music/") then refresh
export function initApiClient(): void {
	if (typeof window === 'undefined') return;
	client.setConfig({
		baseUrl: APITools.baseUrl(),
	});
}

// Alias for backwards compatibility
export const getBaseUrl = APITools.baseUrl;

// Re-export types and SDK functions
export * from './types.gen';
export * from './sdk.gen';

// Helper to get auth headers - uses access-token (not refresh-token)
export function getAuthHeaders(): Record<string, string> {
	if (typeof window === 'undefined') return {};
	const token = localStorage.getItem('access-token');
	if (!token) return {};
	return { Authorization: `JWT ${token}` };
}

// Helper to store tokens (client-side only)
export function storeTokens(accessToken: string, refreshToken: string): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem('access-token', accessToken);
	localStorage.setItem('refresh-token', refreshToken);
}

// Helper to clear tokens (client-side only)
export function clearTokens(): void {
	if (typeof window === 'undefined') return;
	localStorage.removeItem('access-token');
	localStorage.removeItem('refresh-token');
}
