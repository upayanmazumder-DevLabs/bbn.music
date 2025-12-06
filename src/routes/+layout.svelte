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
	import { initApiClient, getAuthHeaders } from '$lib/api';
	import { postResendVerifyEmailByMailByUser, getPictureByUserByUser } from '$lib/api/sdk.gen';
	import { initPostHog, trackPageView, identifyUser } from '$lib/analytics/posthog';

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

	// Identify user in PostHog when authenticated
	$effect(() => {
		if ($auth.user?.id) {
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
			goto('/drops', { replaceState: true });
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

		// Initialize PostHog analytics
		initPostHog();
		trackPageView(window.location.href);

		// Mark as mounted so we can show auth UI without flash
		mounted = true;

		if (checkAuth(window.location.pathname)) {
			authChecked = true;
		}
	});

	afterNavigate(({ to }) => {
		if (to?.url.pathname) {
			// Track page view on navigation
			trackPageView(to.url.href);

			authChecked = false;
			if (checkAuth(to.url.pathname)) {
				authChecked = true;
			}
		}
	});

	// Navigation items per app
	type NavItem = { href: string; label: string; exact?: boolean };

	const musicNavItems: NavItem[] = [
		{ href: '/drops', label: 'Drops' },
		{ href: '/artists', label: 'Artists' },
		{ href: '/payouts', label: 'Earnings' },
	];

	const adminNavItems: NavItem[] = [
		{ href: '/admin', label: 'Overview', exact: true },
		{ href: '/admin/search', label: 'Search' },
		{ href: '/admin/publishing', label: 'Publishing' },
		{ href: '/admin/reviews', label: 'Reviews' },
		{ href: '/admin/takedown', label: 'Takedowns' },
		{ href: '/admin/payouts', label: 'Payouts' },
		{ href: '/admin/oauth', label: 'OAuth' },
	];

	const walletNavItems: NavItem[] = [{ href: '/wallet', label: 'Overview', exact: true }];

	// Detect current app and get appropriate nav items
	const currentApp = $derived.by(() => {
		const path = $page.url.pathname;
		if (path.startsWith('/admin')) return 'admin';
		if (path.startsWith('/wallet')) return 'wallet';
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

<div class="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900">
	<!-- Skip link for keyboard navigation (BFSG/WCAG 2.1 AA compliance) -->
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
	>
		Skip to main content
	</a>

	<!-- Modern Navigation Bar (hidden on share pages) -->
	{#if !isSharePage}
		<nav class="glass sticky top-0 z-50 border-b border-white/10">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex items-center justify-between h-16">
					<!-- Logo / App Switcher -->
					<div class="flex items-center">
						<AppSwitcher />
					</div>

					{#if !isPublicRoute && $auth.isAuthenticated}
						<!-- Desktop Navigation (only shown when authenticated on protected routes) -->
						<div class="hidden md:block">
							<div class="flex items-center space-x-1">
								{#each navItems as item}
									{@const active = isActive(item.href, item.exact)}
									<a
										href={item.href}
										class="px-4 py-2 rounded-lg transition-all duration-200 {active
											? currentApp === 'admin'
												? 'bg-red-500/20 text-red-400'
												: currentApp === 'wallet'
													? 'bg-green-500/20 text-green-400'
													: 'bg-orange-500/20 text-orange-400'
											: 'text-gray-300 hover:text-white hover:bg-white/10'}"
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
										class="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1"
										onclick={(e: MouseEvent) => e.stopPropagation()}
										onkeydown={(e: KeyboardEvent) => {
											if (e.key === 'Escape') showUserMenu = false;
										}}
										role="menu"
										aria-label="User menu"
										tabindex="-1"
									>
										<div class="px-4 py-2 border-b border-gray-700">
											<p class="text-sm text-white font-semibold">
												{$auth.user?.profile.username || 'User'}
											</p>
											<p class="text-xs text-gray-400">{$auth.user?.profile.email || ''}</p>
										</div>
										<a
											href="/settings"
											role="menuitem"
											class="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
										>
											Settings
										</a>
										<hr class="my-1 border-gray-700" aria-hidden="true" />
										<button
											onclick={handleLogout}
											role="menuitem"
											class="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300"
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
									class="text-gray-300 hover:text-white px-3 py-1.5 text-sm transition-colors"
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
								class="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
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
											? 'bg-red-500/20 text-red-400'
											: currentApp === 'wallet'
												? 'bg-green-500/20 text-green-400'
												: 'bg-orange-500/20 text-orange-400'
										: 'text-gray-300 hover:text-white hover:bg-white/10'}"
								>
									{item.label}
								</a>
							{/each}

							<!-- Auth section for mobile -->
							<hr class="my-2 border-gray-700" />
							<a
								href="/settings"
								class="text-gray-300 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg transition-all duration-200"
							>
								Settings
							</a>
							<button
								onclick={handleLogout}
								class="text-left text-red-400 hover:text-red-300 hover:bg-white/10 px-4 py-2 rounded-lg transition-all duration-200"
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
		<div class="border-b border-red-500/30 bg-gradient-to-r from-red-950/80 to-red-900/60">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex items-center justify-between py-3 gap-4">
					<p class="text-sm font-semibold text-red-300">
						Your Email is not verified. Please check your Inbox/Spam folder.
					</p>
					<button
						onclick={resendVerificationEmail}
						disabled={sendingVerification}
						class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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

	<!-- Modern Footer (hidden on share pages) -->
	{#if !isSharePage}
		<footer class="glass border-t border-white/10 mt-auto">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div class="flex flex-col space-y-6">
					<!-- Legal Links -->
					<div class="flex flex-wrap justify-center gap-6 text-sm">
						<a href="/privacy" class="text-gray-400 hover:text-white transition-colors"
							>Privacy Policy</a
						>
						<a href="/terms" class="text-gray-400 hover:text-white transition-colors"
							>Terms & Conditions</a
						>
						<a href="/imprint" class="text-gray-400 hover:text-white transition-colors">Imprint</a>
						<a href="/accessibility" class="text-gray-400 hover:text-white transition-colors"
							>Accessibility</a
						>
					</div>

					<div
						class="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
					>
						<div class="text-gray-400 text-sm">
							© {new Date().getFullYear()} BBN Music GmbH. All rights reserved.
						</div>
						<div class="flex space-x-6">
							<a
								href="https://facebook.com"
								target="_blank"
								rel="noopener noreferrer"
								class="text-gray-400 hover:text-white transition-colors"
								aria-label="Facebook"
							>
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
									<path
										d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
									/>
								</svg>
							</a>
							<a
								href="https://twitter.com"
								target="_blank"
								rel="noopener noreferrer"
								class="text-gray-400 hover:text-white transition-colors"
								aria-label="Twitter"
							>
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
									<path
										d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"
									/>
								</svg>
							</a>
							<a
								href="https://instagram.com"
								target="_blank"
								rel="noopener noreferrer"
								class="text-gray-400 hover:text-white transition-colors"
								aria-label="Instagram"
							>
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
									<path
										d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"
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
