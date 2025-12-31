<script lang="ts">
	import {
		parsePhoneNumber,
		getCountries,
		getCountryCallingCode,
		AsYouType,
		type CountryCode,
	} from 'libphonenumber-js';

	let { value = $bindable(''), error = $bindable(''), disabled = false, id = '' } = $props();

	let selectedCountry = $state<CountryCode>('DE');
	let phoneNumber = $state('');
	let showCountryDropdown = $state(false);
	let searchQuery = $state('');
	let highlightedIndex = $state(0);

	let dropdownRef = $state<HTMLDivElement | null>(null);
	let searchInputRef = $state<HTMLInputElement | null>(null);
	let phoneInputRef = $state<HTMLInputElement | null>(null);

	// Get all countries
	const countries = getCountries();

	// Country names using Intl API (covers all countries)
	const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

	function getCountryName(code: CountryCode): string {
		try {
			return regionNames.of(code) || code;
		} catch {
			return code;
		}
	}

	// Country flag from code (works for all countries)
	function getCountryFlag(code: CountryCode): string {
		const codePoints = [...code.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0));
		return String.fromCodePoint(...codePoints);
	}

	// Filtered countries based on search
	const filteredCountries = $derived.by(() => {
		if (!searchQuery) return countries;
		const query = searchQuery.toLowerCase();
		return countries.filter((code) => {
			const name = getCountryName(code);
			return (
				name.toLowerCase().includes(query) ||
				code.toLowerCase().includes(query) ||
				`+${getCountryCallingCode(code)}`.includes(query)
			);
		});
	});

	// Get calling code for selected country
	const callingCode = $derived(`+${getCountryCallingCode(selectedCountry)}`);

	// Track if we've initialized from value
	let initialized = false;

	// Parse the initial value and sync with external changes
	$effect(() => {
		if (value) {
			// Only parse if value changed externally (not from our own updates)
			const normalizedValue = value.startsWith('+') ? value : `+${value}`;
			try {
				const parsed = parsePhoneNumber(normalizedValue);
				if (parsed) {
					const newCountry = parsed.country || selectedCountry;
					const newNational = parsed.nationalNumber;

					// Only update if different to avoid loops
					if (
						!initialized ||
						newCountry !== selectedCountry ||
						newNational !== phoneNumber.replace(/\D/g, '')
					) {
						selectedCountry = newCountry;
						// Format the national number
						const formatter = new AsYouType(newCountry);
						phoneNumber = formatter.input(newNational);
						initialized = true;
					}
				}
			} catch {
				// If parsing fails and not initialized, use raw value
				if (!initialized) {
					phoneNumber = value.replace(/^\+\d+/, '').trim();
					initialized = true;
				}
			}
		} else if (initialized && !value) {
			// Value was cleared externally
			phoneNumber = '';
		}
	});

	// Format and validate phone number as user types
	function handleInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const rawValue = input.value;

		// Handle empty input
		if (!rawValue || rawValue.trim() === '') {
			phoneNumber = '';
			value = '';
			error = '';
			return;
		}

		// Remove all non-digit characters for processing
		const digitsOnly = rawValue.replace(/\D/g, '');

		// If user cleared all digits, clear everything
		if (!digitsOnly) {
			phoneNumber = '';
			value = '';
			error = '';
			return;
		}

		// Use AsYouType for formatting
		const formatter = new AsYouType(selectedCountry);
		const formatted = formatter.input(digitsOnly);

		// The formatter may include country code, remove it for display
		let nationalFormatted = formatted;
		if (formatted.startsWith(callingCode)) {
			nationalFormatted = formatted.slice(callingCode.length).trim();
		}

		// Update the display value
		phoneNumber = nationalFormatted;

		// Validate and set the full international format
		try {
			const parsed = parsePhoneNumber(digitsOnly, selectedCountry);
			if (parsed && parsed.isValid()) {
				value = parsed.number;
				error = '';
			} else {
				value = `${callingCode}${digitsOnly}`;
				error = 'Invalid phone number';
			}
		} catch {
			value = `${callingCode}${digitsOnly}`;
			error = 'Invalid phone number';
		}
	}

	// Handle country selection
	function selectCountry(code: CountryCode) {
		selectedCountry = code;
		showCountryDropdown = false;
		searchQuery = '';
		highlightedIndex = 0;

		// Focus back to phone input
		phoneInputRef?.focus();

		// Re-validate with new country
		if (phoneNumber) {
			const digitsOnly = phoneNumber.replace(/\D/g, '');
			if (digitsOnly) {
				try {
					const parsed = parsePhoneNumber(digitsOnly, selectedCountry);
					if (parsed && parsed.isValid()) {
						value = parsed.number;
						error = '';
					} else {
						value = `+${getCountryCallingCode(selectedCountry)}${digitsOnly}`;
						error = 'Invalid phone number for selected country';
					}
				} catch {
					value = `+${getCountryCallingCode(selectedCountry)}${digitsOnly}`;
					error = 'Invalid phone number for selected country';
				}
			}
		}
	}

	// Open dropdown and focus search
	function openDropdown() {
		if (disabled) return;
		showCountryDropdown = true;
		highlightedIndex = filteredCountries.indexOf(selectedCountry);
		if (highlightedIndex === -1) highlightedIndex = 0;

		// Focus search input after dropdown opens
		requestAnimationFrame(() => {
			searchInputRef?.focus();
		});
	}

	// Close dropdown
	function closeDropdown() {
		showCountryDropdown = false;
		searchQuery = '';
		highlightedIndex = 0;
	}

	// Handle keyboard navigation in dropdown
	function handleDropdownKeydown(e: KeyboardEvent) {
		const list = filteredCountries;
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
					selectCountry(list[highlightedIndex]);
				}
				break;
			case 'Escape':
				e.preventDefault();
				closeDropdown();
				phoneInputRef?.focus();
				break;
			case 'Tab':
				closeDropdown();
				break;
		}
	}

	// Scroll highlighted item into view
	function scrollToHighlighted() {
		requestAnimationFrame(() => {
			const highlighted = dropdownRef?.querySelector('[data-highlighted="true"]');
			highlighted?.scrollIntoView({ block: 'nearest' });
		});
	}

	// Handle click outside to close dropdown
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (showCountryDropdown && !target.closest('[data-phone-input]')) {
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

<div class="relative" data-phone-input>
	<div class="flex gap-2">
		<!-- Country Selector -->
		<div class="relative">
			<button
				type="button"
				onclick={openDropdown}
				{disabled}
				aria-haspopup="listbox"
				aria-expanded={showCountryDropdown}
				aria-label="Select country code"
				class="h-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[100px]"
			>
				<span class="text-xl">{getCountryFlag(selectedCountry)}</span>
				<span class="text-sm">{callingCode}</span>
				<svg
					class="w-4 h-4 ml-auto transition-transform {showCountryDropdown ? 'rotate-180' : ''}"
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
			</button>

			<!-- Country Dropdown -->
			{#if showCountryDropdown}
				<div
					bind:this={dropdownRef}
					class="absolute top-full left-0 mt-2 w-80 max-h-96 overflow-auto bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50"
					role="listbox"
					aria-label="Countries"
					tabindex="-1"
					onkeydown={handleDropdownKeydown}
				>
					<!-- Search -->
					<div class="sticky top-0 p-3 bg-gray-800 border-b border-gray-700">
						<input
							bind:this={searchInputRef}
							type="text"
							bind:value={searchQuery}
							placeholder="Search countries..."
							aria-label="Search countries"
							class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-sm"
						/>
					</div>

					<!-- Country List -->
					<div class="py-1">
						{#each filteredCountries as country, index}
							{@const isHighlighted = index === highlightedIndex}
							{@const isSelected = country === selectedCountry}
							<button
								type="button"
								role="option"
								aria-selected={isSelected}
								data-highlighted={isHighlighted}
								onclick={() => selectCountry(country)}
								onmouseenter={() => (highlightedIndex = index)}
								class="w-full px-4 py-2 flex items-center gap-3 transition-colors text-left
									{isHighlighted ? 'bg-white/10' : ''}
									{isSelected ? 'text-orange-400' : 'text-white'}"
							>
								<span class="text-xl">{getCountryFlag(country)}</span>
								<span class="flex-1 text-sm">{getCountryName(country)}</span>
								<span class="text-sm text-gray-400">+{getCountryCallingCode(country)}</span>
							</button>
						{:else}
							<div class="px-4 py-8 text-center text-gray-400 text-sm">No countries found</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Phone Number Input -->
		<input
			bind:this={phoneInputRef}
			type="tel"
			{id}
			value={phoneNumber}
			oninput={handleInput}
			{disabled}
			placeholder="Phone number"
			aria-invalid={!!error}
			aria-describedby={error ? `${id}-error` : undefined}
			class="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed
				{error ? 'border-red-500/50' : 'border-white/10'}"
		/>
	</div>

	{#if error}
		<p id="{id}-error" class="text-xs text-red-400 mt-1" role="alert">{error}</p>
	{/if}
</div>

<style>
	/* Custom scrollbar for dropdown */
	div::-webkit-scrollbar {
		width: 8px;
	}

	div::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}

	div::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
	}

	div::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}
</style>
