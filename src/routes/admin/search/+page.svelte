<script lang="ts">
	import { goto } from '$app/navigation';
	import { Badge, Button, Input, Spinner } from '$lib/components/ui';
	import {
		getQueryBySearchByAdmin,
		getIdByWalletsByAdmin,
		patchIdByWalletsByAdmin,
		getDropsByAdmin,
	} from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import type {
		SearchReturn,
		AdminWallet,
		AccountType,
		Wallet,
		ArtistRef,
		AdminDrop,
	} from '$lib/api/types.gen';
	import {
		SearchOutline,
		UserOutline,
		MusicOutline,
		ArrowRightOutline,
		PlusOutline,
	} from 'flowbite-svelte-icons';
	import { formatCurrency } from '$lib/utils/formatCurrency';
	import { toast } from '$lib/stores/toast';
	import type { PaymentType } from '$lib/api/types.gen';

	// Type helpers for narrowing SearchReturn discriminated union
	type UserSearchResult = Extract<SearchReturn, { _index: 'users' }>;
	type DropSearchResult = Extract<SearchReturn, { _index: 'drops' }>;
	type SongSearchResult = Extract<SearchReturn, { _index: 'songs' }>;

	let searchQuery = $state('');
	let loading = $state(false);
	let results = $state<SearchReturn[]>([]);

	// Selected item state - can be user, drop, or song
	let selectedItem = $state<SearchReturn | null>(null);
	let selectedType = $state<string>('');
	let wallet = $state<AdminWallet | null>(null);
	let userDrops = $state<AdminDrop[]>([]);
	let loadingDetails = $state(false);

	// Transaction form state
	let showTransactionForm = $state(false);
	let txAmount = $state(0);
	let txType = $state<PaymentType>('UNRESTRAINED');
	let txDescription = $state('');
	let txCounterParty = $state('');
	let txTimestamp = $state('');
	let txSubmitting = $state(false);

	function resetTransactionForm() {
		txAmount = 0;
		txType = 'UNRESTRAINED';
		txDescription = '';
		txCounterParty = '';
		// Set to current datetime in local timezone format for datetime-local input
		const now = new Date();
		txTimestamp = now.toISOString().slice(0, 16);
		showTransactionForm = false;
	}

	function openTransactionForm() {
		const now = new Date();
		txTimestamp = now.toISOString().slice(0, 16);
		showTransactionForm = true;
	}

	async function submitTransaction() {
		if (!wallet || txSubmitting) return;
		if (!txDescription.trim() || !txCounterParty.trim()) return;

		txSubmitting = true;

		try {
			// Convert datetime-local value to milliseconds timestamp string
			const timestampMs = String(new Date(txTimestamp).getTime());

			await patchIdByWalletsByAdmin({
				path: { id: wallet._id },
				body: {
					transactions: [
						...(wallet.transactions || []),
						{
							amount: txAmount,
							timestamp: timestampMs,
							type: txType,
							description: txDescription.trim(),
							counterParty: txCounterParty.trim(),
						},
					],
				},
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

			resetTransactionForm();
		} catch {
			toast.show('Failed to add transaction', 'error');
		} finally {
			txSubmitting = false;
		}
	}

	async function search() {
		if (!searchQuery.trim()) return;

		loading = true;
		selectedItem = null;
		selectedType = '';
		wallet = null;
		userDrops = [];

		try {
			const response = await getQueryBySearchByAdmin({
				path: { query: searchQuery },
				headers: getAuthHeaders(),
			});

			if (response.data) {
				// Filter out wallet results - wallet info is shown in user profile
				results = (response.data as SearchReturn[]).filter((r) => r._index !== 'wallets');
			}
		} catch {
			toast.show('Search failed', 'error');
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
			goto(`/admin/drops/${result._source._id}`);
			return;
		}

		selectedItem = result;
		selectedType = result._index;
		wallet = null;
		userDrops = [];
		loadingDetails = true;

		try {
			if (result._index === 'users') {
				// Load wallet and drops for user in parallel
				const [walletResponse, dropsResponse] = await Promise.all([
					getIdByWalletsByAdmin({
						path: { id: result._source._id },
						headers: getAuthHeaders(),
					}),
					getDropsByAdmin({
						query: { user: result._source._id },
						headers: getAuthHeaders(),
					}),
				]);
				if (walletResponse.data) {
					wallet = walletResponse.data as AdminWallet;
				}
				if (dropsResponse.data) {
					userDrops = dropsResponse.data as AdminDrop[];
				}
			}
		} catch {
			wallet = null;
			userDrops = [];
			toast.show('Failed to load user details', 'error');
		} finally {
			loadingDetails = false;
		}
	}

	function navigateToDropById(dropId: string) {
		goto(`/admin/drops/${dropId}`);
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
		} catch {
			toast.show('Failed to update wallet', 'error');
		}
	}

	function getIndexIcon(index: string) {
		switch (index) {
			case 'users':
				return UserOutline;
			case 'drops':
			case 'songs':
				return MusicOutline;
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
			default:
				return 'bg-gray-500/20';
		}
	}
</script>

<div>
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Search</h1>

	<!-- Search Input -->
	<div class="flex gap-4 mb-6 items-end">
		<div class="flex-1">
			<Input
				bind:value={searchQuery}
				onkeydown={handleKeydown}
				placeholder="Search users, drops, songs..."
				aria-label="Search users, drops, songs"
			>
				{#snippet icon()}<SearchOutline class="w-5 h-5" />{/snippet}
			</Input>
		</div>
		<Button onclick={search} disabled={loading || !searchQuery.trim()} variant="danger" {loading}>
			{loading ? 'Searching...' : 'Search'}
		</Button>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Search Results -->
		<div
			class="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
		>
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
				Results ({results.length})
			</h2>

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
							class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 {isSelected
								? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-red-500'
								: 'bg-gray-50 dark:bg-gray-700/50'}"
						>
							<div class="p-2 rounded-lg {getIndexBgColor(result._index)}">
								<Icon class="w-5 h-5 {getIndexColor(result._index)}" />
							</div>
							<div class="flex-1 min-w-0">
								{#if result._index === 'users'}
									{@const userSource = (result as UserSearchResult)._source}
									<p class="text-gray-900 dark:text-white font-medium truncate">
										{userSource.profile?.username}
									</p>
									<p class="text-gray-500 dark:text-gray-400 text-sm truncate">
										{userSource.profile?.email}
									</p>
								{:else if result._index === 'drops'}
									{@const dropSource = (result as DropSearchResult)._source}
									<p class="text-gray-900 dark:text-white font-medium truncate">
										{dropSource.title}
									</p>
									<p class="text-gray-500 dark:text-gray-400 text-sm truncate">
										{dropSource.type} • {dropSource.artists?.map((a: any) => a.name).join(', ') ||
											'Unknown Artist'}
									</p>
								{:else if result._index === 'songs'}
									{@const songSource = (result as SongSearchResult)._source}
									<p class="text-gray-900 dark:text-white font-medium truncate">
										{songSource.title}
									</p>
									<p class="text-gray-500 dark:text-gray-400 text-sm truncate">
										ISRC: {songSource.isrc || 'None'} • {songSource.artists
											?.map((a: any) => a.name)
											.join(', ') || 'Unknown Artist'}
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
		<div
			class="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
		>
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
				{#if selectedType === 'users'}User Details
				{:else if selectedType === 'songs'}Song Details
				{:else}Details{/if}
			</h2>

			{#if loadingDetails}
				<div class="flex items-center justify-center py-8">
					<Spinner size="md" color="red" />
				</div>
			{:else if !selectedItem}
				<p class="text-gray-500 text-center py-8">Select an item to view details</p>
			{:else if selectedType === 'users'}
				<!-- User Details -->
				<div class="space-y-4">
					<div class="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
						<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Profile</h3>
						<p class="text-gray-900 dark:text-white font-medium">
							{(selectedItem as UserSearchResult)._source.profile?.username}
						</p>
						<p class="text-gray-500 dark:text-gray-400 text-sm">
							{(selectedItem as UserSearchResult)._source.profile?.email}
						</p>
						<p class="text-gray-500 text-xs mt-1">
							ID: {(selectedItem as UserSearchResult)._source._id}
						</p>
					</div>

					{#if (selectedItem as UserSearchResult)._source.groups?.length > 0}
						<div class="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
							<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Groups</h3>
							<div class="flex flex-wrap gap-2">
								{#each (selectedItem as UserSearchResult)._source.groups as group}
									<Badge color="purple">{group}</Badge>
								{/each}
							</div>
						</div>
					{/if}

					{#if wallet}
						<div class="p-4 bg-gray-700/50 rounded-lg space-y-3">
							<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Wallet</h3>

							<div class="p-3 bg-gray-800/50 rounded-lg mb-2">
								<p class="text-xs text-gray-500 mb-1">Total Balance</p>
								<p class="text-2xl font-bold text-white">
									{formatCurrency(wallet.balance?.total || 0)}
								</p>
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div>
									<p class="text-xs text-gray-500">AmpSuite</p>
									<p class="text-gray-900 dark:text-white font-medium">
										{formatCurrency(wallet.balance?.ampsuite || 0)}
									</p>
								</div>
								<div>
									<p class="text-xs text-gray-500">Symphonic</p>
									<p class="text-gray-900 dark:text-white font-medium">
										{formatCurrency(wallet.balance?.symphonic || 0)}
									</p>
								</div>
							</div>

							<div>
								<label for="user-account-type" class="block text-sm font-medium text-gray-900 dark:text-white mb-2"
									>Account Type</label
								>
								<select
									id="user-account-type"
									value={wallet.accountType}
									onchange={(e) => updateWallet('accountType', e.currentTarget.value)}
									class="w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
								>
									<option value="DEFAULT">Default</option>
									<option value="SUBSCRIBED">Subscribed</option>
									<option value="VIP">VIP</option>
								</select>
							</div>

							<Input
								label="Cut (%)"
								id="user-cut"
								type="number"
								value={String(wallet.cut ?? '')}
								onchange={(e) => updateWallet('cut', (e.target as HTMLInputElement).value)}
							/>

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

						<!-- Add Transaction Form -->
						<div class="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-sm font-medium text-gray-400">Add Transaction</h3>
								{#if !showTransactionForm}
									<button
										onclick={openTransactionForm}
										class="p-1 rounded hover:bg-gray-600 transition-colors"
										aria-label="Add transaction"
									>
										<PlusOutline class="w-4 h-4 text-gray-400" />
									</button>
								{/if}
							</div>

							{#if showTransactionForm}
								<div class="space-y-3">
									<div class="grid grid-cols-2 gap-3">
										<div>
											<label for="tx-amount" class="block text-sm font-medium text-gray-900 dark:text-white mb-2">Amount</label>
											<input
												id="tx-amount"
												type="number"
												step="0.01"
												bind:value={txAmount}
												placeholder="0.00"
												class="w-full px-4 py-2.5 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
											/>
										</div>
										<div>
											<label for="tx-type" class="block text-sm font-medium text-gray-900 dark:text-white mb-2">Type</label>
											<select
												id="tx-type"
												bind:value={txType}
												class="w-full px-4 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
											>
												<option value="UNRESTRAINED">Unrestrained</option>
												<option value="RESTRAINED">Restrained</option>
											</select>
										</div>
									</div>

									<Input
										label="Description"
										id="tx-description"
										bind:value={txDescription}
										placeholder="e.g., Manual adjustment"
									/>

									<Input
										label="Counter Party"
										id="tx-counterparty"
										bind:value={txCounterParty}
										placeholder="e.g., Admin, Symphonic"
									/>

									<Input
										label="Timestamp"
										id="tx-timestamp"
										type="datetime-local"
										bind:value={txTimestamp}
									/>

									<div class="flex gap-2 pt-2">
										<Button
											onclick={submitTransaction}
											disabled={txSubmitting || !txDescription.trim() || !txCounterParty.trim()}
											loading={txSubmitting}
											variant="danger"
											size="sm"
											class="flex-1"
										>
											{txSubmitting ? 'Adding...' : 'Add Transaction'}
										</Button>
										<Button
											onclick={resetTransactionForm}
											disabled={txSubmitting}
											variant="secondary"
											size="sm"
										>
											Cancel
										</Button>
									</div>
								</div>
							{/if}
						</div>

						{#if wallet.transactions && wallet.transactions.length > 0}
							<div class="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
								<h3 class="text-sm font-medium text-gray-400 mb-3">
									Transactions ({wallet.transactions.length})
								</h3>
								<div class="space-y-2 max-h-64 overflow-y-auto">
									{#each wallet.transactions as tx}
										<div
											class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-sm"
										>
											<div class="flex-1 min-w-0">
												<p class="text-gray-900 dark:text-white truncate">
													{tx.description || tx.type}
												</p>
												<p class="text-gray-500 text-xs">
													{new Date(Number(tx.timestamp)).toLocaleDateString('de-DE')}
													{#if tx.counterParty}
														• {tx.counterParty}
													{/if}
												</p>
											</div>
											<span
												class="ml-2 font-medium {tx.amount >= 0
													? 'text-green-400'
													: 'text-red-400'}"
											>
												{tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
											</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					{:else}
						<p class="text-gray-500 text-center py-4">No wallet found for this user</p>
					{/if}

					<!-- User Drops -->
					<div class="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
						<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
							Drops ({userDrops.length})
						</h3>
						{#if userDrops.length > 0}
							<div class="space-y-2 max-h-64 overflow-y-auto">
								{#each userDrops as drop}
									<button
										onclick={() => navigateToDropById(drop._id!)}
										class="w-full flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-sm text-left hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
									>
										<div class="p-1.5 rounded bg-orange-500/20">
											<MusicOutline class="w-4 h-4 text-orange-400" />
										</div>
										<div class="flex-1 min-w-0">
											<p class="text-gray-900 dark:text-white truncate font-medium">
												{drop.title}
											</p>
											<p class="text-gray-500 text-xs">
												{drop.type} • {drop.artists?.map((a: any) => a.name).join(', ') || 'Unknown'}
											</p>
										</div>
										<ArrowRightOutline class="w-4 h-4 text-gray-400" />
									</button>
								{/each}
							</div>
						{:else}
							<p class="text-gray-500 text-center py-2">No drops found</p>
						{/if}
					</div>
				</div>
			{:else if selectedType === 'songs'}
				{@const songSourceAny = (selectedItem as SongSearchResult)._source as any}
				<!-- Song Details -->
				<div class="space-y-4">
					<div class="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
						<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Song Info</h3>
						<p class="text-gray-900 dark:text-white font-medium text-lg">
							{(selectedItem as SongSearchResult)._source.title}
						</p>
						<p class="text-gray-500 dark:text-gray-400 text-sm mt-1">
							{(selectedItem as SongSearchResult)._source.artists
								?.map((a: any) => a.name)
								.join(', ') || 'Unknown Artist'}
						</p>
						<p class="text-gray-500 text-xs mt-2">
							ID: {(selectedItem as SongSearchResult)._source._id}
						</p>
					</div>

					{#if (selectedItem as SongSearchResult)._source.isrc}
						<div class="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
							<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">ISRC</h3>
							<p class="text-gray-900 dark:text-white font-mono">
								{(selectedItem as SongSearchResult)._source.isrc}
							</p>
						</div>
					{/if}

					{#if songSourceAny.duration}
						<div class="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
							<h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Duration</h3>
							<p class="text-gray-900 dark:text-white">
								{Math.floor(songSourceAny.duration / 60)}:{String(
									songSourceAny.duration % 60,
								).padStart(2, '0')}
							</p>
						</div>
					{/if}

					{#if songSourceAny.dropId}
						<Button
							onclick={() => navigateToDropById(songSourceAny.dropId)}
							variant="danger"
							class="w-full"
						>
							<span>View Parent Drop</span>
							<ArrowRightOutline class="w-4 h-4" />
						</Button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
