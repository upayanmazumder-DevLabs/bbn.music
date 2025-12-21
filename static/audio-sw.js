// Service worker for injecting auth headers into audio stream requests
const tokens = {};

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
	if (event.data.type === 'SET_TOKEN') {
		tokens[event.data.pattern] = event.data.token;
	} else if (event.data.type === 'CLEAR_TOKEN') {
		delete tokens[event.data.pattern];
	} else if (event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

self.addEventListener('fetch', (event) => {
	const url = event.request.url;

	// Only intercept music download requests
	if (url.includes('/api/@bbn/music/songs/') && url.endsWith('/download')) {
		for (const pattern of Object.keys(tokens)) {
			if (url.includes(pattern)) {
				const token = tokens[pattern];
				if (token) {
					const modifiedRequest = new Request(event.request, {
						headers: new Headers({
							...Object.fromEntries(event.request.headers.entries()),
							Authorization: `JWT ${token}`,
						}),
						mode: 'cors',
						credentials: 'same-origin',
					});
					event.respondWith(fetch(modifiedRequest));
					return;
				}
			}
		}
	}
});
