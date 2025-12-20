<script lang="ts">
	import { page } from '$app/stores';
	import { getSlugByShareByMusic, getArtworkBySlugByShareByMusic } from '$lib/api/sdk.gen';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	const slug = $page.params.slug!;

	let shareData = $state<{
		services: Record<string, string>;
		title: string;
		artistNames: string[];
		artwork: string;
	} | null>(null);

	let artworkUrl = $state<string | null>(null);
	let loading = $state(true);
	let error = $state(false);

	// Map service keys to display info (matching keys from backend)
	const serviceInfo: Record<string, { name: string; icon: string }> = {
		spotify: { name: 'Spotify', icon: '/landing/spotify.svg' },
		apple: { name: 'Apple Music', icon: '/landing/apple.svg' },
		youtube: { name: 'YouTube Music', icon: '/landing/youtube.svg' },
		tidal: { name: 'Tidal', icon: '/landing/tidal.svg' },
		deezer: { name: 'Deezer', icon: '/landing/deezer.svg' },
		pandora: { name: 'Pandora', icon: '/landing/pandora.svg' },
		tiktok: { name: 'TikTok', icon: '/landing/tiktok.svg' },
		instagram: { name: 'Instagram', icon: '/landing/instagram.svg' },
		facebook: { name: 'Facebook', icon: '/landing/facebook.svg' },
	};

	onMount(async () => {
		try {
			// Fetch share data
			const response = await getSlugByShareByMusic({
				path: { slug },
			});

			if (response.error || !response.data) {
				error = true;
				// Redirect to homepage on error
				setTimeout(() => goto('/'), 2000);
				return;
			}

			shareData = response.data as any;

			// Fetch artwork as blob
			const artworkResponse = await getArtworkBySlugByShareByMusic({
				path: { slug },
			});

			if (artworkResponse.data) {
				const blob = artworkResponse.data as Blob;
				artworkUrl = URL.createObjectURL(blob);
			}

			loading = false;
		} catch (e) {
			console.error('Failed to load share page:', e);
			error = true;
			setTimeout(() => goto('/'), 2000);
		}
	});
</script>

<svelte:head>
	<title>{shareData?.title || 'Share'} - bbn.music</title>
	<meta
		name="description"
		content="Listen to {shareData?.title || 'this song'} by {shareData?.artistNames?.join(', ') ||
			'various artists'} on your favorite streaming platform"
	/>

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="music.song" />
	<meta property="og:title" content="{shareData?.title || 'Share'} - bbn.music" />
	<meta
		property="og:description"
		content="Listen to {shareData?.title || 'this song'} by {shareData?.artistNames?.join(', ') ||
			'various artists'}"
	/>
	{#if artworkUrl}
		<meta property="og:image" content={artworkUrl} />
	{/if}

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="{shareData?.title || 'Share'} - bbn.music" />
	<meta
		name="twitter:description"
		content="Listen to {shareData?.title || 'this song'} by {shareData?.artistNames?.join(', ') ||
			'various artists'}"
	/>
</svelte:head>

<!-- Blurred background artwork -->
{#if artworkUrl}
	<div
		class="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
		style="background-image: url('{artworkUrl}'); filter: blur(20px) brightness(0.25); -webkit-filter: blur(20px) brightness(0.25);"
	></div>
{:else}
	<div class="fixed inset-0 -z-10 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
{/if}

<div class="min-h-screen flex items-center justify-center p-4">
	{#if loading}
		<div class="bg-black/80 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full text-center">
			<div class="animate-pulse space-y-4">
				<div class="w-64 h-64 mx-auto bg-white/10 rounded-xl"></div>
				<div class="h-8 bg-white/10 rounded w-3/4 mx-auto"></div>
				<div class="h-6 bg-white/10 rounded w-1/2 mx-auto"></div>
			</div>
		</div>
	{:else if error}
		<div class="bg-black/80 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full text-center">
			<p class="text-red-400 text-lg mb-4">Share not found</p>
			<p class="text-gray-400 text-sm">Redirecting to homepage...</p>
		</div>
	{:else if shareData}
		<div class="bg-black/90 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full shadow-2xl">
			<!-- Artwork -->
			{#if artworkUrl}
				<div class="flex justify-center mb-6">
					<img
						src={artworkUrl}
						alt="{shareData.title} artwork"
						class="w-64 h-64 rounded-xl object-cover shadow-lg"
					/>
				</div>
			{/if}

			<!-- Title and Artists -->
			<div class="text-center mb-6">
				<h1 class="text-2xl font-bold text-white mb-2">{shareData.title}</h1>
				<p class="text-gray-300">{shareData.artistNames.join(', ')}</p>
			</div>

			<!-- Streaming Service Links -->
			<div class="space-y-2.5 mb-6">
				{#each Object.entries(shareData.services) as [service, url]}
					{@const info = serviceInfo[service.toLowerCase()] || { name: service, icon: null }}
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-3 px-5 py-3.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 group border border-white/5 hover:border-white/10"
					>
						{#if info.icon}
							<img src={info.icon} alt={info.name} class="w-7 h-7 flex-shrink-0" />
						{/if}
						<span class="text-white font-semibold text-lg flex-1">{info.name}</span>
						<svg
							class="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							/>
						</svg>
					</a>
				{/each}
			</div>

			<!-- Powered by bbn.music -->
			<div class="text-center pt-2">
				<p class="text-gray-400 text-sm">
					Powered by <a
						href="/"
						class="text-orange-400 font-semibold hover:text-orange-300 transition-colors"
						>bbn.music</a
					>
				</p>
			</div>
		</div>
	{/if}
</div>
