<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { auth } from '$lib/stores/auth';
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import AppSwitcher from '$lib/components/AppSwitcher.svelte';
	import NotificationCenter from '$lib/components/NotificationCenter.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { page } from '$app/stores';
	import { initApiClient, getAuthHeaders } from '$lib/apiClient';
	import { postResendVerifyEmailByMailByUser, getPictureByUserByUser } from '$lib/api/sdk.gen';
	import { initPostHog, trackPageView, identifyUser } from '$lib/analytics/posthog';
	import { cookieConsent } from '$lib/stores/cookieConsent.svelte';
	import CookieConsent from '$lib/components/CookieConsent.svelte';

	const { children } = $props();
	let hidden = $state(true);
	let showUserMenu = $state(false);
	let authChecked = $state(false);
	let sendingVerification = $state(false);
	let avatarUrl = $state<string | null>(null);
	let mounted = $state(false);

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

	// Identify user in PostHog when authenticated (only if consent given)
	$effect(() => {
		if ($auth.user?.id && cookieConsent.state === 'accepted') {
			identifyUser({
				id: $auth.user.id,
				email: $auth.user.profile.email,
				username: $auth.user.profile.username,
				isAdmin: $auth.user.isAdmin,
			});
		}
	});

	const publicRoutes = [
		'/signin',
		'/register',
		'/privacy',
		'/terms',
		'/imprint',
		'/accessibility',
		'/forgot-password',
	];
	const isPublicRoute = $derived(
		$page.data?.isPublicRoute ??
			($page.url.pathname === '/' ||
				publicRoutes.some((route) => $page.url.pathname.startsWith(route))),
	);

	// Check if we're on a share page (should hide navbar/footer)
	const isSharePage = $derived($page.url.pathname.startsWith('/s/'));

	function toggle() {
		hidden = !hidden;
	}

	function toggleUserMenu() {
		showUserMenu = !showUserMenu;
	}

	function handleLogout() {
		auth.logout();
		showUserMenu = false;
	}

	function checkAuth(pathname: string) {
		const isPublic = pathname === '/' || publicRoutes.some((route) => pathname.startsWith(route));
		const token = localStorage.getItem('access-token');
		const isAuthenticated = !!token;

		if (!isAuthenticated && !isPublic) {
			goto(`/signin?redirect=${encodeURIComponent(pathname)}`, {
				replaceState: true,
			});
			return false;
		}

		if (isAuthenticated && (pathname === '/signin' || pathname === '/register')) {
			goto('/music/drops', { replaceState: true });
			return false;
		}

		if (!isPublic && isAuthenticated) {
			auth.fetchCurrentUser();
		}

		return true;
	}

	onMount(() => {
		// Initialize API client with any localStorage overrides
		initApiClient();

		// Initialize PostHog analytics only if user has already consented
		if (cookieConsent.state === 'accepted') {
			initPostHog();
			trackPageView(window.location.href);
		}

		// Mark as mounted so we can show auth UI without flash
		mounted = true;

		if (checkAuth(window.location.pathname)) {
			authChecked = true;
		}
	});

	afterNavigate(({ to }) => {
		if (to?.url.pathname) {
			// Track page view on navigation (only if consent given)
			if (cookieConsent.state === 'accepted') {
				trackPageView(to.url.href);
			}

			authChecked = false;
			if (checkAuth(to.url.pathname)) {
				authChecked = true;
			}
		}
	});

	// Navigation items per app
	type NavItem = { href: string; label: string; exact?: boolean };

	const musicNavItems: NavItem[] = [
		{ href: '/music/drops', label: 'Drops' },
		{ href: '/music/artists', label: 'Artists' },
		{ href: '/music/payouts', label: 'Earnings' },
	];

	const adminNavItems: NavItem[] = [
		{ href: '/admin', label: 'Overview', exact: true },
		{ href: '/admin/search', label: 'Search' },
		{ href: '/admin/publishing', label: 'Publishing' },
		{ href: '/admin/reviews', label: 'Reviews' },
		{ href: '/admin/takedown', label: 'Takedowns' },
		{ href: '/admin/payouts', label: 'Payouts' },
		{ href: '/admin/messaging', label: 'Messaging' },
		{ href: '/admin/oauth', label: 'OAuth' },
	];

	const walletNavItems: NavItem[] = [{ href: '/wallet', label: 'Overview', exact: true }];

	// Detect current app and get appropriate nav items
	const currentApp = $derived.by(() => {
		const path = $page.url.pathname;
		if (path.startsWith('/admin')) return 'admin';
		if (path.startsWith('/wallet')) return 'wallet';
		if (path.startsWith('/music')) return 'music';
		return 'music';
	});

	const navItems = $derived.by(() => {
		switch (currentApp) {
			case 'admin':
				return adminNavItems;
			case 'wallet':
				return walletNavItems;
			default:
				return musicNavItems;
		}
	});

	// Get the accent color for the current app
	const accentColor = $derived.by(() => {
		switch (currentApp) {
			case 'admin':
				return 'red';
			case 'wallet':
				return 'green';
			default:
				return 'orange';
		}
	});

	function isActive(href: string, exact = false): boolean {
		if (exact) return $page.url.pathname === href;
		return $page.url.pathname.startsWith(href);
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (showUserMenu && !target.closest('[data-user-menu]')) {
			showUserMenu = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && showUserMenu) {
			showUserMenu = false;
		}
	}

	// Email verification banner
	const emailVerified = $derived($auth.user?.profile.verified.email ?? true);
	const showVerificationBanner = $derived(
		$auth.isAuthenticated && !emailVerified && !isPublicRoute,
	);

	async function resendVerificationEmail() {
		sendingVerification = true;
		try {
			await postResendVerifyEmailByMailByUser({
				headers: getAuthHeaders(),
			});
		} catch (e) {
			console.error('Failed to send verification email:', e);
		} finally {
			sendingVerification = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div
	class="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-black dark:to-gray-900 overflow-x-hidden"
>
	<!-- Skip link for keyboard navigation (BFSG/WCAG 2.1 AA compliance) -->
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
	>
		Skip to main content
	</a>

	<!-- Modern Navigation Bar (hidden on share pages) -->
	{#if !isSharePage}
		<nav class="glass sticky top-0 z-50 border-b border-black/10 dark:border-white/10">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex items-center justify-between h-16 relative">
					<!-- Logo / App Switcher -->
					<div class="flex items-center">
						<AppSwitcher />
					</div>

					{#if !isPublicRoute && $auth.isAuthenticated}
						<!-- Desktop Navigation (absolutely centered) -->
						<div class="hidden md:block absolute left-1/2 -translate-x-1/2">
							<div class="flex items-center space-x-1">
								{#each navItems as item}
									{@const active = isActive(item.href, item.exact)}
									<a
										href={item.href}
										class="px-4 py-2 rounded-lg transition-all duration-200 {active
											? currentApp === 'admin'
												? 'bg-red-500/20 text-red-600 dark:text-red-400'
												: currentApp === 'wallet'
													? 'bg-green-500/20 text-green-600 dark:text-green-400'
													: 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
											: 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'}"
									>
										{item.label}
									</a>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Right side buttons -->
					<div class="flex items-center space-x-3">
						<!-- Notification Center (only shown when authenticated) -->
						{#if !isPublicRoute && $auth.isAuthenticated}
							<NotificationCenter />
						{/if}

						<!-- User section (only render after mounted to prevent flash) -->
						{#if !mounted}
							<!-- Placeholder to prevent layout shift -->
							<div class="w-8 h-8"></div>
						{:else if $auth.isAuthenticated}
							<!-- User avatar with dropdown -->
							<div class="relative" data-user-menu>
								<button
									onclick={toggleUserMenu}
									class="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity overflow-hidden {currentApp ===
									'admin'
										? 'bg-gradient-to-r from-red-500 to-red-400'
										: currentApp === 'wallet'
											? 'bg-gradient-to-r from-green-500 to-green-400'
											: 'bg-gradient-to-r from-orange-500 to-orange-400'}"
									aria-expanded={showUserMenu}
									aria-haspopup="menu"
									aria-label="User menu"
								>
									{#if avatarUrl}
										<img
											src={avatarUrl}
											alt={$auth.user?.profile.username || 'User'}
											class="w-full h-full object-cover"
										/>
									{:else}
										<span class="text-white text-sm font-semibold">
											{$auth.user?.profile.username
												? $auth.user.profile.username[0].toUpperCase()
												: 'U'}
										</span>
									{/if}
								</button>

								<!-- User dropdown menu -->
								{#if showUserMenu}
									<div
										class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1"
										onclick={(e: MouseEvent) => e.stopPropagation()}
										onkeydown={(e: KeyboardEvent) => {
											if (e.key === 'Escape') showUserMenu = false;
										}}
										role="menu"
										aria-label="User menu"
										tabindex="-1"
									>
										<div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
											<p class="text-sm text-gray-900 dark:text-white font-semibold">
												{$auth.user?.profile.username || 'User'}
											</p>
											<p class="text-xs text-gray-500 dark:text-gray-400">
												{$auth.user?.profile.email || ''}
											</p>
										</div>
										<a
											href="/settings"
											role="menuitem"
											class="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
										>
											Settings
										</a>
										<hr class="my-1 border-gray-200 dark:border-gray-700" aria-hidden="true" />
										<button
											onclick={handleLogout}
											role="menuitem"
											class="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-700 dark:hover:text-red-300"
										>
											Logout
										</button>
									</div>
								{/if}
							</div>
						{:else}
							<!-- Sign In/Register buttons when not authenticated -->
							<div class="hidden md:flex items-center space-x-2">
								<a
									href="/signin"
									class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 text-sm transition-colors"
								>
									Sign In
								</a>
								<a
									href="/register"
									class="bg-gradient-to-r from-orange-500 to-orange-400 text-white px-4 py-1.5 rounded-full text-sm hover:opacity-90 transition-opacity"
								>
									Sign Up
								</a>
							</div>
						{/if}

						<!-- Mobile menu button (only when authenticated) -->
						{#if !isPublicRoute && $auth.isAuthenticated}
							<button
								onclick={toggle}
								class="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
								aria-label={hidden ? 'Open menu' : 'Close menu'}
							>
								<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									{#if hidden}
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 6h16M4 12h16M4 18h16"
										/>
									{:else}
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									{/if}
								</svg>
							</button>
						{/if}
					</div>
				</div>

				<!-- Mobile Navigation (only when authenticated) -->
				{#if !hidden && !isPublicRoute && $auth.isAuthenticated}
					<div class="md:hidden pb-4">
						<div class="flex flex-col space-y-1">
							{#each navItems as item}
								{@const active = isActive(item.href, item.exact)}
								<a
									href={item.href}
									class="px-4 py-2 rounded-lg transition-all duration-200 {active
										? currentApp === 'admin'
											? 'bg-red-500/20 text-red-600 dark:text-red-400'
											: currentApp === 'wallet'
												? 'bg-green-500/20 text-green-600 dark:text-green-400'
												: 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
										: 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'}"
								>
									{item.label}
								</a>
							{/each}

							<!-- Auth section for mobile -->
							<hr class="my-2 border-gray-200 dark:border-gray-700" />
							<a
								href="/settings"
								class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 px-4 py-2 rounded-lg transition-all duration-200"
							>
								Settings
							</a>
							<button
								onclick={handleLogout}
								class="text-left text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-black/5 dark:hover:bg-white/10 px-4 py-2 rounded-lg transition-all duration-200"
							>
								Logout
							</button>
						</div>
					</div>
				{/if}
			</div>
		</nav>
	{/if}

	<!-- Email Verification Banner -->
	{#if showVerificationBanner}
		<div
			class="border-b border-red-500/30 bg-gradient-to-r from-red-100 to-red-50 dark:from-red-950/80 dark:to-red-900/60"
		>
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex items-center justify-between py-3 gap-4">
					<p class="text-sm font-semibold text-red-700 dark:text-red-300">
						Your Email is not verified. Please check your Inbox/Spam folder.
					</p>
					<button
						onclick={resendVerificationEmail}
						disabled={sendingVerification}
						class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/20 text-red-700 dark:text-red-200 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
					>
						{sendingVerification ? 'Sending...' : 'Resend Verify Email'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Main Content -->
	<main
		id="main-content"
		class={isSharePage ? 'flex-1' : 'flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full'}
	>
		{#if isPublicRoute || authChecked}
			{@render children()}
		{:else}
			<div class="flex items-center justify-center min-h-[50vh]">
				<div
					class="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin {currentApp ===
					'admin'
						? 'border-red-500'
						: currentApp === 'wallet'
							? 'border-green-500'
							: 'border-orange-500'}"
				></div>
			</div>
		{/if}
	</main>

	<!-- Toast Notifications -->
	<Toast />

	<!-- Cookie Consent Banner -->
	<CookieConsent />

	<!-- Modern Footer (hidden on share pages) -->
	{#if !isSharePage}
		<footer class="glass border-t border-black/10 dark:border-white/10 mt-auto">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div class="flex flex-col space-y-6">
					<!-- Legal Links -->
					<div class="flex flex-wrap justify-center gap-6 text-sm">
						<a
							href="/privacy"
							class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
							>Privacy Policy</a
						>
						<a
							href="/terms"
							class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
							>Terms & Conditions</a
						>
						<a
							href="/imprint"
							class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
							>Imprint</a
						>
						<a
							href="/accessibility"
							class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
							>Accessibility</a
						>
					</div>

					<div
						class="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
					>
						<div class="text-gray-500 dark:text-gray-400 text-sm">
							© {new Date().getFullYear()} BBN Music GmbH. All rights reserved.
						</div>
						<div class="flex space-x-6">
							<a
								href="https://discord.com/invite/dJevjw2fCe"
								target="_blank"
								rel="noopener noreferrer"
								class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
								aria-label="Discord"
							>
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
									<path
										d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"
									/>
								</svg>
							</a>
							<a
								href="https://www.instagram.com/bbn.music/"
								target="_blank"
								rel="noopener noreferrer"
								class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
								aria-label="Instagram"
							>
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
									<path
										d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"
									/>
								</svg>
							</a>
							<a
								href="https://chaos.social/@bbn"
								target="_blank"
								rel="noopener noreferrer"
								class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
								aria-label="Mastodon"
							>
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
									<path
										d="M11.19 12.195c2.016-.24 3.77-1.475 3.99-2.603.348-1.778.32-4.339.32-4.339 0-3.47-2.286-4.488-2.286-4.488C12.062.238 10.083.017 8.027 0h-.05C5.92.017 3.942.238 2.79.765c0 0-2.285 1.017-2.285 4.488l-.002.662c-.004.64-.007 1.35.011 2.091.083 3.394.626 6.74 3.78 7.57 1.454.383 2.703.463 3.709.408 1.823-.1 2.847-.647 2.847-.647l-.06-1.317s-1.303.41-2.767.36c-1.45-.05-2.98-.156-3.215-1.928a4 4 0 0 1-.033-.496s1.424.346 3.228.428c1.103.05 2.137-.064 3.188-.189zm1.613-2.47H11.13v-4.08c0-.859-.364-1.295-1.091-1.295-.804 0-1.207.517-1.207 1.541v2.233H7.168V5.89c0-1.024-.403-1.541-1.207-1.541-.727 0-1.091.436-1.091 1.296v4.079H3.197V5.522q0-1.288.66-2.046c.456-.505 1.052-.764 1.793-.764.856 0 1.504.328 1.933.983L8 4.39l.417-.695c.429-.655 1.077-.983 1.934-.983.74 0 1.336.259 1.791.764q.662.757.661 2.046z"
									/>
								</svg>
							</a>
							<a
								href="https://github.com/bbn-music/"
								target="_blank"
								rel="noopener noreferrer"
								class="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
								aria-label="GitHub"
							>
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
									<path
										d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"
									/>
								</svg>
							</a>
						</div>
					</div>
				</div>
			</div>
		</footer>
	{/if}
</div>
