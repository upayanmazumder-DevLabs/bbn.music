<script lang="ts">
import { Button, Spinner } from '$lib/components/ui';
import {
	EnvelopeSolid,
	LockSolid,
	UserCircleOutline,
	ExclamationCircleOutline,
} from 'flowbite-svelte-icons';
import { auth } from '$lib/stores/auth';
import { goto } from '$app/navigation';
import { APITools } from '$lib/api';

let name = $state('');
let email = $state('');
let password = $state('');
let confirmPassword = $state('');
let agreeToTerms = $state(false);
let isLoading = $state(false);
let error = $state('');
let validationErrors = $state({
	name: '',
	email: '',
	password: '',
	confirmPassword: '',
});

function validateForm(): boolean {
	let isValid = true;
	validationErrors = {
		name: '',
		email: '',
		password: '',
		confirmPassword: '',
	};

	if (!name || name.length < 2) {
		validationErrors.name = 'Name must be at least 2 characters long';
		isValid = false;
	}

	if (!email || !email.includes('@')) {
		validationErrors.email = 'Please enter a valid email address';
		isValid = false;
	}

	if (!password || password.length < 8) {
		validationErrors.password =
			'Password must be at least 8 characters long';
		isValid = false;
	}

	if (password !== confirmPassword) {
		validationErrors.confirmPassword = 'Passwords do not match';
		isValid = false;
	}

	if (!agreeToTerms) {
		error = 'You must agree to the terms and conditions';
		isValid = false;
	}

	return isValid;
}

async function handleSubmit(event: Event) {
	event.preventDefault();
	error = '';

	if (!validateForm()) {
		return;
	}

	isLoading = true;
	const success = await auth.register(email, password, name);

	if (!success) {
		error = 'Registration failed. Email might already be in use.';
	}
	isLoading = false;
}

function handleOAuth(provider: 'google' | 'discord' | 'microsoft') {
	// Store the redirect goal before OAuth redirect
	localStorage.setItem('goal', '/drops');
	window.location.href = APITools.oauthRedirect(provider);
}
</script>

<div class="min-h-screen flex items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		<div class="glass rounded-2xl p-8 space-y-6 border border-white/10">
			<!-- Logo and Title -->
			<div class="text-center">
				<div class="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
					<span class="text-white font-bold text-3xl">B</span>
				</div>
				<h1 class="text-3xl font-bold text-white">Create Account</h1>
				<p class="mt-2 text-gray-400">Join bbn.music today</p>
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

			<!-- Registration Form -->
			<form onsubmit={handleSubmit} class="space-y-5">
				<div>
					<label for="name" class="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<UserCircleOutline class="w-5 h-5 text-gray-500" />
						</div>
						<input
							type="text"
							id="name"
							name="name"
							bind:value={name}
							placeholder="John Doe"
							required
							autocomplete="name"
							class="w-full pl-10 pr-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all {validationErrors.name
								? 'border-red-500'
								: 'border-white/10 hover:border-white/20'}"
						/>
					</div>
					{#if validationErrors.name}
						<p class="mt-1.5 text-sm text-red-400">{validationErrors.name}</p>
					{/if}
				</div>

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
							class="w-full pl-10 pr-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all {validationErrors.email
								? 'border-red-500'
								: 'border-white/10 hover:border-white/20'}"
						/>
					</div>
					{#if validationErrors.email}
						<p class="mt-1.5 text-sm text-red-400">{validationErrors.email}</p>
					{/if}
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
							placeholder="Minimum 8 characters"
							required
							autocomplete="new-password"
							class="w-full pl-10 pr-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all {validationErrors.password
								? 'border-red-500'
								: 'border-white/10 hover:border-white/20'}"
						/>
					</div>
					{#if validationErrors.password}
						<p class="mt-1.5 text-sm text-red-400">{validationErrors.password}</p>
					{:else}
						<p class="mt-1.5 text-sm text-gray-500">Use 8 or more characters with letters, numbers & symbols</p>
					{/if}
				</div>

				<div>
					<label for="confirmPassword" class="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<LockSolid class="w-5 h-5 text-gray-500" />
						</div>
						<input
							type="password"
							id="confirmPassword"
							name="confirmPassword"
							bind:value={confirmPassword}
							placeholder="Repeat your password"
							required
							autocomplete="new-password"
							class="w-full pl-10 pr-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all {validationErrors.confirmPassword
								? 'border-red-500'
								: 'border-white/10 hover:border-white/20'}"
						/>
					</div>
					{#if validationErrors.confirmPassword}
						<p class="mt-1.5 text-sm text-red-400">{validationErrors.confirmPassword}</p>
					{/if}
				</div>

				<div class="flex items-start">
					<input
						type="checkbox"
						id="agreeToTerms"
						bind:checked={agreeToTerms}
						class="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500/50 focus:ring-offset-0"
						aria-describedby="terms-label"
					/>
					<label for="agreeToTerms" id="terms-label" class="ml-2.5 text-sm text-gray-400">
						I agree to the
						<a href="/terms" class="text-orange-400 hover:text-orange-300 hover:underline">Terms of Service</a>
						and
						<a href="/privacy" class="text-orange-400 hover:text-orange-300 hover:underline">Privacy Policy</a>
					</label>
				</div>

				<Button
					type="submit"
					size="lg"
					class="w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-orange-500/20 transition-all"
					disabled={isLoading || !agreeToTerms}
				>
					{#if isLoading}
						<Spinner class="mr-2" size="sm" />
						Creating account...
					{:else}
						Create Account
					{/if}
				</Button>
			</form>

			<!-- Divider -->
			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-white/10"></div>
				</div>
				<div class="relative flex justify-center text-sm">
					<span class="px-3 bg-gray-900/80 text-gray-500">Or sign up with</span>
				</div>
			</div>

			<!-- Social Sign Up -->
			<div class="grid grid-cols-2 gap-3" role="group" aria-label="Social sign up options">
				<button
					type="button"
					onclick={() => handleOAuth('google')}
					class="flex items-center justify-center gap-2 py-3 px-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all"
					aria-label="Sign up with Google"
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
					aria-label="Sign up with Discord"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
						<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
					</svg>
					<span class="text-sm text-gray-300">Discord</span>
				</button>
			</div>

			<!-- Sign In Link -->
			<p class="text-center text-sm text-gray-400">
				Already have an account?
				<a href="/signin" class="font-medium text-orange-400 hover:text-orange-300">Sign in</a>
			</p>
		</div>
	</div>
</div>
