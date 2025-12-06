<script lang="ts">
import {
	Card,
	Button,
	Badge,
	Alert,
	Toggle,
	Select,
	Modal,
	Checkbox,
} from '$lib/components/ui';
import {
	DownloadSolid,
	UploadSolid,
	DatabaseSolid,
	ShieldCheckSolid,
	InfoCircleSolid,
	CheckCircleSolid,
	ExclamationCircleSolid,
	FileExportSolid,
	FileImportSolid,
	ClockSolid,
	FileSolid,
} from 'flowbite-svelte-icons';
import { toast } from '$lib/stores/toast';

interface ExportOption {
	id: string;
	label: string;
	description: string;
	size?: string;
	enabled: boolean;
}

interface ExportHistory {
	id: string;
	date: Date;
	type: string;
	size: string;
	status: 'completed' | 'failed' | 'pending';
	downloadUrl?: string;
}

// Export options
let exportOptions = $state<ExportOption[]>([
	{
		id: 'playlists',
		label: 'Playlists',
		description: 'All your created and saved playlists',
		size: '2.3 MB',
		enabled: true,
	},
	{
		id: 'likes',
		label: 'Liked Songs',
		description: 'Your liked songs and albums',
		size: '1.1 MB',
		enabled: true,
	},
	{
		id: 'listening_history',
		label: 'Listening History',
		description: 'Your complete listening history',
		size: '8.7 MB',
		enabled: true,
	},
	{
		id: 'profile',
		label: 'Profile Information',
		description: 'Your profile data and preferences',
		size: '0.2 MB',
		enabled: true,
	},
	{
		id: 'follows',
		label: 'Following & Followers',
		description: 'Artists and users you follow',
		size: '0.5 MB',
		enabled: true,
	},
	{
		id: 'settings',
		label: 'App Settings',
		description: 'Your app preferences and settings',
		size: '0.1 MB',
		enabled: true,
	},
]);

// Export history
let exportHistory = $state<ExportHistory[]>([
	{
		id: '1',
		date: new Date('2024-11-01'),
		type: 'Full Export',
		size: '12.9 MB',
		status: 'completed',
		downloadUrl: '/exports/1',
	},
	{
		id: '2',
		date: new Date('2024-10-15'),
		type: 'Playlists Only',
		size: '2.3 MB',
		status: 'completed',
		downloadUrl: '/exports/2',
	},
	{
		id: '3',
		date: new Date('2024-09-20'),
		type: 'Full Export',
		size: '11.5 MB',
		status: 'completed',
		downloadUrl: '/exports/3',
	},
]);

// State
let exportFormat = $state<'json' | 'csv' | 'xml'>('json');
let includeMedia = $state(false);
let encryptExport = $state(false);
let autoExport = $state(false);
let autoExportFrequency = $state<'weekly' | 'monthly'>('monthly');
let isExporting = $state(false);
let exportProgress = $state(0);
let showImportModal = $state(false);
let selectedFile = $state<File | null>(null);
let importProgress = $state(0);
let isImporting = $state(false);

const totalSelectedSize = $derived.by(() => {
	let totalBytes = 0;
	exportOptions.forEach((option) => {
		if (option.enabled && option.size) {
			const size = parseFloat(option.size.replace(' MB', ''));
			totalBytes += size;
		}
	});
	return totalBytes.toFixed(1);
});

function toggleAll(checked: boolean) {
	exportOptions.forEach((option) => {
		option.enabled = checked;
	});
}

async function startExport() {
	isExporting = true;
	exportProgress = 0;

	// Simulate export progress
	const interval = setInterval(() => {
		exportProgress += 10;
		if (exportProgress >= 100) {
			clearInterval(interval);
			completeExport();
		}
	}, 300);
}

function completeExport() {
	isExporting = false;
	exportProgress = 0;

	// Add to history
	exportHistory = [
		{
			id: String(exportHistory.length + 1),
			date: new Date(),
			type: 'Custom Export',
			size: `${totalSelectedSize} MB`,
			status: 'completed',
			downloadUrl: '/exports/new',
		},
		...exportHistory,
	];

	// Trigger download
	downloadExport('/exports/new');
}

