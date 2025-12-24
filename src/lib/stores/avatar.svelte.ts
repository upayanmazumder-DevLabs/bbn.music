import { browser } from '$app/environment';
import { getPictureByUserByUser } from '$lib/api/sdk.gen';
import { getAuthHeaders } from '$lib/apiClient';

// Cache for avatar URLs to prevent duplicate fetches
let cachedUrl = $state<string | null>(null);
let cachedUserId = $state<string | null>(null);
let cachedAvatarId = $state<string | null>(null);
let loadingForUserId: string | null = null; // Not reactive - used as sync lock
let loadPromise: Promise<void> | null = null;

export const avatarStore = {
	get url() {
		return cachedUrl;
	},
	get loading() {
		return loadingForUserId !== null;
	},

	async load(userId: string, avatarId: string | undefined) {
		if (!browser || !userId) {
			cachedUrl = null;
			cachedUserId = null;
			cachedAvatarId = null;
			return;
		}

		// If no avatar ID, clear the cache
		if (!avatarId) {
			cachedUrl = null;
			cachedUserId = userId;
			cachedAvatarId = null;
			return;
		}

		// If already loaded for this user with same avatar, skip
		if (cachedUserId === userId && cachedAvatarId === avatarId && cachedUrl) {
			return;
		}

		// If avatar is already a full URL (OAuth providers)
		if (avatarId.startsWith('http')) {
			cachedUrl = avatarId;
			cachedUserId = userId;
			cachedAvatarId = avatarId;
			return;
		}

		// Prevent duplicate requests - check if we're already loading for this user
		// If already loading, wait for the existing promise
		if (loadingForUserId === userId && loadPromise) {
			await loadPromise;
			return;
		}

		// Set lock synchronously before any await
		loadingForUserId = userId;

		loadPromise = (async () => {
			try {
				const response = await getPictureByUserByUser({
					path: { userId },
					headers: getAuthHeaders(),
				});

				if (response.data) {
					const blob = response.data as Blob;
					// Revoke old URL if it exists and is a blob URL
					if (cachedUrl && cachedUrl.startsWith('blob:')) {
						URL.revokeObjectURL(cachedUrl);
					}
					cachedUrl = URL.createObjectURL(blob);
					cachedUserId = userId;
					cachedAvatarId = avatarId;
				}
			} catch {
				cachedUrl = null;
			} finally {
				loadingForUserId = null;
				loadPromise = null;
			}
		})();

		await loadPromise;
	},

	// Force refresh (e.g., after upload)
	async refresh(userId: string, avatarId: string | undefined) {
		// Wait for any pending load to complete first
		if (loadPromise) {
			await loadPromise;
		}
		// Clear cache to force reload
		if (cachedUrl && cachedUrl.startsWith('blob:')) {
			URL.revokeObjectURL(cachedUrl);
		}
		cachedUrl = null;
		cachedUserId = null;
		cachedAvatarId = null;
		await this.load(userId, avatarId);
	},

	clear() {
		if (cachedUrl && cachedUrl.startsWith('blob:')) {
			URL.revokeObjectURL(cachedUrl);
		}
		cachedUrl = null;
		cachedUserId = null;
		cachedAvatarId = null;
		loadingForUserId = null;
		loadPromise = null;
	},
};
