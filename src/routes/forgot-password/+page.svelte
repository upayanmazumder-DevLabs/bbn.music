<script lang="ts">
	import { Alert, Button, Input, Spinner } from '$lib/components/ui';
	import { EnvelopeSolid, CheckCircleSolid } from 'flowbite-svelte-icons';
	import { postResetPasswordByAuth } from '$lib/api/sdk.gen';
	import { extractErrorMessage } from '$lib/utils/extractError';

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
				throw new Error((response.error as any)?.message || 'Failed to send reset email');
			}

			success = true;
		} catch (err: unknown) {
			error = extractErrorMessage(err, 'Failed to send reset email. Please try again.');
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
				<div
					class="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20"
				>
					<span class="text-white font-bold text-3xl">B</span>
				</div>
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
				<p class="mt-2 text-gray-500 dark:text-gray-400">
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
						<p class="text-gray-900 dark:text-white font-medium">Email sent successfully!</p>
						<p class="text-gray-500 dark:text-gray-400 text-sm">
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
					<Alert variant="error" dismissible ondismiss={() => (error = '')}>{error}</Alert>
				{/if}

				<!-- Reset Form -->
				<form onsubmit={handleSubmit} class="space-y-5">
					<Input
						label="Email"
						type="email"
						name="email"
						bind:value={email}
						placeholder="you@example.com"
						required
						autocomplete="email"
					>
						{#snippet icon()}<EnvelopeSolid class="w-5 h-5" />{/snippet}
					</Input>

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
				<p class="text-center text-sm text-gray-500 dark:text-gray-400">
					Remember your password?
					<a
						href="/signin"
						class="font-medium text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300"
						>Sign in</a
					>
				</p>
			{/if}
		</div>
	</div>
</div>