function downloadExport(url: string) {
	// Simulate file download
	const link = document.createElement('a');
	link.href = url;
	link.download = `bbn-music-export-${Date.now()}.${exportFormat}`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

function handleFileSelect(event: Event) {
	const input = event.target as HTMLInputElement;
	if (input.files && input.files[0]) {
		selectedFile = input.files[0];
		showImportModal = true;
	}
}

async function startImport() {
	if (!selectedFile) return;

	isImporting = true;
	importProgress = 0;

	// Simulate import progress
	const interval = setInterval(() => {
		importProgress += 10;
		if (importProgress >= 100) {
			clearInterval(interval);
			completeImport();
		}
	}, 300);
}

function completeImport() {
	isImporting = false;
	importProgress = 0;
	showImportModal = false;
	selectedFile = null;
	toast.show('Data imported successfully!', 'success');
}

// State for delete confirmation modal
let showDeleteModal = $state(false);
let deleteConfirmation = $state('');

function deleteAllData() {
	showDeleteModal = true;
	deleteConfirmation = '';
}

function confirmDelete() {
	if (deleteConfirmation === 'DELETE') {
		// Simulate data deletion
		console.log('Deleting all user data...');
		toast.show('All data has been deleted.', 'success');
		showDeleteModal = false;
		deleteConfirmation = '';
	} else {
		toast.show('Please type DELETE to confirm', 'warning');
	}
}
</script>

<div class="min-h-screen">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-4xl font-bold text-white mb-2">Data Management</h1>
		<p class="text-gray-400">Export, import, and manage your bbn.music data</p>
	</div>

	<!-- Privacy Notice -->
	<Alert color="gray" class="mb-8 bg-blue-900/20 border-blue-500">
		<InfoCircleSolid slot="icon" class="w-5 h-5" />
		<span class="font-semibold">Your Privacy Matters</span>
		<p class="text-sm text-gray-300 mt-1">
			All exports are encrypted and stored securely. You have full control over your data and can delete it at any time.
		</p>
	</Alert>

	<!-- Export Section -->
	<Card class="bg-gray-800 border-gray-700 mb-8">
		<div class="flex justify-between items-start mb-6">
			<div>
				<h2 class="text-xl font-bold text-white mb-2 flex items-center gap-2">
					<FileExportSolid class="w-6 h-6 text-purple-400" />
					Export Your Data
				</h2>
				<p class="text-gray-400">Download a copy of your bbn.music data</p>
			</div>
			<Badge class="bg-purple-500/20 text-purple-400">
				{totalSelectedSize} MB selected
			</Badge>
		</div>

		<!-- Export Options -->
		<div class="space-y-3 mb-6">
			<div class="flex justify-between items-center mb-2">
				<span class="text-sm text-gray-400">Select data to export:</span>
				<button
					class="text-purple-400 hover:text-purple-300 text-sm"
					onclick={() => toggleAll(exportOptions.some(o => !o.enabled))}
				>
					{exportOptions.every(o => o.enabled) ? 'Deselect All' : 'Select All'}
				</button>
			</div>

			{#each exportOptions as option}
				<div class="flex items-start gap-3 p-3 bg-gray-900 rounded-lg hover:bg-gray-700/50 transition-colors">
					<Checkbox
						bind:checked={option.enabled}
						class="mt-0.5"
					/>
					<div class="flex-1">
						<div class="flex justify-between items-start">
							<div>
								<p class="text-white font-medium">{option.label}</p>
								<p class="text-gray-400 text-sm">{option.description}</p>
							</div>
							{#if option.size}
								<Badge class="bg-gray-700 text-gray-300">{option.size}</Badge>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Export Settings -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
			<div>
				<label for="export-format" class="block text-sm text-gray-400 mb-2">Export Format</label>
				<Select id="export-format" bind:value={exportFormat} class="bg-gray-900 border-gray-700 text-white">
					<option value="json">JSON (.json)</option>
					<option value="csv">CSV (.csv)</option>
					<option value="xml">XML (.xml)</option>
				</Select>
			</div>
			<div class="flex items-center gap-3 mt-6">
				<Toggle bind:checked={includeMedia} />
				<div>
					<p class="text-white text-sm">Include Media Files</p>
					<p class="text-gray-500 text-xs">May significantly increase file size</p>
				</div>
			</div>
			<div class="flex items-center gap-3 mt-6">
				<Toggle bind:checked={encryptExport} />
				<div>
					<p class="text-white text-sm">Encrypt Export</p>
					<p class="text-gray-500 text-xs">Password protect your data</p>
				</div>
			</div>
		</div>

		<!-- Export Progress -->
		{#if isExporting}
			<div class="mb-6">
				<div class="flex justify-between mb-2">
					<span class="text-sm text-gray-400">Exporting your data...</span>
					<span class="text-sm text-gray-400">{exportProgress}%</span>
				</div>
				<div class="w-full bg-gray-700 rounded-full h-2">
					<div class="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all"
						style="width: {exportProgress}%"></div>
				</div>
			</div>
		{/if}

		<!-- Export Button -->
		<div class="flex justify-between items-center">
			<div class="flex items-center gap-3">
				<Toggle bind:checked={autoExport} />
				<div>
					<p class="text-white text-sm">Auto-export</p>
					<Select
						bind:value={autoExportFrequency}
						disabled={!autoExport}
						class="bg-gray-900 border-gray-700 text-white text-xs mt-1"
						size="sm"
					>
						<option value="weekly">Weekly</option>
						<option value="monthly">Monthly</option>
					</Select>
				</div>
			</div>
			<Button
				gradient
				color="purple"
				disabled={isExporting || exportOptions.every(o => !o.enabled)}
				onclick={startExport}
			>
				<DownloadSolid class="w-4 h-4 mr-2" />
				{isExporting ? 'Exporting...' : 'Export Data'}
			</Button>
		</div>
	</Card>

	<!-- Import Section -->
	<Card class="bg-gray-800 border-gray-700 mb-8">
		<div class="mb-6">
			<h2 class="text-xl font-bold text-white mb-2 flex items-center gap-2">
				<FileImportSolid class="w-6 h-6 text-blue-400" />
				Import Data
			</h2>
			<p class="text-gray-400">Restore your data from a previous export</p>
		</div>

		<Alert color="gray" class="mb-6 bg-yellow-900/20 border-yellow-500">
			<ExclamationCircleSolid slot="icon" class="w-5 h-5" />
			<span class="font-semibold">Warning</span>
			<p class="text-sm text-gray-300 mt-1">
				Importing data will merge with your existing data. Duplicate items will be skipped.
			</p>
		</Alert>

		<div class="text-center p-8 bg-gray-900 rounded-lg border-2 border-dashed border-gray-700 hover:border-purple-500 transition-colors">
			<UploadSolid class="w-12 h-12 text-gray-500 mx-auto mb-4" />
			<p class="text-white mb-2">Drop your export file here or</p>
			<label for="import-file">
				<Button color="alternative" class="bg-gray-700 hover:bg-gray-600" as="span">
					Choose File
				</Button>
			</label>
			<input
				id="import-file"
				type="file"
				accept=".json,.csv,.xml"
				onchange={handleFileSelect}
				class="hidden"
			/>
			<p class="text-gray-500 text-sm mt-4">Supports JSON, CSV, and XML formats</p>
		</div>
	</Card>

	<!-- Export History -->
	<Card class="bg-gray-800 border-gray-700 mb-8">
		<div class="mb-6">
			<h2 class="text-xl font-bold text-white mb-2 flex items-center gap-2">
				<ClockSolid class="w-6 h-6 text-green-400" />
				Export History
			</h2>
			<p class="text-gray-400">Your recent data exports</p>
		</div>

		<div class="space-y-3">
			{#each exportHistory as exportItem}
				<div class="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
					<div class="flex items-center gap-4">
						<FileSolid class="w-8 h-8 text-gray-500" />
						<div>
							<p class="text-white font-medium">{exportItem.type}</p>
							<p class="text-gray-400 text-sm">
								{exportItem.date.toLocaleDateString()} · {exportItem.size}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						{#if exportItem.status === 'completed'}
							<Badge class="bg-green-500/20 text-green-400">
								<CheckCircleSolid class="w-3 h-3 mr-1" />
								Completed
							</Badge>
							{#if exportItem.downloadUrl}
								<Button
									size="sm"
									color="alternative"
									class="bg-gray-700 hover:bg-gray-600"
									onclick={() => downloadExport(exportItem.downloadUrl)}
								>
									Download
								</Button>
							{/if}
						{:else if exportItem.status === 'pending'}
							<Badge class="bg-yellow-500/20 text-yellow-400">Processing</Badge>
						{:else}
							<Badge class="bg-red-500/20 text-red-400">Failed</Badge>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</Card>

	<!-- Danger Zone -->
	<Card class="bg-gray-800 border-red-900 border-2 ">
		<div class="mb-6">
			<h2 class="text-xl font-bold text-red-400 mb-2">Danger Zone</h2>
			<p class="text-gray-400">Permanent account actions</p>
		</div>

		<div class="space-y-4">
			<div class="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
				<div>
					<p class="text-white font-medium">Delete All Data</p>
					<p class="text-gray-400 text-sm">Permanently delete all your bbn.music data</p>
				</div>
				<Button color="red" size="sm" onclick={deleteAllData}>
					Delete Everything
				</Button>
			</div>
		</div>
	</Card>
</div>

<!-- Delete Confirmation Modal -->
<Modal bind:open={showDeleteModal} title="Delete All Data" size="md">
	<div class="space-y-4">
		<Alert color="gray" class="bg-red-900/20 border-red-500">
			<ExclamationCircleSolid slot="icon" class="w-5 h-5" />
			<span class="font-semibold">Warning: This action cannot be undone!</span>
			<p class="text-sm text-gray-300 mt-1">
				This will permanently delete all your playlists, likes, listening history, and settings.
			</p>
		</Alert>

		<div>
			<label for="delete-confirm" class="block text-sm text-gray-400 mb-2">
				Type <strong class="text-white">DELETE</strong> to confirm
			</label>
			<input
				id="delete-confirm"
				type="text"
				bind:value={deleteConfirmation}
				placeholder="DELETE"
				class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
			/>
		</div>
	</div>

	{#snippet footer()}
		<Button
			color="alternative"
			onclick={() => { showDeleteModal = false; deleteConfirmation = ''; }}
		>
			Cancel
		</Button>
		<Button
			color="red"
			onclick={confirmDelete}
			disabled={deleteConfirmation !== 'DELETE'}
		>
			Delete Everything
		</Button>
	{/snippet}
</Modal>

<!-- Import Modal -->
<Modal bind:open={showImportModal} title="Import Data" size="md">
	{#if selectedFile}
		<div class="text-center">
			<DatabaseSolid class="w-16 h-16 text-blue-400 mx-auto mb-4" />
			<h3 class="text-xl font-bold text-white mb-2">Ready to Import</h3>
			<p class="text-gray-400 mb-4">
				File: {selectedFile.name}<br>
				Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
			</p>

			{#if isImporting}
				<div class="mb-4">
					<div class="flex justify-between mb-2">
						<span class="text-sm text-gray-400">Importing...</span>
						<span class="text-sm text-gray-400">{importProgress}%</span>
					</div>
					<div class="w-full bg-gray-700 rounded-full h-2">
						<div class="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all"
							style="width: {importProgress}%"></div>
					</div>
				</div>
			{/if}

			<Alert color="gray" class="bg-yellow-900/20 border-yellow-500 text-left">
				<ExclamationCircleSolid slot="icon" class="w-5 h-5" />
				<p class="text-sm">
					This will merge the imported data with your existing data. Duplicates will be ignored.
				</p>
			</Alert>
		</div>
	{/if}

	{#snippet footer()}
		<Button
			gradient
			color="blueToGreen"
			disabled={isImporting}
			onclick={startImport}
		>
			{isImporting ? 'Importing...' : 'Start Import'}
		</Button>
		<Button
			color="alternative"
			disabled={isImporting}
			onclick={() => showImportModal = false}
		>
			Cancel
		</Button>
	{/snippet}
</Modal>

<style>
	:global(.dark) {
		--primary-600: rgb(147 51 234);
	}
</style>