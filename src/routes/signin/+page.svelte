<script lang="ts">
import { Button, Spinner } from '$lib/components/ui';
import {
	EnvelopeSolid,
	LockSolid,
	ExclamationCircleOutline,
	CheckCircleSolid,
} from 'flowbite-svelte-icons';
import { auth } from '$lib/stores/auth';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { onMount } from 'svelte';
import { APITools } from '$lib/api';
import {
	getTokenByFromUserInteractionByAuth,
	postTokenByValidateByMailByUser,
	putUserByUser,
} from '$lib/api/sdk.gen';

type ViewState = 'login' | 'processing' | 'reset-password' | 'email-verified';

let email = $state('');
let password = $state('');
let newPassword = $state('');
let confirmNewPassword = $state('');
let isLoading = $state(false);
let error = $state('');
let viewState = $state<ViewState>('login');

// Get redirect URL from query params
const redirectUrl = $derived($page.url.searchParams.get('redirect') || '/drops');

// Handle special auth callbacks (OAuth, password reset, email verification)
onMount(async () => {
	const params = $page.url.searchParams;
	const type = params.get('type');
	const code = params.get('code');
	const token = params.get('token');

	// OAuth callback
	if (type && code && ['google', 'discord', 'microsoft'].includes(type)) {
		viewState = 'processing';
		isLoading = true;

		const success = await auth.oauthLogin(type, code);

		if (success) {
			goto(redirectUrl);
		} else {
			error = 'OAuth login failed. Please try again.';
			viewState = 'login';
		}
		isLoading = false;
		return;
	}

	// Password reset from email link
	if (type === 'reset-password' && token) {
		viewState = 'processing';
		isLoading = true;

		try {
			const response = await getTokenByFromUserInteractionByAuth({
				path: { token },
			});

			if (response.error) {
				throw new Error(
					(response.error as any)?.message ||
						'Invalid or expired reset link',
				);
			}

			const data = response.data as { token?: string } | undefined;
			if (!data?.token) {
				throw new Error('Invalid reset link');
			}

			// Log the user in with the token
			const success = await auth.loginWithToken(data.token);
			if (success) {
				viewState = 'reset-password';
			} else {
				throw new Error('Failed to authenticate');
			}
		} catch (err: any) {
			error =
				err.message ||
				'Invalid or expired reset link. Please request a new one.';
			viewState = 'login';
		}
		isLoading = false;
		return;
	}

	// Email verification from email link
	if (type === 'verify-email' && token) {
		viewState = 'processing';
		isLoading = true;

		try {
			const response = await postTokenByValidateByMailByUser({
				path: { token },
			});

			if (response.error) {
				throw new Error(
					(response.error as any)?.message ||
						'Invalid or expired verification link',
				);
			}

			// Refresh user token to get updated email verification status
			await auth.refreshToken();
			viewState = 'email-verified';
		} catch (err: any) {
			error = err.message || 'Invalid or expired verification link.';
			viewState = 'login';
		}
		isLoading = false;
		return;
	}
});

async function handleSetNewPassword(event: Event) {
	event.preventDefault();
	error = '';

	if (!newPassword || newPassword.length < 8) {
		error = 'Password must be at least 8 characters';
		return;
	}

	if (newPassword !== confirmNewPassword) {
		error = 'Passwords do not match';
		return;
	}

	isLoading = true;

	try {
		const response = await putUserByUser({
			body: { password: newPassword },
			headers: { Authorization: `JWT ${auth.getStoredToken()}` },
		});

		if (response.error) {
			throw new Error(
				(response.error as any)?.message || 'Failed to update password',
			);
		}

		// Password updated, redirect to drops
		goto('/drops');
	} catch (err: any) {
		error = err.message || 'Failed to update password. Please try again.';
	}

	isLoading = false;
}

async function handleSubmit(event: Event) {
	event.preventDefault();
	error = '';

	if (!email || !password) {
		error = 'Please fill in all fields';
		return;
	}

	isLoading = true;
	const success = await auth.login(email, password);

	if (success) {
		goto(redirectUrl);
	} else {
		error = 'Invalid email or password';
	}
	isLoading = false;
}

function handleOAuth(provider: 'google' | 'discord' | 'microsoft') {
	// Store the redirect goal before OAuth redirect
	localStorage.setItem('goal', redirectUrl);
	window.location.href = APITools.oauthRedirect(provider);
}
</script>

