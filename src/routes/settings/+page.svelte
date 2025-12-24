<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { Badge, Toggle } from '$lib/components/ui';
	import {
		ExclamationCircleOutline,
		CheckCircleSolid,
		LockSolid,
		CameraPhotoSolid,
	} from 'flowbite-svelte-icons';
	import {
		putUserByUser,
		postResendVerifyEmailByMailByUser,
		getIdByPreferencesByMessaging,
		putPreferencesByMessaging,
	} from '$lib/api/sdk.gen';
	import type { MessagePreference, NotificationCategory, Platform } from '$lib/api/types.gen';
	import { getAuthHeaders, getBaseUrl } from '$lib/apiClient';
	import { onMount } from 'svelte';
	import PhoneInput from '$lib/components/PhoneInput.svelte';
	import { avatarStore } from '$lib/stores/avatar.svelte';
	import { toast } from '$lib/stores/toast';

	let name = $state($auth.user?.profile.username || '');
	let email = $state($auth.user?.profile.email || '');
	let phone = $state($auth.user?.profile.phone || '');
	let phoneError = $state('');
	const emailVerified = $derived($auth.user?.profile.verified.email ?? false);
	const phoneVerified = $derived($auth.user?.profile.verified.phone ?? false);
	let uploadingAvatar = $state(false);
	let avatarError = $state('');

	// Notification preferences
	// API only accepts these platforms for preferences
	type PreferencePlatform = 'email' | 'whatsapp' | 'rcs' | 'sms';
	type CategoryPreference = { enabled: boolean; platforms: PreferencePlatform[] };
	type Preferences = Record<NotificationCategory, CategoryPreference>;

	let notificationPrefs = $state<Preferences | null>(null);
	let loadingPrefs = $state(true);
	let savingPref = $state<NotificationCategory | null>(null);

	// Available platforms for notifications
	const availablePlatforms: { id: PreferencePlatform; label: string }[] = [
		{ id: 'email', label: 'Email' },
		{ id: 'whatsapp', label: 'WhatsApp' },
	];

	// Load notification preferences on mount
	onMount(async () => {
		await loadNotificationPreferences();
	});

	async function loadNotificationPreferences() {
		if (!$auth.user?.id) return;

		// Filter platforms to only include valid preference platforms
		const validPlatforms: PreferencePlatform[] = ['email', 'whatsapp', 'rcs', 'sms'];
		const filterPlatforms = (platforms: Platform[]): PreferencePlatform[] => {
			return platforms.filter((p): p is PreferencePlatform => validPlatforms.includes(p as PreferencePlatform));
		};

		try {
			const response = await getIdByPreferencesByMessaging({
				path: { id: $auth.user.id },
				headers: getAuthHeaders(),
			});

			if (response.data) {
				const prefs = response.data as MessagePreference;
				notificationPrefs = {
					drops: { enabled: prefs.preferences.drops!.enabled, platforms: filterPlatforms(prefs.preferences.drops!.platforms) },
					royalties: { enabled: prefs.preferences.royalties!.enabled, platforms: filterPlatforms(prefs.preferences.royalties!.platforms) },
					marketing: { enabled: prefs.preferences.marketing!.enabled, platforms: filterPlatforms(prefs.preferences.marketing!.platforms) },
				};
			}
		} catch {
			toast.show('Failed to load notification preferences', 'error');
		} finally {
			loadingPrefs = false;
		}
	}

	async function updatePreference(category: NotificationCategory, enabled: boolean, platforms: PreferencePlatform[]) {
		if (!notificationPrefs) return;
		savingPref = category;
		try {
			await putPreferencesByMessaging({
				body: { category, enabled, platforms },
				headers: getAuthHeaders(),
			});
			notificationPrefs[category] = { enabled, platforms };
		} catch {
			toast.show('Failed to update notification preference', 'error');
		} finally {
			savingPref = null;
		}
	}

	function toggleCategory(category: NotificationCategory) {
		if (!notificationPrefs) return;
		const current = notificationPrefs[category];
		const newEnabled = !current.enabled;
		// When enabling, default to email if no platforms selected
		const platforms = newEnabled && current.platforms.length === 0 ? ['email'] as PreferencePlatform[] : current.platforms;
		updatePreference(category, newEnabled, platforms);
	}

	function togglePlatform(category: NotificationCategory, platform: PreferencePlatform) {
		if (!notificationPrefs) return;
		const current = notificationPrefs[category];
		const platforms = current.platforms.includes(platform)
			? current.platforms.filter((p) => p !== platform)
			: [...current.platforms, platform];
		// If no platforms left, disable the category
		const enabled = platforms.length > 0 ? current.enabled : false;
		updatePreference(category, enabled, platforms);
	}

	let saving = $state(false);
	let saved = $state(false);
	let error = $state('');

	// Password change state
	let showPasswordChange = $state(false);
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordError = $state('');
	let passwordSaving = $state(false);
	let passwordChanged = $state(false);

	// Email verification state
	let verificationEmailSent = $state(false);
	let sendingVerification = $state(false);

	async function saveSettings() {
		// Prevent submission if there are validation errors
		if (phoneError) {
			return;
		}

		saving = true;
		error = '';

		try {
			// Normalize phone number (add + if missing, then strip for backend)
			let normalizedPhone = phone;
			if (phone && !phone.startsWith('+')) {
				// If phone doesn't start with +, assume it's already in the backend format
				normalizedPhone = phone;
			} else if (phone && phone.startsWith('+')) {
				// Strip + for backend
				normalizedPhone = phone.substring(1);
			}

			// Call API directly to update profile fields
			const response = await putUserByUser({
				headers: getAuthHeaders(),
				body: {
					name,
					email,
					phone: normalizedPhone || undefined,
				},
			});

			if (response.error) {
				throw new Error((response.error as any)?.message || 'Failed to save settings');
			}

			// Refresh the token to get updated user info
			await auth.refreshToken();

			saved = true;
			setTimeout(() => (saved = false), 3000);
		} catch (e: any) {
			error = e?.error?.message || e?.message || 'Failed to save settings';
		} finally {
			saving = false;
		}
	}

	async function changePassword(e: Event) {
		e.preventDefault();
		passwordError = '';
		passwordSaving = true;

		try {
			// Validate passwords match
			if (newPassword !== confirmPassword) {
				passwordError = 'New passwords do not match';
				return;
			}

			// Validate minimum length
			if (newPassword.length < 8) {
				passwordError = 'Password must be at least 8 characters';
				return;
			}

			// Call API to update password
			const response = await putUserByUser({
				headers: getAuthHeaders(),
				body: {
					password: newPassword,
				},
			});

			if (response.error) {
				throw new Error((response.error as any)?.message || 'Failed to change password');
			}

			// Success
			passwordChanged = true;
			newPassword = '';
			confirmPassword = '';
			setTimeout(() => {
				passwordChanged = false;
				showPasswordChange = false;
			}, 3000);
		} catch (e: any) {
			passwordError = e?.error?.message || e?.message || 'Failed to change password';
		} finally {
			passwordSaving = false;
		}
	}

	function togglePasswordChange() {
		showPasswordChange = !showPasswordChange;
		if (!showPasswordChange) {
			newPassword = '';
			confirmPassword = '';
			passwordError = '';
			passwordChanged = false;
		}
	}

	async function resendVerificationEmail() {
		sendingVerification = true;
		try {
			await postResendVerifyEmailByMailByUser({
				headers: getAuthHeaders(),
			});
			verificationEmailSent = true;
			setTimeout(() => (verificationEmailSent = false), 5000);
		} catch (e: any) {
			error = e?.error?.message || e?.message || 'Failed to send verification email';
		} finally {
			sendingVerification = false;
		}
	}

	// Profile picture upload
	let fileInput: HTMLInputElement;

	function triggerFileUpload() {
		fileInput?.click();
	}

	async function handleAvatarUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.match(/^image\/(jpeg|png)$/)) {
			avatarError = 'Please select a JPEG or PNG image';
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			avatarError = 'Image must be less than 5MB';
			return;
		}

		uploadingAvatar = true;
		avatarError = '';

		try {
			// Upload via WebSocket (no API call needed, just direct WebSocket connection)
			await uploadViaWebSocket(file);

			// Refresh auth to get updated avatar
			await auth.refreshToken();

			// Refresh avatar in shared store
			if ($auth.user?.id) {
				await avatarStore.refresh($auth.user.id, $auth.user.profile.avatar);
			}
		} catch (e: any) {
			avatarError = e?.error?.message || e?.message || 'Failed to upload profile picture';
		} finally {
			uploadingAvatar = false;
			// Reset file input
			if (target) target.value = '';
		}
	}

	async function uploadViaWebSocket(file: File): Promise<void> {
		return new Promise((resolve, reject) => {
			const baseUrl = getBaseUrl();
			const wsUrl = `${baseUrl.replace('https:', 'wss:').replace('http:', 'ws:')}api/@bbn/user/set-me/avatar/upload`;
			const ws = new WebSocket(wsUrl);

			// Create reader once and reuse it
			const reader = file.stream().getReader();
			let uploadProgress = 0;

			ws.onopen = () => {
				// Send authentication token
				const token = $auth.token;
				ws.send(`JWT ${token}`);
			};

			ws.onmessage = async ({ data }) => {
				if (data.startsWith('failed')) {
					ws.close();
					reject(new Error(data));
				} else if (data === 'file') {
					// Server is ready for file metadata
					ws.send(`file ${JSON.stringify({ filename: file.name, type: file.type })}`);
				} else if (data === 'next') {
					// Server is ready for next chunk
					const chunk = await reader.read();

					if (chunk.value) {
						ws.send(chunk.value);
						uploadProgress += chunk.value.length;
					}

					if (chunk.done) {
						ws.send('end');
					}
				} else {
					// Upload complete - data contains the avatar ID
					reader.releaseLock();
					ws.close();
					resolve();
				}
			};

			ws.onerror = (event) => {
				reader.releaseLock();
				reject(new Error('WebSocket connection error'));
			};

			ws.onclose = (event) => {
				if (!event.wasClean && uploadProgress === 0) {
					reject(new Error('Connection closed unexpectedly'));
				}
			};
		});
	}
