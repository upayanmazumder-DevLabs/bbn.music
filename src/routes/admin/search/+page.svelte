<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		getQueryBySearchByAdmin,
		getIdByWalletsByAdmin,
		patchIdByWalletsByAdmin,
	} from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/stores/auth';
	import type { SearchReturn, AdminWallet, AccountType } from '$lib/api/types.gen';
	import {
		SearchOutline,
		UserOutline,
		MusicOutline,
		WalletOutline,
		ArrowRightOutline,
	} from 'flowbite-svelte-icons';

	let searchQuery = $state('');
	let loading = $state(false);
	let results = $state<SearchReturn[]>([]);

	// Selected item state - can be user, drop, song, or wallet
	let selectedItem = $state<SearchReturn | null>(null);
	let selectedType = $state<string>('');
	let wallet = $state<AdminWallet | null>(null);
	let loadingDetails = $state(false);

	async function search() {
		if (!searchQuery.trim()) return;

		loading = true;
		selectedItem = null;
		selectedType = '';
		wallet = null;

		try {
			const response = await getQueryBySearchByAdmin({
				path: { query: searchQuery },
				headers: getAuthHeaders(),
			});

			if (response.data) {
				results = response.data as SearchReturn[];
			}
		} catch (e) {
			console.error('Search failed:', e);
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			search();
		}
	}

	async function selectItem(result: SearchReturn) {
		// Drops navigate directly instead of showing details
		if (result._index === 'drops') {
			goto(`/drops/${result._source._id}`);
			return;
		}

		selectedItem = result;
		selectedType = result._index;
		wallet = null;
		loadingDetails = true;

		try {
			if (result._index === 'users') {
				// Load wallet for user
				const walletResponse = await getIdByWalletsByAdmin({
					path: { id: result._source._id },
					headers: getAuthHeaders(),
				});
				if (walletResponse.data) {
					wallet = walletResponse.data as AdminWallet;
				}
			} else if (result._index === 'wallets') {
				// The wallet data is already in the result
				wallet = result._source as unknown as AdminWallet;
			}
		} catch (e) {
			wallet = null;
		} finally {
			loadingDetails = false;
		}
	}

	function navigateToDropById(dropId: string) {
		goto(`/drops/${dropId}`);
	}

	async function updateWallet(field: string, value: any) {
		if (!wallet) return;

		try {
			await patchIdByWalletsByAdmin({
				path: { id: wallet._id },
				body: { [field]: value },
				headers: getAuthHeaders(),
			});

			// Refresh wallet data
			const response = await getIdByWalletsByAdmin({
				path: { id: wallet._id },
				headers: getAuthHeaders(),
			});
			if (response.data) {
				wallet = response.data as AdminWallet;
			}
		} catch (e) {
			console.error('Failed to update wallet:', e);
		}
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: 'EUR',
		}).format(amount / 100);
	}

	function getIndexIcon(index: string) {
		switch (index) {
			case 'users':
				return UserOutline;
			case 'drops':
			case 'songs':
				return MusicOutline;
			case 'wallets':
				return WalletOutline;
			default:
				return SearchOutline;
		}
	}

	function getIndexColor(index: string) {
		switch (index) {
			case 'users':
				return 'text-purple-400';
			case 'drops':
				return 'text-orange-400';
			case 'songs':
				return 'text-blue-400';
			case 'wallets':
				return 'text-green-400';
			default:
				return 'text-gray-400';
		}
	}

	function getIndexBgColor(index: string) {
		switch (index) {
			case 'users':
				return 'bg-purple-500/20';
			case 'drops':
				return 'bg-orange-500/20';
			case 'songs':
				return 'bg-blue-500/20';
			case 'wallets':
				return 'bg-green-500/20';
			default:
				return 'bg-gray-500/20';
		}
	}
</script>

