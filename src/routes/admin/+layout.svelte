<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const { children } = $props();

	onMount(() => {
		// Redirect non-admin users
		if (!$auth.isAuthenticated || !$auth.user?.isAdmin) {
			goto('/music/drops');
		}
	});
</script>

{#if $auth.user?.isAdmin}
	{@render children()}
{:else}
	<div class="flex items-center justify-center min-h-[50vh]">
		<div class="text-center">
			<p class="text-red-400 text-lg font-semibold">Access Denied</p>
			<p class="text-gray-400 mt-2">You don't have permission to access the admin area.</p>
		</div>
	</div>
{/if}
