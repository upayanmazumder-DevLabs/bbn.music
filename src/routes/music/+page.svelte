<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/music/drops', { replaceState: true });
	});
</script>

<div class="min-h-screen flex items-center justify-center">
	<div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
</div>
