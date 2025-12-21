<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { page } from '$app/stores';
	import bbnMusicLogo from '$lib/assets/bbnMusic.svg';
	import bbnWalletLogo from '$lib/assets/bbnWallet.svg';
	import bbnAdminLogo from '$lib/assets/bbnAdmin.svg';
	import { ChevronRightOutline, GridPlusOutline } from 'flowbite-svelte-icons';

	let showMenu = $state(false);

	// App definitions with their routes and colors
	export const apps = [
		{
			id: 'music',
			logo: bbnMusicLogo,
			label: 'bbn.music',
			route: '/music/drops',
			pathPrefix: '/music', // music dashboard routes
			color: 'orange',
			requiresAuth: false,
			requiresAdmin: false,
		},
		{
			id: 'wallet',
			logo: bbnWalletLogo,
			label: 'BBN Wallet',
			route: '/wallet',
			pathPrefix: '/wallet',
			color: 'green',
			requiresAuth: true,
			requiresAdmin: false,
		},
		{
			id: 'admin',
			logo: bbnAdminLogo,
			label: 'BBN Admin',
			route: '/admin',
			pathPrefix: '/admin',
			color: 'red',
			requiresAuth: true,
			requiresAdmin: true,
		},
	];

	// Detect current app based on URL path
	const currentApp = $derived.by(() => {
		const path = $page.url.pathname;
		if (path.startsWith('/admin')) return apps.find((a) => a.id === 'admin')!;
		if (path.startsWith('/wallet')) return apps.find((a) => a.id === 'wallet')!;
		if (path.startsWith('/music')) return apps.find((a) => a.id === 'music')!;
		return apps.find((a) => a.id === 'music')!; // default fallback
	});

	// Filter apps based on auth state and permissions
	const visibleApps = $derived(
		apps.filter((app) => {
			if (app.requiresAuth && !$auth.isAuthenticated) return false;
			if (app.requiresAdmin && !$auth.user?.isAdmin) return false;
			return true;
		}),
	);

	// Get the appropriate route for an app based on auth state
	function getAppRoute(app: (typeof apps)[0]): string {
		// For bbn.music, redirect to landing page if not authenticated
		if (app.id === 'music' && !$auth.isAuthenticated) {
			return '/';
		}
		return app.route;
	}

	function toggleMenu() {
		showMenu = !showMenu;
	}

	function closeMenu() {
		showMenu = false;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (showMenu && !target.closest('[data-app-switcher]')) {
			showMenu = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative" data-app-switcher>
	<button
		onclick={toggleMenu}
		class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
		aria-expanded={showMenu}
		aria-haspopup="menu"
		aria-label="App switcher"
	>
		<GridPlusOutline class="w-5 h-5 text-gray-600 dark:text-white/80" />
		<img
			src={currentApp.logo}
			alt={currentApp.label}
			class="h-5 w-auto hidden sm:block brightness-0 dark:brightness-100"
		/>
	</button>

	{#if showMenu}
		<div
			class="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50"
			role="menu"
		>
			<div class="px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
				Switch to
			</div>

			{#each visibleApps as app}
				<a
					href={getAppRoute(app)}
					onclick={closeMenu}
					role="menuitem"
					class="flex items-center justify-between px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors group"
				>
					<div class="flex items-center gap-3">
						<img src={app.logo} alt={app.label} class="h-5 w-auto opacity-90 brightness-0 dark:brightness-100" />
					</div>
					<ChevronRightOutline
						class="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
					/>
				</a>
			{/each}
		</div>
	{/if}
</div>