<div>
	<h1 class="text-2xl font-bold text-white mb-6">Search</h1>

	<!-- Search Input -->
	<div class="flex gap-4 mb-6">
		<div class="flex-1 relative">
			<SearchOutline class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
			<input
				type="text"
				bind:value={searchQuery}
				onkeydown={handleKeydown}
				placeholder="Search users, drops, songs, wallets..."
				class="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
			/>
		</div>
		<button
			onclick={search}
			disabled={loading || !searchQuery.trim()}
			class="px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
		>
			{loading ? 'Searching...' : 'Search'}
		</button>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Search Results -->
		<div class="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
			<h2 class="text-lg font-semibold text-white mb-4">Results ({results.length})</h2>

			{#if results.length === 0}
				<p class="text-gray-500 text-center py-8">
					{searchQuery ? 'No results found' : 'Enter a search term to begin'}
				</p>
			{:else}
				<div class="space-y-2 max-h-[600px] overflow-y-auto">
					{#each results as result}
						{@const Icon = getIndexIcon(result._index)}
						{@const isSelected =
							selectedItem?._source._id === result._source._id && selectedType === result._index}
						<button
							onclick={() => selectItem(result)}
							class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left cursor-pointer hover:bg-gray-700 {isSelected
								? 'bg-gray-700 ring-1 ring-red-500'
								: 'bg-gray-700/50'}"
						>
							<div class="p-2 rounded-lg {getIndexBgColor(result._index)}">
								<Icon class="w-5 h-5 {getIndexColor(result._index)}" />
							</div>
							<div class="flex-1 min-w-0">
								{#if result._index === 'users'}
									<p class="text-white font-medium truncate">{result._source.profile?.username}</p>
									<p class="text-gray-400 text-sm truncate">{result._source.profile?.email}</p>
								{:else if result._index === 'drops'}
									<p class="text-white font-medium truncate">{result._source.title}</p>
									<p class="text-gray-400 text-sm truncate">
										{result._source.type} • {result._source.artists
											?.map((a: any) => a.name)
											.join(', ') || 'Unknown Artist'}
									</p>
								{:else if result._index === 'songs'}
									<p class="text-white font-medium truncate">{result._source.title}</p>
									<p class="text-gray-400 text-sm truncate">
										ISRC: {result._source.isrc || 'None'} • {result._source.artists
											?.map((a: any) => a.name)
											.join(', ') || 'Unknown Artist'}
									</p>
								{:else if result._index === 'wallets'}
									<p class="text-white font-medium truncate">
										{result._source.userName || result._source.email || 'Unknown'}
									</p>
									<p class="text-gray-400 text-sm truncate">
										Balance: {formatCurrency(
											(result._source.balance?.unrestrained || 0) +
												(result._source.balance?.restrained || 0),
										)}
									</p>
								{/if}
							</div>
							<span
								class="text-xs px-2 py-1 rounded {getIndexBgColor(result._index)} {getIndexColor(
									result._index,
								)} uppercase font-medium"
							>
								{result._index}
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Details Panel -->
		<div class="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
			<h2 class="text-lg font-semibold text-white mb-4">
				{#if selectedType === 'users'}User Details
				{:else if selectedType === 'songs'}Song Details
				{:else if selectedType === 'wallets'}Wallet Details
				{:else}Details{/if}
			</h2>

			{#if loadingDetails}
				<div class="flex items-center justify-center py-8">
					<div
						class="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"
					></div>
				</div>
			{:else if !selectedItem}
				<p class="text-gray-500 text-center py-8">Select an item to view details</p>
			{:else if selectedType === 'users'}
				<!-- User Details -->
				<div class="space-y-4">
					<div class="p-4 bg-gray-700/50 rounded-lg">
						<h3 class="text-sm font-medium text-gray-400 mb-2">Profile</h3>
						<p class="text-white font-medium">{selectedItem._source.profile?.username}</p>
						<p class="text-gray-400 text-sm">{selectedItem._source.profile?.email}</p>
						<p class="text-gray-500 text-xs mt-1">ID: {selectedItem._source._id}</p>
					</div>

					{#if selectedItem._source.groups?.length > 0}
						<div class="p-4 bg-gray-700/50 rounded-lg">
							<h3 class="text-sm font-medium text-gray-400 mb-2">Groups</h3>
							<div class="flex flex-wrap gap-2">
								{#each selectedItem._source.groups as group}
									<span class="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded"
										>{group}</span
									>
								{/each}
							</div>
						</div>
					{/if}

					{#if wallet}
						<div class="p-4 bg-gray-700/50 rounded-lg space-y-3">
							<h3 class="text-sm font-medium text-gray-400 mb-2">Wallet</h3>

							<div class="grid grid-cols-2 gap-4">
								<div>
									<p class="text-xs text-gray-500">Unrestrained</p>
									<p class="text-white font-medium">
										{formatCurrency(wallet.balance?.unrestrained || 0)}
									</p>
								</div>
								<div>
									<p class="text-xs text-gray-500">Restrained</p>
									<p class="text-white font-medium">
										{formatCurrency(wallet.balance?.restrained || 0)}
									</p>
								</div>
							</div>

							<div>
								<label for="user-account-type" class="text-xs text-gray-500 block mb-1"
									>Account Type</label
								>
								<select
									id="user-account-type"
									value={wallet.accountType}
									onchange={(e) => updateWallet('accountType', e.currentTarget.value)}
									class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
								>
									<option value="DEFAULT">Default</option>
									<option value="SUBSCRIBED">Subscribed</option>
									<option value="VIP">VIP</option>
								</select>
							</div>

							<div>
								<label for="user-cut" class="text-xs text-gray-500 block mb-1">Cut (%)</label>
								<input
									id="user-cut"
									type="number"
									value={wallet.cut}
									onchange={(e) => updateWallet('cut', e.currentTarget.value)}
									class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
								/>
							</div>

							<div class="flex items-center justify-between">
								<span class="text-xs text-gray-500">Copyright Editable</span>
								<button
									aria-label="Toggle copyright editable"
									onclick={() => updateWallet('copyrightEditable', !wallet?.copyrightEditable)}
									class="w-10 h-5 rounded-full transition-colors {wallet.copyrightEditable
										? 'bg-green-500'
										: 'bg-gray-600'}"
								>
									<div
										class="w-4 h-4 bg-white rounded-full transition-transform {wallet.copyrightEditable
											? 'translate-x-5'
											: 'translate-x-0.5'}"
									></div>
								</button>
							</div>
						</div>
					{:else}
						<p class="text-gray-500 text-center py-4">No wallet found for this user</p>
					{/if}
				</div>
			{:else if selectedType === 'songs'}
				<!-- Song Details -->
				<div class="space-y-4">
					<div class="p-4 bg-gray-700/50 rounded-lg">
						<h3 class="text-sm font-medium text-gray-400 mb-2">Song Info</h3>
						<p class="text-white font-medium text-lg">{selectedItem._source.title}</p>
						<p class="text-gray-400 text-sm mt-1">
							{selectedItem._source.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}
						</p>
						<p class="text-gray-500 text-xs mt-2">ID: {selectedItem._source._id}</p>
					</div>

					{#if selectedItem._source.isrc}
						<div class="p-4 bg-gray-700/50 rounded-lg">
							<h3 class="text-sm font-medium text-gray-400 mb-2">ISRC</h3>
							<p class="text-white font-mono">{selectedItem._source.isrc}</p>
						</div>
					{/if}

					{#if selectedItem._source.duration}
						<div class="p-4 bg-gray-700/50 rounded-lg">
							<h3 class="text-sm font-medium text-gray-400 mb-2">Duration</h3>
							<p class="text-white">
								{Math.floor(selectedItem._source.duration / 60)}:{String(
									selectedItem._source.duration % 60,
								).padStart(2, '0')}
							</p>
						</div>
					{/if}

					{#if selectedItem._source.dropId}
						<button
							onclick={() => navigateToDropById(selectedItem?._source.dropId)}
							class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
						>
							<span>View Parent Drop</span>
							<ArrowRightOutline class="w-4 h-4" />
						</button>
					{/if}
				</div>
			{:else if selectedType === 'wallets'}
				<!-- Wallet Details -->
				<div class="space-y-4">
					<div class="p-4 bg-gray-700/50 rounded-lg">
						<h3 class="text-sm font-medium text-gray-400 mb-2">Owner</h3>
						<p class="text-white font-medium">{selectedItem._source.userName || 'Unknown'}</p>
						<p class="text-gray-400 text-sm">{selectedItem._source.email || 'No email'}</p>
						<p class="text-gray-500 text-xs mt-1">Wallet ID: {selectedItem._source._id}</p>
						{#if selectedItem._source.user}
							<p class="text-gray-500 text-xs">User ID: {selectedItem._source.user}</p>
						{/if}
					</div>

					<div class="p-4 bg-gray-700/50 rounded-lg">
						<h3 class="text-sm font-medium text-gray-400 mb-2">Balance</h3>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<p class="text-xs text-gray-500">Unrestrained</p>
								<p class="text-white font-medium text-lg">
									{formatCurrency(selectedItem._source.balance?.unrestrained || 0)}
								</p>
							</div>
							<div>
								<p class="text-xs text-gray-500">Restrained</p>
								<p class="text-white font-medium text-lg">
									{formatCurrency(selectedItem._source.balance?.restrained || 0)}
								</p>
							</div>
						</div>
						<div class="mt-3 pt-3 border-t border-gray-600">
							<p class="text-xs text-gray-500">Total</p>
							<p class="text-green-400 font-bold text-xl">
								{formatCurrency(
									(selectedItem._source.balance?.unrestrained || 0) +
										(selectedItem._source.balance?.restrained || 0),
								)}
							</p>
						</div>
					</div>

					{#if wallet}
						<div class="p-4 bg-gray-700/50 rounded-lg space-y-3">
							<h3 class="text-sm font-medium text-gray-400 mb-2">Settings</h3>

							<div>
								<label for="wallet-account-type" class="text-xs text-gray-500 block mb-1"
									>Account Type</label
								>
								<select
									id="wallet-account-type"
									value={wallet.accountType}
									onchange={(e) => updateWallet('accountType', e.currentTarget.value)}
									class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
								>
									<option value="DEFAULT">Default</option>
									<option value="SUBSCRIBED">Subscribed</option>
									<option value="VIP">VIP</option>
								</select>
							</div>

							<div>
								<label for="wallet-cut" class="text-xs text-gray-500 block mb-1">Cut (%)</label>
								<input
									id="wallet-cut"
									type="number"
									value={wallet.cut}
									onchange={(e) => updateWallet('cut', e.currentTarget.value)}
									class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
								/>
							</div>

							<div class="flex items-center justify-between">
								<span class="text-xs text-gray-500">Copyright Editable</span>
								<button
									aria-label="Toggle copyright editable"
									onclick={() => updateWallet('copyrightEditable', !wallet?.copyrightEditable)}
									class="w-10 h-5 rounded-full transition-colors {wallet.copyrightEditable
										? 'bg-green-500'
										: 'bg-gray-600'}"
								>
									<div
										class="w-4 h-4 bg-white rounded-full transition-transform {wallet.copyrightEditable
											? 'translate-x-5'
											: 'translate-x-0.5'}"
									></div>
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
