<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import {
		ExclamationCircleOutline,
		CheckCircleSolid,
		LockSolid,
		CameraPhotoSolid,
	} from 'flowbite-svelte-icons';
	import {
		putUserByUser,
		postResendVerifyEmailByMailByUser,
		getPictureByUserByUser,
	} from '$lib/api/sdk.gen';
	import { getAuthHeaders, getBaseUrl } from '$lib/apiClient';
	import PhoneInput from '$lib/components/PhoneInput.svelte';

	let name = $state($auth.user?.profile.username || '');
	let email = $state($auth.user?.profile.email || '');
	let phone = $state($auth.user?.profile.phone || '');
	let phoneError = $state('');
	const emailVerified = $derived($auth.user?.profile.verified.email ?? false);
	const phoneVerified = $derived($auth.user?.profile.verified.phone ?? false);
	let avatarUrl = $state<string | null>(null);
	let uploadingAvatar = $state(false);
	let avatarError = $state('');

	// Load avatar image as blob when user changes
	async function loadAvatar() {
		if (!$auth.user?.id || !$auth.user?.profile.avatar) {
			avatarUrl = null;
			return;
		}

		// Check if avatar is already a full URL (OAuth providers)
		if ($auth.user.profile.avatar.startsWith('http')) {
			avatarUrl = $auth.user.profile.avatar;
			return;
		}

		// Fetch avatar as blob with authentication
		try {
			const response = await getPictureByUserByUser({
				path: { userId: $auth.user.id },
				headers: getAuthHeaders(),
			});

			if (response.data) {
				const blob = response.data as Blob;
				// Revoke old URL if it exists
				if (avatarUrl && !avatarUrl.startsWith('http')) {
					URL.revokeObjectURL(avatarUrl);
				}
				avatarUrl = URL.createObjectURL(blob);
			}
		} catch (error) {
			console.error('Failed to load avatar:', error);
			avatarUrl = null;
		}
	}

	// Load avatar when user changes
	$effect(() => {
		if ($auth.user?.id) {
			loadAvatar();
		} else {
			avatarUrl = null;
		}
	});

	let notifications = $state({
		dropUpdates: true,
		payoutAlerts: true,
		marketing: false,
	});

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
			error = e.message || 'Failed to save settings';
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
			passwordError = e.message || 'Failed to change password';
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
			error = e.message || 'Failed to send verification email';
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

			// Show preview immediately
			const previewUrl = URL.createObjectURL(file);
			if (avatarUrl && !avatarUrl.startsWith('http')) {
				URL.revokeObjectURL(avatarUrl);
			}
			avatarUrl = previewUrl;

			// Refresh auth to get updated avatar
			await auth.refreshToken();
			await loadAvatar();
		} catch (e: any) {
			avatarError = e.message || 'Failed to upload profile picture';
			console.error('Avatar upload error:', e);
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
					console.error('Upload failed:', data);
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
	<section class="rounded-2xl p-6 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
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
					{:else if avatarUrl}
						<img src={avatarUrl} alt={name || 'User'} class="w-full h-full object-cover" />
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
					<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Name</label
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
					<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
					{#if emailVerified}
						<span
							class="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded"
						>
							<CheckCircleSolid class="w-3 h-3" />
							Verified
						</span>
					{:else}
						<span
							class="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400 rounded"
						>
							<ExclamationCircleOutline class="w-3 h-3" />
							Not Verified
						</span>
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
					<label for="phone-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>Phone Number</label
					>
					{#if phone && phoneVerified}
						<span
							class="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded"
						>
							<CheckCircleSolid class="w-3 h-3" />
							Verified
						</span>
					{:else if phone && !phoneVerified}
						<span
							class="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400 rounded"
						>
							<ExclamationCircleOutline class="w-3 h-3" />
							Not Verified
						</span>
					{/if}
				</div>
				<PhoneInput id="phone-input" bind:value={phone} bind:error={phoneError} />
				<p class="text-xs text-gray-500 mt-1">
					Optional: Add your phone number for account recovery
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
	<section class="rounded-2xl p-6 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
		<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Notifications</h2>

		<div class="space-y-4">
			<label class="flex items-center justify-between cursor-pointer group">
				<div>
					<p class="text-gray-900 dark:text-white font-medium group-hover:text-orange-400 transition-colors">
						Drop Updates
					</p>
					<p class="text-sm text-gray-400">Status changes for your drops</p>
				</div>
				<div class="relative">
					<input type="checkbox" bind:checked={notifications.dropUpdates} class="sr-only peer" />
					<div
						class="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-orange-500 transition-colors"
					></div>
					<div
						class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"
					></div>
				</div>
			</label>

			<div class="border-t border-white/10"></div>

			<label class="flex items-center justify-between cursor-pointer group">
				<div>
					<p class="text-gray-900 dark:text-white font-medium group-hover:text-orange-400 transition-colors">
						Payout Alerts
					</p>
					<p class="text-sm text-gray-400">Earnings and payout notifications</p>
				</div>
				<div class="relative">
					<input type="checkbox" bind:checked={notifications.payoutAlerts} class="sr-only peer" />
					<div
						class="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-orange-500 transition-colors"
					></div>
					<div
						class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"
					></div>
				</div>
			</label>

			<div class="border-t border-white/10"></div>

			<label class="flex items-center justify-between cursor-pointer group">
				<div>
					<p class="text-gray-900 dark:text-white font-medium group-hover:text-orange-400 transition-colors">
						Marketing
					</p>
					<p class="text-sm text-gray-400">News and tips from bbn.music</p>
				</div>
				<div class="relative">
					<input type="checkbox" bind:checked={notifications.marketing} class="sr-only peer" />
					<div
						class="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-orange-500 transition-colors"
					></div>
					<div
						class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5"
					></div>
				</div>
			</label>
		</div>
	</section>

	<!-- Security Section -->
	<section class="rounded-2xl p-6 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
		<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">Security</h2>

		<div class="space-y-4">
			<div>
				<div class="flex items-center justify-between mb-4">
					<div>
						<p class="text-gray-900 dark:text-white font-medium">Password</p>
						<p class="text-sm text-gray-500 dark:text-gray-400">Last changed: Never</p>
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
							<label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
							<label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
						<span class="px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400 rounded">
							Coming Soon
						</span>
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