</script>

<svelte:head>
	<title>Settings - bbn.music</title>
</svelte:head>

<div class="max-w-2xl mx-auto space-y-8">
	<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>

	{#if saved}
		<div
			class="flex items-center gap-3 p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300"
		>
			<CheckCircleSolid class="w-5 h-5 flex-shrink-0" />
			<span class="text-sm font-medium">Settings saved successfully!</span>
		</div>
	{/if}

	{#if error}
		<div
			class="flex items-center gap-3 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300"
		>
			<ExclamationCircleOutline class="w-5 h-5 flex-shrink-0" />
			<span class="text-sm font-medium">{error}</span>
		</div>
	{/if}

	<!-- Profile Section -->
	<section
		class="rounded-2xl p-6 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
	>
		<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Profile</h2>

		{#if avatarError}
			<div
				class="flex items-center gap-3 p-3 mb-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300"
			>
				<ExclamationCircleOutline class="w-4 h-4 flex-shrink-0" />
				<span class="text-sm">{avatarError}</span>
			</div>
		{/if}

		<div class="flex items-start gap-6 mb-6">
			<div class="relative group">
				<button
					onclick={triggerFileUpload}
					disabled={uploadingAvatar}
					class="w-20 h-20 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 flex items-center justify-center flex-shrink-0 overflow-hidden relative cursor-pointer disabled:cursor-not-allowed hover:ring-2 hover:ring-orange-400 hover:ring-offset-2 hover:ring-offset-gray-900 transition-all"
					aria-label="Change profile picture"
				>
					{#if uploadingAvatar}
						<div class="w-full h-full flex items-center justify-center bg-black/50">
							<div
								class="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"
							></div>
						</div>
					{:else if avatarStore.url}
						<img src={avatarStore.url} alt={name || 'User'} class="w-full h-full object-cover" />
					{:else}
						<span class="text-white font-bold text-2xl">
							{name ? name[0].toUpperCase() : 'U'}
						</span>
					{/if}
					<!-- Hover overlay -->
					<div
						class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full"
					>
						<CameraPhotoSolid class="w-6 h-6 text-white" />
					</div>
				</button>
				<!-- Small edit indicator badge -->
				{#if !uploadingAvatar}
					<div
						class="absolute bottom-0 right-0 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-900 group-hover:bg-orange-500 transition-colors"
					>
						<svg
							class="w-3 h-3 text-gray-400 group-hover:text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
							/>
						</svg>
					</div>
				{/if}
				<!-- Hidden file input -->
				<input
					bind:this={fileInput}
					type="file"
					accept="image/jpeg,image/png"
					onchange={handleAvatarUpload}
					class="hidden"
					aria-label="Upload profile picture"
				/>
			</div>
			<div class="flex-1">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>Display Name</label
					>
					<input
						id="name"
						type="text"
						bind:value={name}
						class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors"
						placeholder="Your name"
					/>
				</div>
			</div>
		</div>

		<div class="space-y-4">
			<div>
				<div class="flex items-center gap-2 mb-2">
					<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>Email</label
					>
					{#if emailVerified}
						<Badge color="green" size="sm"><CheckCircleSolid class="w-3 h-3 mr-1" />Verified</Badge>
					{:else}
						<Badge color="orange" size="sm"
							><ExclamationCircleOutline class="w-3 h-3 mr-1" />Not Verified</Badge
						>
					{/if}
				</div>
				<input
					id="email"
					type="email"
					bind:value={email}
					class="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors"
					placeholder="your.email@example.com"
				/>

				{#if !emailVerified}
					{#if verificationEmailSent}
						<div
							class="flex items-center gap-2 mt-3 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300"
						>
							<CheckCircleSolid class="w-4 h-4 flex-shrink-0" />
							<span class="text-sm">Verification email sent! Check your inbox/spam folder.</span>
						</div>
					{:else}
						<div class="mt-3 p-3 rounded-lg bg-orange-500/20 border border-orange-500/30">
							<p class="text-sm text-orange-300 mb-2">
								Your email is not verified. Please check your inbox/spam folder.
							</p>
							<button
								onclick={resendVerificationEmail}
								disabled={sendingVerification}
								class="px-3 py-1.5 text-sm rounded-lg bg-orange-500/30 text-orange-200 hover:bg-orange-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
							>
								{sendingVerification ? 'Sending...' : 'Resend Verification Email'}
							</button>
						</div>
					{/if}
				{/if}
			</div>

			<div>
				<div class="flex items-center gap-2 mb-2">
					<label
						for="phone-input"
						class="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label
					>
					{#if phone && phoneVerified}
						<Badge color="green" size="sm"><CheckCircleSolid class="w-3 h-3 mr-1" />Verified</Badge>
					{:else if phone && !phoneVerified}
						<Badge color="orange" size="sm"
							><ExclamationCircleOutline class="w-3 h-3 mr-1" />Not Verified</Badge
						>
					{/if}
				</div>
				<PhoneInput id="phone-input" bind:value={phone} bind:error={phoneError} />
				<p class="text-xs text-gray-500 mt-1">
					Optional: Add your phone number for notifications and account recovery
				</p>
			</div>
		</div>

		<!-- Save Button -->
		<div class="flex justify-end pt-4">
			<button
				onclick={saveSettings}
				disabled={saving || !!phoneError}
				class="px-6 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{saving ? 'Saving...' : 'Save Changes'}
			</button>
		</div>
	</section>

	<!-- Notifications Section -->
	<section
		class="rounded-2xl p-6 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
	>
		<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Notifications</h2>

		{#if loadingPrefs || !notificationPrefs}
			<div class="flex items-center justify-center py-8">
				<div class="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
			</div>
		{:else}
			<div class="space-y-6">
				<!-- Drop Updates -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-gray-900 dark:text-white font-medium">Drop Updates</p>
							<p class="text-sm text-gray-500 dark:text-gray-400">Status changes for your drops</p>
						</div>
						<div class="flex items-center gap-2">
							{#if savingPref === 'drops'}
								<div class="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
							{/if}
							<button onclick={() => toggleCategory('drops')} class="focus:outline-none">
								<Toggle checked={notificationPrefs.drops.enabled} />
							</button>
						</div>
					</div>
					{#if notificationPrefs.drops.enabled}
						<div class="flex items-center gap-2 ml-4">
							<span class="text-xs text-gray-500 dark:text-gray-400 mr-2">Via:</span>
							{#each availablePlatforms as platform}
								<button
									onclick={() => togglePlatform('drops', platform.id)}
									class="px-3 py-1 text-xs rounded-full border transition-colors {notificationPrefs.drops.platforms.includes(platform.id)
										? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
										: 'bg-gray-200 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-white/20'}"
								>
									{platform.label}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<div class="border-t border-gray-200 dark:border-white/10"></div>

				<!-- Royalty/Payout Alerts -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-gray-900 dark:text-white font-medium">Payout Alerts</p>
							<p class="text-sm text-gray-500 dark:text-gray-400">Earnings and payout notifications</p>
						</div>
						<div class="flex items-center gap-2">
							{#if savingPref === 'royalties'}
								<div class="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
							{/if}
							<button onclick={() => toggleCategory('royalties')} class="focus:outline-none">
								<Toggle checked={notificationPrefs.royalties.enabled} />
							</button>
						</div>
					</div>
					{#if notificationPrefs.royalties.enabled}
						<div class="flex items-center gap-2 ml-4">
							<span class="text-xs text-gray-500 dark:text-gray-400 mr-2">Via:</span>
							{#each availablePlatforms as platform}
								<button
									onclick={() => togglePlatform('royalties', platform.id)}
									class="px-3 py-1 text-xs rounded-full border transition-colors {notificationPrefs.royalties.platforms.includes(platform.id)
										? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
										: 'bg-gray-200 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-white/20'}"
								>
									{platform.label}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<div class="border-t border-gray-200 dark:border-white/10"></div>

				<!-- Marketing -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-gray-900 dark:text-white font-medium">Marketing</p>
							<p class="text-sm text-gray-500 dark:text-gray-400">News and tips from bbn.music</p>
						</div>
						<div class="flex items-center gap-2">
							{#if savingPref === 'marketing'}
								<div class="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
							{/if}
							<button onclick={() => toggleCategory('marketing')} class="focus:outline-none">
								<Toggle checked={notificationPrefs.marketing.enabled} />
							</button>
						</div>
					</div>
					{#if notificationPrefs.marketing.enabled}
						<div class="flex items-center gap-2 ml-4">
							<span class="text-xs text-gray-500 dark:text-gray-400 mr-2">Via:</span>
							{#each availablePlatforms as platform}
								<button
									onclick={() => togglePlatform('marketing', platform.id)}
									class="px-3 py-1 text-xs rounded-full border transition-colors {notificationPrefs.marketing.platforms.includes(platform.id)
										? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
										: 'bg-gray-200 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-white/20'}"
								>
									{platform.label}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</section>

	<!-- Security Section -->
	<section
		class="rounded-2xl p-6 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
	>
		<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Security</h2>

		<div class="space-y-4">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div>
						<p class="text-gray-900 dark:text-white font-medium">Password</p>
					</div>
					<button
						onclick={togglePasswordChange}
						class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 transition-colors text-sm font-medium"
					>
						{showPasswordChange ? 'Cancel' : 'Change Password'}
					</button>
				</div>

				{#if showPasswordChange}
					<form
						onsubmit={changePassword}
						class="mt-4 space-y-4 p-4 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10"
					>
						<!-- Hidden email field for password managers and accessibility -->
						<input
							type="email"
							name="email"
							value={email}
							autocomplete="username"
							readonly
							tabindex="-1"
							aria-hidden="true"
							style="position: absolute; left: -9999px; width: 1px; height: 1px;"
						/>

						{#if passwordChanged}
							<div
								class="flex items-center gap-3 p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300"
							>
								<CheckCircleSolid class="w-5 h-5 flex-shrink-0" />
								<span class="text-sm font-medium">Password changed successfully!</span>
							</div>
						{/if}

						{#if passwordError}
							<div
								class="flex items-center gap-3 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300"
							>
								<ExclamationCircleOutline class="w-5 h-5 flex-shrink-0" />
								<span class="text-sm font-medium">{passwordError}</span>
							</div>
						{/if}

						<div>
							<label
								for="newPassword"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								New Password
							</label>
							<div class="relative">
								<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<LockSolid class="w-5 h-5 text-gray-500" />
								</div>
								<input
									type="password"
									id="newPassword"
									bind:value={newPassword}
									placeholder="Enter new password"
									required
									minlength="8"
									autocomplete="new-password"
									class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors"
								/>
							</div>
						</div>

						<div>
							<label
								for="confirmPassword"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Confirm New Password
							</label>
							<div class="relative">
								<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<LockSolid class="w-5 h-5 text-gray-500" />
								</div>
								<input
									type="password"
									id="confirmPassword"
									bind:value={confirmPassword}
									placeholder="Confirm new password"
									required
									minlength="8"
									autocomplete="new-password"
									class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors"
								/>
							</div>
						</div>

						<button
							type="submit"
							disabled={passwordSaving || !newPassword || !confirmPassword}
							class="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{passwordSaving ? 'Changing Password...' : 'Change Password'}
						</button>
					</form>
				{/if}
			</div>

			<div class="border-t border-white/10"></div>

			<div class="flex items-center justify-between opacity-50 cursor-not-allowed">
				<div>
					<div class="flex items-center gap-2">
						<p class="text-gray-400 font-medium">Passkey</p>
						<Badge color="orange" size="sm">Coming Soon</Badge>
					</div>
					<p class="text-sm text-gray-500">Sign in with biometrics or security keys</p>
				</div>
				<button
					disabled
					class="px-4 py-2 rounded-lg bg-white/5 text-gray-500 cursor-not-allowed text-sm font-medium"
				>
					Setup
				</button>
			</div>
		</div>
	</section>
</div>