<div class="min-h-screen flex items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		{#if viewState === 'processing'}
			<!-- Processing state (OAuth, reset, verification) -->
			<div class="glass rounded-2xl p-8 space-y-6 border border-white/10 text-center">
				<div class="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
					<span class="text-white font-bold text-3xl">B</span>
				</div>
				<Spinner class="mx-auto" size="lg" color="primary" />
				<p class="text-gray-400">Processing...</p>
			</div>
		{:else if viewState === 'reset-password'}
			<!-- Set new password form -->
			<div class="glass rounded-2xl p-8 space-y-6 border border-white/10">
				<div class="text-center">
					<div class="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
						<span class="text-white font-bold text-3xl">B</span>
					</div>
					<h1 class="text-3xl font-bold text-white">Set New Password</h1>
					<p class="mt-2 text-gray-400">Enter your new password below</p>
				</div>

				{#if error}
					<div class="flex items-center gap-3 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300">
						<ExclamationCircleOutline class="w-5 h-5 flex-shrink-0" />
						<span class="text-sm font-medium">{error}</span>
						<button
							type="button"
							onclick={() => (error = '')}
							class="ml-auto text-red-300 hover:text-red-200 transition-colors"
							aria-label="Dismiss error"
						>
							<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
							</svg>
						</button>
					</div>
				{/if}

				<form onsubmit={handleSetNewPassword} class="space-y-5">
					<!-- Hidden email field for password managers and accessibility -->
					<input
						type="email"
						name="email"
						value={$auth.user?.profile.email || ''}
						autocomplete="username"
						readonly
						tabindex="-1"
						aria-hidden="true"
						style="position: absolute; left: -9999px; width: 1px; height: 1px;"
					/>
					<div>
						<label for="newPassword" class="block text-sm font-medium text-gray-300 mb-2">New Password</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<LockSolid class="w-5 h-5 text-gray-500" />
							</div>
							<input
								type="password"
								id="newPassword"
								name="newPassword"
								bind:value={newPassword}
								placeholder="Enter new password"
								required
								minlength="8"
								autocomplete="new-password"
								class="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 hover:border-white/20 transition-all"
							/>
						</div>
					</div>

					<div>
						<label for="confirmNewPassword" class="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<LockSolid class="w-5 h-5 text-gray-500" />
							</div>
							<input
								type="password"
								id="confirmNewPassword"
								name="confirmNewPassword"
								bind:value={confirmNewPassword}
								placeholder="Confirm new password"
								required
								minlength="8"
								autocomplete="new-password"
								class="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 hover:border-white/20 transition-all"
							/>
						</div>
					</div>

					<Button
						type="submit"
						size="lg"
						class="w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-orange-500/20 transition-all"
						disabled={isLoading}
					>
						{#if isLoading}
							<Spinner class="mr-2" size="sm" />
							Updating...
						{:else}
							Set New Password
						{/if}
					</Button>
				</form>
			</div>
		{:else if viewState === 'email-verified'}
			<!-- Email verified success -->
			<div class="glass rounded-2xl p-8 space-y-6 border border-white/10 text-center">
				<div class="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
					<span class="text-white font-bold text-3xl">B</span>
				</div>
				<div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
					<CheckCircleSolid class="w-8 h-8 text-green-400" />
				</div>
				<h1 class="text-2xl font-bold text-white">Email Verified!</h1>
				<p class="text-gray-400">Your email has been successfully verified.</p>
				<Button
					href="/drops"
					class="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white font-semibold py-3 px-6 rounded-lg shadow-lg shadow-orange-500/20 transition-all"
				>
					Continue to Drops
				</Button>
			</div>
		{:else}
		<div class="glass rounded-2xl p-8 space-y-6 border border-white/10">
			<!-- Logo and Title -->
			<div class="text-center">
				<div class="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
					<span class="text-white font-bold text-3xl">B</span>
				</div>
				<h1 class="text-3xl font-bold text-white">Welcome Back</h1>
				<p class="mt-2 text-gray-400">Sign in to continue to bbn.music</p>
			</div>

			{#if error}
				<div class="flex items-center gap-3 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300">
					<ExclamationCircleOutline class="w-5 h-5 flex-shrink-0" />
					<span class="text-sm font-medium">{error}</span>
					<button
						type="button"
						onclick={() => (error = '')}
						class="ml-auto text-red-300 hover:text-red-200 transition-colors"
						aria-label="Dismiss error"
					>
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
						</svg>
					</button>
				</div>
			{/if}

			<!-- Sign In Form -->
			<form onsubmit={handleSubmit} class="space-y-5">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-300 mb-2">Email</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<EnvelopeSolid class="w-5 h-5 text-gray-500" />
						</div>
						<input
							type="email"
							id="email"
							name="email"
							bind:value={email}
							placeholder="you@example.com"
							required
							autocomplete="email"
							class="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 hover:border-white/20 transition-all"
						/>
					</div>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-300 mb-2">Password</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<LockSolid class="w-5 h-5 text-gray-500" />
						</div>
						<input
							type="password"
							id="password"
							name="password"
							bind:value={password}
							placeholder="Enter your password"
							required
							autocomplete="current-password"
							class="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 hover:border-white/20 transition-all"
						/>
					</div>
				</div>

				<div class="flex justify-end">
					<a href="/forgot-password" class="text-sm text-orange-400 hover:text-orange-300">
						Forgot password?
					</a>
				</div>

				<Button
					type="submit"
					size="lg"
					class="w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-orange-500/20 transition-all"
					disabled={isLoading}
				>
					{#if isLoading}
						<Spinner class="mr-2" size="sm" />
						Signing in...
					{:else}
						Sign In
					{/if}
				</Button>
			</form>

			<!-- Divider -->
			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-white/10"></div>
				</div>
				<div class="relative flex justify-center text-sm">
					<span class="px-3 bg-gray-900/80 text-gray-500">Or continue with</span>
				</div>
			</div>

			<!-- Social Sign In -->
			<div class="grid grid-cols-2 gap-3" role="group" aria-label="Social sign in options">
				<button
					type="button"
					onclick={() => handleOAuth('google')}
					class="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all"
					aria-label="Sign in with Google"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
					</svg>
					<span class="text-sm text-gray-300">Google</span>
				</button>
				<button
					type="button"
					onclick={() => handleOAuth('discord')}
					class="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all"
					aria-label="Sign in with Discord"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
						<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
					</svg>
					<span class="text-sm text-gray-300">Discord</span>
				</button>
			</div>

			<!-- Sign Up Link -->
			<p class="text-center text-sm text-gray-400">
				Don't have an account?
				<a href="/register" class="font-medium text-orange-400 hover:text-orange-300">Sign up</a>
			</p>
		</div>
		{/if}
	</div>
</div>
