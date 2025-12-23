import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => {
			// Add crossorigin="anonymous" to stylesheet links for PostHog session replay CSS capture
			return html.replace(
				/<link\s+rel="stylesheet"(?![^>]*crossorigin)/g,
				'<link rel="stylesheet" crossorigin="anonymous"'
			);
		},
	});

	return response;
};
