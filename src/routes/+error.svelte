<script lang="ts">
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { onMount } from 'svelte';

onMount(() => {
	if ($page.status === 404) {
		goto('/', { replaceState: true });
	}
});
</script>

{#if $page.status !== 404}
	<div class="flex flex-col items-center justify-center min-h-[50vh] text-center">
		<h1 class="text-6xl font-bold text-white mb-4">{$page.status}</h1>
		<p class="text-xl text-gray-400 mb-8">{$page.error?.message || 'Something went wrong'}</p>
		<a
			href="/"
			class="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-6 py-3 rounded-lg transition-all"
		>
			Go Home
		</a>
	</div>
{/if}
