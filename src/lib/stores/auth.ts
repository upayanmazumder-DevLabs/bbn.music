import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import {
	postEmailByAuth,
	postRegisterByAuth,
	postRefreshAccessTokenByAuth,
	postCodeByProviderByOauthByAuth,
} from '$lib/api/sdk.gen';
import type { User as ApiUser } from '$lib/api/types.gen';

// Decode base64 unicode (like the old webgen code)
function b64DecodeUnicode(value: string): string {
	return decodeURIComponent(
		atob(value)
			.split('')
			.map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
			.join(''),
	);
}

// Extract user from JWT token payload (from access-token)
function getUserFromToken(token: string): ApiUser | null {
	try {
		const payload = JSON.parse(b64DecodeUnicode(token.split('.')[1]));
		return payload.user || null;
	} catch {
		return null;
	}
}

// Check if token is expired
function isTokenExpired(token: string): boolean {
	try {
		const payload = JSON.parse(b64DecodeUnicode(token.split('.')[1]));
		if (!payload.exp) return true;
		// Consider expired 30s before actual expiry
		return payload.exp * 1000 < Date.now() + 30 * 1000;
	} catch {
		return true;
	}
}

// Get auth headers using access-token
export function getAuthHeaders(): Record<string, string> {
	if (!browser) return {};
	const token = localStorage.getItem('access-token');
	if (!token) return {};
	return { Authorization: `JWT ${token}` };
}

// Frontend User type - matches JWT structure
export interface User {
	id: string;
	profile: {
		email: string;
		phone?: string;
		username: string;
		avatar?: string;
		verified: {
			email: boolean;
			phone?: boolean;
		};
	};
	permissions: string[];
	groups: string[];
	isAdmin?: boolean;
}

export interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}

// Admin group ID - users in this group have admin access
const ADMIN_GROUP_ID = '64c64569f075771ea59f795e';

// Check if user has admin permissions
function hasAdminAccess(apiUser: ApiUser): boolean {
	// Check permissions array or admin group membership
	return (
		apiUser.permissions?.some(
			(p) =>
				p === 'admin' ||
				p === '/bbn/manage' ||
				p.startsWith('/bbn/manage/') ||
				p === '/hmsys/user' ||
				p.startsWith('/hmsys/'),
		) ||
		apiUser.groups?.includes(ADMIN_GROUP_ID) ||
		false
	);
}

// Map API user to frontend user
function mapApiUser(apiUser: ApiUser): User {
	return {
		id: String(apiUser._id),
		profile: {
			email: apiUser.profile.email,
			phone: apiUser.profile.phone,
			username: apiUser.profile.username,
			avatar: apiUser.profile.avatar
				? String(apiUser.profile.avatar)
				: undefined,
			verified: {
				email: apiUser.profile.verified?.email ?? false,
				phone: apiUser.profile.verified?.phone,
			},
		},
		permissions: apiUser.permissions || [],
		groups: apiUser.groups || [],
		isAdmin: hasAdminAccess(apiUser),
	};
}

