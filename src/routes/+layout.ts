import type { LayoutLoad } from './$types';

// Public routes that don't require authentication
const publicRoutes = ['/signin', '/register', '/privacy', '/terms', '/imprint', '/s'];

export const load: LayoutLoad = async ({ url }) => {
	const pathname = url.pathname;

	// Check if route is public (root path or starts with public route prefix)
	const isPublicRoute =
		pathname === '/' || publicRoutes.some((route) => pathname.startsWith(route));

	// Return route info - auth redirects are handled client-side in +layout.svelte
	// to avoid hydration timing issues
	return {
		pathname,
		isPublicRoute,
	};
};
