<script lang="ts">
	import { Spinner } from '$lib/components/ui';
	import { PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
	import { getBaseUrl } from '$lib/apiClient';

	interface Props {
		songId: string;
		size?: 'sm' | 'md';
	}

	const { songId, size = 'md' }: Props = $props();

	let isLoading = $state(false);
	let isPlaying = $state(false);
	let hasUserInitiated = $state(false);
	let audioElement = $state<HTMLAudioElement | null>(null);
	let error = $state<string | null>(null);

	// Build streaming URL (auth header injected by service worker)
	function getStreamUrl(): string | null {
		if (typeof window === 'undefined') return null;
		const token = localStorage.getItem('access-token');
		if (!token) return null;
		const baseUrl = getBaseUrl();
		return `${baseUrl}api/@bbn/music/songs/${songId}/download`;
	}

	const streamUrl = $derived(getStreamUrl());

	async function togglePlay() {
		if (!audioElement || !streamUrl) return;

		// Stop any other playing audio globally
		const global = globalThis as { __audioPlayer?: HTMLAudioElement };
		if (global.__audioPlayer && global.__audioPlayer !== audioElement) {
			global.__audioPlayer.pause();
		}

		if (isPlaying) {
			audioElement.pause();
		} else {
			global.__audioPlayer = audioElement;
			hasUserInitiated = true;
			isLoading = true;
			try {
				await audioElement.play();
			} catch (e) {
				error = e instanceof Error ? e.message : 'Failed to play';
				isLoading = false;
			}
		}
	}

	function handleLoadStart() {
		// Only show loading after user has clicked play
		if (hasUserInitiated) {
			isLoading = true;
		}
		error = null;
	}

	function handleCanPlay() {
		isLoading = false;
	}

	function handlePlay() {
		isPlaying = true;
		isLoading = false;
	}

	function handlePause() {
		isPlaying = false;
	}

	function handleEnded() {
		isPlaying = false;
	}

	function handleError() {
		isLoading = false;
		error = 'Failed to load audio';
	}

	const iconSize = $derived(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4');
	const buttonSize = $derived(size === 'sm' ? 'w-6 h-6' : 'w-8 h-8');
</script>

{#if streamUrl}
	<audio
		bind:this={audioElement}
		src={streamUrl}
		preload="none"
		onloadstart={handleLoadStart}
		oncanplay={handleCanPlay}
		onplay={handlePlay}
		onpause={handlePause}
		onended={handleEnded}
		onerror={handleError}
	></audio>
{/if}

<button
	onclick={togglePlay}
	disabled={!streamUrl}
	class="{buttonSize} rounded-full flex items-center justify-center transition-colors
		{isPlaying
		? 'bg-orange-500 text-white hover:bg-orange-600'
		: 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white'}
		{isLoading ? 'opacity-50' : ''}
		{!streamUrl ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
		{error ? 'bg-red-500/20 text-red-400' : ''}"
	title={error || (isPlaying ? 'Pause' : 'Play')}
>
	{#if isLoading}
		<Spinner size="sm" />
	{:else if isPlaying}
		<PauseSolid class={iconSize} />
	{:else}
		<PlaySolid class={iconSize} />
	{/if}
</button>
