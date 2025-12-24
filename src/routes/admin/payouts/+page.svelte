<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Modal, Spinner } from '$lib/components/ui';
	import { getPayoutsByAdmin, postSyncMappingByAdmin } from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import { toast } from '$lib/stores/toast';
	import { uploadViaWebSocket } from '$lib/utils/wsUpload';
	import type { PayoutList } from '$lib/api/types.gen';
	import { CloudArrowUpOutline } from 'flowbite-svelte-icons';
	import { formatCurrency } from '$lib/utils/formatCurrency';
	import { extractErrorMessage } from '$lib/utils/extractError';

	let payouts = $state<PayoutList[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let syncing = $state(false);
	let showUploadModal = $state(false);
	let uploading = $state(false);
	let selectedFile = $state<File | null>(null);

	onMount(async () => {
		await loadPayouts();
	});

	async function loadPayouts() {
		loading = true;
		error = null;
		try {
			const response = await getPayoutsByAdmin({ headers: getAuthHeaders() });
			if (response.data) {
				payouts = response.data as PayoutList[];
			}
		} catch (e: unknown) {
			error = extractErrorMessage(e, 'Failed to load payouts');
		} finally {
			loading = false;
		}
	}

	async function syncMapping() {
		syncing = true;
		try {
			await postSyncMappingByAdmin({ headers: getAuthHeaders() });
			await loadPayouts();
		} catch {
			toast.show('Failed to sync mapping', 'error');
		} finally {
			syncing = false;
		}
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		selectedFile = input.files?.[0] || null;
	}

	async function uploadPayout() {
		if (!selectedFile) return;

		uploading = true;
		try {
			await uploadViaWebSocket({
				path: 'api/@bbn/admin/payouts/upload',
				file: selectedFile,
			});
			toast.show('Payout uploaded successfully', 'success');
			showUploadModal = false;
			selectedFile = null;
			await loadPayouts();
		} catch (e: unknown) {
			toast.show(extractErrorMessage(e, 'Failed to upload payout'), 'error');
		} finally {
			uploading = false;
		}
	}

	</script>

<div>
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-white">Payouts</h1>
		<div class="flex gap-3">
			<Button onclick={() => (showUploadModal = true)} variant="secondary">
				<CloudArrowUpOutline class="w-4 h-4" />
				Upload Payout
			</Button>
			<Button onclick={syncMapping} disabled={syncing} variant="secondary" loading={syncing}>
				{syncing ? 'Syncing...' : 'Sync Mapping'}
			</Button>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<Spinner size="lg" color="red" />
		</div>
	{:else if error}
		<div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">{error}</div>
	{:else if payouts.length === 0}
		<div class="text-center py-12 text-gray-500">No payouts found</div>
	{:else}
		<div class="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
			<table class="w-full">
				<thead class="bg-gray-900/50 border-b border-gray-700">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Period</th>
						<th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Total</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-700">
					{#each payouts as payout}
						<tr class="hover:bg-gray-700/50">
							<td class="px-4 py-3 text-white">{payout.period}</td>
							<td class="px-4 py-3 text-right text-green-400 font-medium"
								>{formatCurrency(payout.sum)}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Upload Modal -->
<Modal bind:open={showUploadModal} title="Upload Payout" size="md">
	<div class="space-y-4">
		<p class="text-gray-400 text-sm">
			Select a payout file to upload. Supported formats: CSV, Excel.
		</p>

		<div class="relative">
			<input
				type="file"
				accept=".csv,.xlsx,.xls"
				onchange={handleFileSelect}
				class="block w-full text-sm text-gray-400
					file:mr-4 file:py-2 file:px-4
					file:rounded-lg file:border-0
					file:text-sm file:font-medium
					file:bg-orange-500/20 file:text-orange-400
					hover:file:bg-orange-500/30
					cursor-pointer"
			/>
		</div>

		{#if selectedFile}
			<div class="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
				<CloudArrowUpOutline class="w-5 h-5 text-orange-400" />
				<span class="text-white text-sm truncate">{selectedFile.name}</span>
				<span class="text-gray-500 text-xs ml-auto">
					{(selectedFile.size / 1024).toFixed(1)} KB
				</span>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (showUploadModal = false)}>Cancel</Button>
		<Button onclick={uploadPayout} disabled={!selectedFile || uploading} loading={uploading}>
			{uploading ? 'Uploading...' : 'Upload'}
		</Button>
	{/snippet}
</Modal>
