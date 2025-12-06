<script lang="ts">
import { Button, Spinner } from '$lib/components/ui';
import {
	EnvelopeSolid,
	ExclamationCircleOutline,
	CheckCircleSolid,
} from 'flowbite-svelte-icons';
import { postResetPasswordByAuth } from '$lib/api/sdk.gen';

let email = $state('');
let isLoading = $state(false);
let error = $state('');
let success = $state(false);

async function handleSubmit(event: Event) {
	event.preventDefault();
	error = '';

	if (!email) {
		error = 'Please enter your email address';
		return;
	}

	isLoading = true;

	try {
		const response = await postResetPasswordByAuth({
			body: { email },
		});

		if (response.error) {
			throw new Error(
				(response.error as any)?.message ||
					'Failed to send reset email',
			);
		}

		success = true;
	} catch (err: any) {
		console.error('Password reset error:', err);
		error = err.message || 'Failed to send reset email. Please try again.';
	}

	isLoading = false;
}
</script>

<svelte:head>
	<title>Forgot Password - bbn.music</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		<div class="glass rounded-2xl p-8 space-y-6 border border-white/10">
			<!-- Logo and Title -->
			<div class="text-center">
				<div class="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
					<span class="text-white font-bold text-3xl">B</span>
				</div>
				<h1 class="text-3xl font-bold text-white">Reset Password</h1>
				<p class="mt-2 text-gray-400">
					{#if success}
						Check your email for reset instructions
					{:else}
						Enter your email to receive a reset link
					{/if}
				</p>
			</div>

			{#if success}
				<!-- Success State -->
				<div class="flex flex-col items-center gap-4 py-6">
					<div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
						<CheckCircleSolid class="w-8 h-8 text-green-400" />
					</div>
					<div class="text-center space-y-2">
						<p class="text-white font-medium">Email sent successfully!</p>
						<p class="text-gray-400 text-sm">
							We've sent a password reset link to <span class="text-orange-400">{email}</span>.
							Please check your inbox and spam folder.
						</p>
					</div>
					<a
						href="/signin"
						class="mt-4 text-orange-400 hover:text-orange-300 font-medium transition-colors"
					>
						Back to Sign In
					</a>
				</div>
			{:else}
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

				<!-- Reset Form -->
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

					<Button
						type="submit"
						size="lg"
						class="w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-orange-500/20 transition-all"
						disabled={isLoading}
					>
						{#if isLoading}
							<Spinner class="mr-2" size="sm" />
							Sending...
						{:else}
							Send Reset Link
						{/if}
					</Button>
				</form>

				<!-- Back to Sign In Link -->
				<p class="text-center text-sm text-gray-400">
					Remember your password?
					<a href="/signin" class="font-medium text-orange-400 hover:text-orange-300">Sign in</a>
				</p>
			{/if}
		</div>
	</div>
</div>
