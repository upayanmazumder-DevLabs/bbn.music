<script lang="ts">
	import { onMount } from 'svelte';
	import { getApplicationsByOauth, deleteIdByApplicationsByOauth } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import type { OAuthApp } from '$lib/api/types.gen';
	import { Modal, Button, Spinner } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast';

	let apps = $state<OAuthApp[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showDeleteModal = $state(false);
	let appToDelete = $state<string | null>(null);

	onMount(async () => {
		await loadApps();
	});

	async function loadApps() {
		loading = true;
		error = null;
		try {
			const response = await getApplicationsByOauth({
				headers: getAuthHeaders(),
			});
			if (response.data) {
				apps = response.data as OAuthApp[];
			}
		} catch (e: any) {
			error = e?.error?.message || e?.message || 'Failed to load OAuth apps';
		} finally {
			loading = false;
		}
	}

	function requestDelete(appId: string) {
		appToDelete = appId;
		showDeleteModal = true;
	}

	async function confirmDelete() {
		if (!appToDelete) return;

		showDeleteModal = false;

		try {
			await deleteIdByApplicationsByOauth({
				path: { id: appToDelete },
				headers: getAuthHeaders(),
			});
			await loadApps();
			toast.show('OAuth application deleted successfully', 'success');
		} catch (e: any) {
			toast.show(e?.error?.message || e?.message || 'Failed to delete OAuth application', 'error');
		} finally {
			appToDelete = null;
		}
	}
</script>

<div>
	<h1 class="text-2xl font-bold text-white mb-6">OAuth Applications</h1>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<Spinner size="lg" color="red" />
		</div>
	{:else if error}
		<div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">{error}</div>
	{:else if apps.length === 0}
		<div class="text-center py-12 text-gray-500">No OAuth applications found</div>
	{:else}
		<div class="grid gap-4">
			{#each apps as app}
				<div class="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
					<div class="flex items-start justify-between">
						<div>
							<h3 class="text-lg font-semibold text-white">{app.name}</h3>
							<p class="text-gray-500 text-xs mt-1 font-mono">ID: {app._id}</p>
							<p class="text-gray-500 text-xs font-mono">Secret: {app.secret.substring(0, 8)}...</p>
							{#if app.redirect.length > 0}
								<div class="mt-2">
									<p class="text-xs text-gray-400">Redirects:</p>
									{#each app.redirect as uri}
										<p class="text-xs text-gray-500 font-mono">{uri}</p>
									{/each}
								</div>
							{/if}
						</div>
						<button onclick={() => requestDelete(app._id)} class="text-red-400 hover:text-red-300"
							>Delete</button
						>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Delete Confirmation Modal -->
<Modal bind:open={showDeleteModal} title="Delete OAuth Application" size="md">
	<p class="text-white">
		Are you sure you want to delete this OAuth application? This action cannot be undone.
	</p>

	{#snippet footer()}
		<Button
			variant="secondary"
			onclick={() => {
				showDeleteModal = false;
				appToDelete = null;
			}}
		>
			Cancel
		</Button>
		<Button variant="danger" onclick={confirmDelete}>Delete</Button>
	{/snippet}
</Modal>
