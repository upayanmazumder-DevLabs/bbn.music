<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		value?: string;
		options: Option[];
		label?: string;
		placeholder?: string;
		error?: string;
		hint?: string;
		disabled?: boolean;
		required?: boolean;
		id?: string;
		class?: string;
		onchange?: () => void;
	}

	let {
		value = $bindable(''),
		options,
		label,
		placeholder = 'Select...',
		error,
		hint,
		disabled = false,
		required = false,
		id,
		class: className = '',
		onchange,
	}: Props = $props();

	let showDropdown = $state(false);
	let searchQuery = $state('');
	let highlightedIndex = $state(0);

	let containerRef = $state<HTMLDivElement | null>(null);
	let dropdownRef = $state<HTMLDivElement | null>(null);
	let searchInputRef = $state<HTMLInputElement | null>(null);
	let buttonRef = $state<HTMLButtonElement | null>(null);

	const generatedId = `searchable-select-${Math.random().toString(36).slice(2, 9)}`;
	const selectId = $derived(id ?? generatedId);

	// Get display label for current value
	const displayLabel = $derived(options.find((o) => o.value === value)?.label ?? '');

	// Filter options based on search
	const filteredOptions = $derived.by(() => {
		if (!searchQuery) return options;
		const query = searchQuery.toLowerCase();
		return options.filter(
			(option) =>
				option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query)
		);
	});

	function openDropdown() {
		if (disabled) return;
		showDropdown = true;
		searchQuery = '';
		// Set highlighted index to current value or 0
		const currentIndex = filteredOptions.findIndex((o) => o.value === value);
		highlightedIndex = currentIndex >= 0 ? currentIndex : 0;

		requestAnimationFrame(() => {
			searchInputRef?.focus();
		});
	}

	function closeDropdown() {
		showDropdown = false;
		searchQuery = '';
		highlightedIndex = 0;
	}

	function selectOption(option: Option) {
		value = option.value;
		closeDropdown();
		buttonRef?.focus();
		onchange?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		const list = filteredOptions;
		if (!list.length) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				highlightedIndex = (highlightedIndex + 1) % list.length;
				scrollToHighlighted();
				break;
			case 'ArrowUp':
				e.preventDefault();
				highlightedIndex = (highlightedIndex - 1 + list.length) % list.length;
				scrollToHighlighted();
				break;
			case 'Enter':
				e.preventDefault();
				if (list[highlightedIndex]) {
					selectOption(list[highlightedIndex]);
				}
				break;
			case 'Escape':
				e.preventDefault();
				closeDropdown();
				buttonRef?.focus();
				break;
			case 'Tab':
				closeDropdown();
				break;
		}
	}

	function scrollToHighlighted() {
		requestAnimationFrame(() => {
			const highlighted = dropdownRef?.querySelector('[data-highlighted="true"]');
			highlighted?.scrollIntoView({ block: 'nearest' });
		});
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (showDropdown && containerRef && !containerRef.contains(target)) {
			closeDropdown();
		}
	}

	// Reset highlighted index when search changes
	$effect(() => {
		if (searchQuery !== undefined) {
			highlightedIndex = 0;
		}
	});
</script>

<svelte:window onclick={handleClickOutside} />

<div class="w-full" bind:this={containerRef}>
	{#if label}
		<label for={selectId} class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
			{label}
			{#if required}
				<span class="text-orange-500 dark:text-orange-400">*</span>
			{/if}
		</label>
	{/if}

	<div class="relative">
		<button
			bind:this={buttonRef}
			type="button"
			{id}
			{disabled}
			onclick={openDropdown}
			aria-haspopup="listbox"
			aria-expanded={showDropdown}
			aria-labelledby={label ? selectId : undefined}
			class="
				w-full px-4 py-2.5 rounded-lg text-left cursor-pointer
				bg-white dark:bg-gray-900/50 border transition-all duration-200
				focus:outline-none focus:ring-2 focus:ring-offset-0
				disabled:opacity-50 disabled:cursor-not-allowed
				{error
				? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
				: 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-orange-500 focus:ring-orange-500/20'}
				{className}
			"
		>
			<span class={displayLabel ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
				{displayLabel || placeholder}
			</span>

			<!-- Dropdown arrow -->
			<div
				class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400"
			>
				<svg
					class="h-4 w-4 transition-transform {showDropdown ? 'rotate-180' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</div>
		</button>

		<!-- Dropdown -->
		{#if showDropdown}
			<div
				bind:this={dropdownRef}
				class="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50"
				role="listbox"
				aria-label={label || 'Options'}
				tabindex="-1"
				onkeydown={handleKeydown}
			>
				<!-- Search -->
				<div class="sticky top-0 p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
					<input
						bind:this={searchInputRef}
						type="text"
						bind:value={searchQuery}
						placeholder="Search..."
						aria-label="Search options"
						class="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-sm"
					/>
				</div>

				<!-- Options List -->
				<div class="py-1">
					{#each filteredOptions as option, index}
						{@const isHighlighted = index === highlightedIndex}
						{@const isSelected = option.value === value}
						<button
							type="button"
							role="option"
							aria-selected={isSelected}
							data-highlighted={isHighlighted}
							onclick={() => selectOption(option)}
							onmouseenter={() => (highlightedIndex = index)}
							class="w-full px-4 py-2 flex items-center justify-between transition-colors text-left text-sm
								{isHighlighted ? 'bg-gray-100 dark:bg-gray-700/50' : ''}
								{isSelected ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-900 dark:text-white'}"
						>
							<span>{option.label}</span>
							{#if isSelected}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							{/if}
						</button>
					{:else}
						<div class="px-4 py-6 text-center text-gray-500 text-sm">No results found</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	{#if error}
		<p class="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
	{:else if hint}
		<p class="mt-1.5 text-sm text-gray-500">{hint}</p>
	{/if}
</div>