// Exchange refresh token for access token (like old webgen logIn function)
async function exchangeForAccessToken(refreshToken: string): Promise<string> {
	const response = await postRefreshAccessTokenByAuth({
		headers: { Authorization: `Bearer ${refreshToken}` },
	});

	if (response.error || !response.data) {
		throw new Error('Failed to get access token');
	}

	const data = response.data as { token: string };
	return data.token;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		token: null,
		isAuthenticated: false,
		isLoading: false,
		error: null,
	});

	// Initialize from localStorage on client
	if (browser) {
		const accessToken = localStorage.getItem('access-token');
		if (accessToken) {
			const apiUser = getUserFromToken(accessToken);
			if (apiUser) {
				const user = mapApiUser(apiUser);
				update((state) => ({
					...state,
					token: accessToken,
					user,
					isAuthenticated: true,
				}));
			}
		}
	}

	return {
		subscribe,

		async login(email: string, password: string) {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				// Step 1: Login to get refresh token
				const response = await postEmailByAuth({
					body: { email, password },
				});

				const responseData = response.data as
					| { token?: string }
					| undefined;

				if (!responseData?.token) {
					if (response.error) {
						throw new Error(
							(response.error as any)?.message || 'Login failed',
						);
					}
					throw new Error('Login failed - no token in response');
				}

				const refreshToken = responseData.token;

				// Step 2: Exchange refresh token for access token
				const accessToken = await exchangeForAccessToken(refreshToken);

				// Step 3: Store both tokens
				if (browser) {
					localStorage.setItem('refresh-token', refreshToken);
					localStorage.setItem('access-token', accessToken);
				}

				// Step 4: Decode user from access token
				const apiUser = getUserFromToken(accessToken);
				if (!apiUser) {
					throw new Error('Failed to decode user from token');
				}

				const user = mapApiUser(apiUser);

				set({
					user,
					token: accessToken,
					isAuthenticated: true,
					isLoading: false,
					error: null,
				});

				return true;
			} catch (error: any) {
				console.error('Login error:', error);
				const errorMessage =
					error?.response?.data?.message ||
					error.message ||
					'Login failed';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage,
				}));
				return false;
			}
		},

		async register(email: string, password: string, name: string) {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				// Step 1: Register to get refresh token
				const response = await postRegisterByAuth({
					body: { email, password, username: name },
				});

				const responseData = response.data as
					| { token?: string }
					| undefined;

				if (!responseData?.token) {
					if (response.error) {
						throw new Error(
							(response.error as any)?.message ||
								'Registration failed',
						);
					}
					throw new Error(
						'Registration failed - no token in response',
					);
				}

				const refreshToken = responseData.token;

				// Step 2: Exchange refresh token for access token
				const accessToken = await exchangeForAccessToken(refreshToken);

				// Step 3: Store both tokens
				if (browser) {
					localStorage.setItem('refresh-token', refreshToken);
					localStorage.setItem('access-token', accessToken);
				}

				// Step 4: Decode user from access token
				const apiUser = getUserFromToken(accessToken);
				if (!apiUser) {
					throw new Error('Failed to decode user from token');
				}

				const user = mapApiUser(apiUser);

				set({
					user,
					token: accessToken,
					isAuthenticated: true,
					isLoading: false,
					error: null,
				});

				return true;
			} catch (error: any) {
				const errorMessage =
					error?.response?.data?.message ||
					error.message ||
					'Registration failed';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage,
				}));
				return false;
			}
		},

		async oauthLogin(provider: string, code: string) {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				// Exchange OAuth code for refresh token
				const response = await postCodeByProviderByOauthByAuth({
					path: { provider, code },
				});

				const responseData = response.data as
					| { token?: string }
					| undefined;

				if (!responseData?.token) {
					if (response.error) {
						throw new Error(
							(response.error as any)?.message ||
								'OAuth login failed',
						);
					}
					throw new Error(
						'OAuth login failed - no token in response',
					);
				}

				const refreshToken = responseData.token;

				// Exchange refresh token for access token
				const accessToken = await exchangeForAccessToken(refreshToken);

				// Store both tokens
				if (browser) {
					localStorage.setItem('refresh-token', refreshToken);
					localStorage.setItem('access-token', accessToken);
				}

				// Decode user from access token
				const apiUser = getUserFromToken(accessToken);
				if (!apiUser) {
					throw new Error('Failed to decode user from token');
				}

				const user = mapApiUser(apiUser);

				set({
					user,
					token: accessToken,
					isAuthenticated: true,
					isLoading: false,
					error: null,
				});

				return true;
			} catch (error: any) {
				console.error('OAuth login error:', error);
				const errorMessage =
					error?.response?.data?.message ||
					error.message ||
					'OAuth login failed';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage,
				}));
				return false;
			}
		},

		// Login with a refresh token (used for password reset flow)
		async loginWithToken(refreshToken: string) {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				// Exchange refresh token for access token
				const accessToken = await exchangeForAccessToken(refreshToken);

				// Store both tokens
				if (browser) {
					localStorage.setItem('refresh-token', refreshToken);
					localStorage.setItem('access-token', accessToken);
				}

				// Decode user from access token
				const apiUser = getUserFromToken(accessToken);
				if (!apiUser) {
					throw new Error('Failed to decode user from token');
				}

				const user = mapApiUser(apiUser);

				set({
					user,
					token: accessToken,
					isAuthenticated: true,
					isLoading: false,
					error: null,
				});

				return true;
			} catch (error: any) {
				console.error('Token login error:', error);
				const errorMessage =
					error?.response?.data?.message ||
					error.message ||
					'Login failed';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage,
				}));
				return false;
			}
		},

		async refreshToken() {
			const refreshToken = browser
				? localStorage.getItem('refresh-token')
				: null;
			if (!refreshToken) return false;

			try {
				const accessToken = await exchangeForAccessToken(refreshToken);

				if (browser) {
					localStorage.setItem('access-token', accessToken);
				}

				const apiUser = getUserFromToken(accessToken);
				if (apiUser) {
					const user = mapApiUser(apiUser);
					update((state) => ({
						...state,
						token: accessToken,
						user,
						isAuthenticated: true,
					}));
				}

				return true;
			} catch (error) {
				console.error('Token refresh failed:', error);
				this.logout();
				return false;
			}
		},

		fetchCurrentUser() {
			const accessToken = browser
				? localStorage.getItem('access-token')
				: null;
			if (!accessToken) return null;

			// Decode user directly from access token (no API call needed)
			const apiUser = getUserFromToken(accessToken);
			if (!apiUser) {
				// Token is invalid, try refresh
				this.refreshToken();
				return null;
			}

			const user = mapApiUser(apiUser);

			update((state) => ({
				...state,
				user,
				token: accessToken,
				isAuthenticated: true,
				isLoading: false,
			}));

			return user;
		},

		logout() {
			// Clear localStorage
			if (browser) {
				localStorage.removeItem('access-token');
				localStorage.removeItem('refresh-token');
			}

			// Reset store
			set({
				user: null,
				token: null,
				isAuthenticated: false,
				isLoading: false,
				error: null,
			});

			// Redirect to login
			goto('/signin');
		},

		getStoredToken(): string | null {
			return browser ? localStorage.getItem('access-token') : null;
		},
	};
}

export const auth = createAuthStore();
