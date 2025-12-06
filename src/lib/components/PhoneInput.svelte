<script lang="ts">
import {
	parsePhoneNumber,
	getCountries,
	getCountryCallingCode,
	AsYouType,
	type CountryCode,
} from 'libphonenumber-js';

let {
	value = $bindable(''),
	error = $bindable(''),
	disabled = false,
	id = '',
} = $props();

let selectedCountry = $state<CountryCode>('US');
let phoneNumber = $state('');
let showCountryDropdown = $state(false);
let searchQuery = $state('');
let isValid = $state(true);

// Get all countries
const countries = getCountries();

// Country data with names
const countryData: Record<string, { name: string; flag: string }> = {
	US: { name: 'United States', flag: '🇺🇸' },
	GB: { name: 'United Kingdom', flag: '🇬🇧' },
	CA: { name: 'Canada', flag: '🇨🇦' },
	AU: { name: 'Australia', flag: '🇦🇺' },
	DE: { name: 'Germany', flag: '🇩🇪' },
	FR: { name: 'France', flag: '🇫🇷' },
	IT: { name: 'Italy', flag: '🇮🇹' },
	ES: { name: 'Spain', flag: '🇪🇸' },
	NL: { name: 'Netherlands', flag: '🇳🇱' },
	BE: { name: 'Belgium', flag: '🇧🇪' },
	CH: { name: 'Switzerland', flag: '🇨🇭' },
	AT: { name: 'Austria', flag: '🇦🇹' },
	SE: { name: 'Sweden', flag: '🇸🇪' },
	NO: { name: 'Norway', flag: '🇳🇴' },
	DK: { name: 'Denmark', flag: '🇩🇰' },
	FI: { name: 'Finland', flag: '🇫🇮' },
	PL: { name: 'Poland', flag: '🇵🇱' },
	CZ: { name: 'Czech Republic', flag: '🇨🇿' },
	SK: { name: 'Slovakia', flag: '🇸🇰' },
	HU: { name: 'Hungary', flag: '🇭🇺' },
	RO: { name: 'Romania', flag: '🇷🇴' },
	BG: { name: 'Bulgaria', flag: '🇧🇬' },
	GR: { name: 'Greece', flag: '🇬🇷' },
	PT: { name: 'Portugal', flag: '🇵🇹' },
	IE: { name: 'Ireland', flag: '🇮🇪' },
	JP: { name: 'Japan', flag: '🇯🇵' },
	CN: { name: 'China', flag: '🇨🇳' },
	KR: { name: 'South Korea', flag: '🇰🇷' },
	IN: { name: 'India', flag: '🇮🇳' },
	BR: { name: 'Brazil', flag: '🇧🇷' },
	MX: { name: 'Mexico', flag: '🇲🇽' },
	AR: { name: 'Argentina', flag: '🇦🇷' },
	ZA: { name: 'South Africa', flag: '🇿🇦' },
	NZ: { name: 'New Zealand', flag: '🇳🇿' },
	SG: { name: 'Singapore', flag: '🇸🇬' },
	HK: { name: 'Hong Kong', flag: '🇭🇰' },
	TW: { name: 'Taiwan', flag: '🇹🇼' },
	TH: { name: 'Thailand', flag: '🇹🇭' },
	MY: { name: 'Malaysia', flag: '🇲🇾' },
	PH: { name: 'Philippines', flag: '🇵🇭' },
	ID: { name: 'Indonesia', flag: '🇮🇩' },
	VN: { name: 'Vietnam', flag: '🇻🇳' },
	AE: { name: 'UAE', flag: '🇦🇪' },
	SA: { name: 'Saudi Arabia', flag: '🇸🇦' },
	IL: { name: 'Israel', flag: '🇮🇱' },
	TR: { name: 'Turkey', flag: '🇹🇷' },
	RU: { name: 'Russia', flag: '🇷🇺' },
	UA: { name: 'Ukraine', flag: '🇺🇦' },
};

// Filtered countries based on search
const filteredCountries = $derived.by(() => {
	if (!searchQuery) return countries;
	const query = searchQuery.toLowerCase();
	return countries.filter((code) => {
		const data = countryData[code];
		return (
			data?.name.toLowerCase().includes(query) ||
			code.toLowerCase().includes(query) ||
			`+${getCountryCallingCode(code)}`.includes(query)
		);
	});
});

// Get calling code for selected country
const callingCode = $derived(`+${getCountryCallingCode(selectedCountry)}`);

// Parse the initial value if provided
$effect(() => {
	if (value && !phoneNumber) {
		try {
			// Add + prefix if missing for proper parsing
			const normalizedValue = value.startsWith('+') ? value : `+${value}`;
			const parsed = parsePhoneNumber(normalizedValue);
			if (parsed) {
				selectedCountry = parsed.country || 'US';
				phoneNumber = parsed.nationalNumber;
			}
		} catch {
			// If parsing fails, use the raw value
			phoneNumber = value;
		}
	}
});

// Format and validate phone number as user types
function handleInput(e: Event) {
	const input = e.target as HTMLInputElement;
	let rawValue = input.value;
	const cursorPosition = input.selectionStart || 0;

	// Handle empty input - clear everything
	if (!rawValue || rawValue.trim() === '') {
		phoneNumber = '';
		value = '';
		error = '';
		isValid = true;
		return;
	}

	// Strip any leading + or country code that user might type
	// We only want the national number in the input field
	rawValue = rawValue
		.replace(/^\+/, '')
		.replace(new RegExp(`^${getCountryCallingCode(selectedCountry)}`), '')
		.trim();

	// Remove all non-digit characters for processing
	const digitsOnly = rawValue.replace(/\D/g, '');

	// If user cleared all digits, clear everything
	if (!digitsOnly) {
		phoneNumber = '';
		value = '';
		error = '';
		isValid = true;
		return;
	}

	// Count digits before cursor for cursor position restoration
	const textBeforeCursor = rawValue.substring(0, cursorPosition);
	const digitsBeforeCursor = textBeforeCursor.replace(/\D/g, '').length;

	// Use AsYouType for formatting national number only
	const formatter = new AsYouType(selectedCountry);
	const formatted = formatter.input(digitsOnly);

	// Remove country code from formatted output if present
	const nationalFormatted = formatted.replace(callingCode, '').trim();

	// Update the display value
	phoneNumber = nationalFormatted;

	// Calculate new cursor position
	// Find position where we have the same number of digits
	let newCursorPosition = 0;
	let digitCount = 0;
	for (
		let i = 0;
		i < nationalFormatted.length && digitCount < digitsBeforeCursor;
		i++
	) {
		if (/\d/.test(nationalFormatted[i])) {
			digitCount++;
		}
		newCursorPosition = i + 1;
	}

	// Restore cursor position after Svelte updates the DOM
	setTimeout(() => {
		input.setSelectionRange(newCursorPosition, newCursorPosition);
	}, 0);

	// Validate and set the full international format
	try {
		const parsed = parsePhoneNumber(digitsOnly, selectedCountry);
		if (parsed && parsed.isValid()) {
			value = parsed.number;
			error = '';
			isValid = true;
		} else {
			value = `${callingCode}${digitsOnly}`;
			error = 'Invalid phone number';
			isValid = false;
		}
	} catch {
		value = `${callingCode}${digitsOnly}`;
		error = 'Invalid phone number';
		isValid = false;
	}
}

// Handle country selection
function selectCountry(code: CountryCode) {
	selectedCountry = code;
	showCountryDropdown = false;
	searchQuery = '';

	// Re-validate with new country
	if (phoneNumber) {
		try {
			const parsed = parsePhoneNumber(phoneNumber, selectedCountry);
			if (parsed && parsed.isValid()) {
				value = parsed.number;
				error = '';
				isValid = true;
			} else {
				error = 'Invalid phone number for selected country';
				isValid = false;
			}
		} catch {
			error = 'Invalid phone number for selected country';
			isValid = false;
		}
	}
}

// Handle click outside to close dropdown
function handleClickOutside(event: MouseEvent) {
	const target = event.target as HTMLElement;
	if (!target.closest('[data-phone-input]')) {
		showCountryDropdown = false;
		searchQuery = '';
	}
}

// Get country name
function getCountryName(code: CountryCode): string {
	return countryData[code]?.name || code;
}

// Get country flag
function getCountryFlag(code: CountryCode): string {
	return countryData[code]?.flag || '🏳️';
}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative" data-phone-input>
	<div class="flex gap-2">
		<!-- Country Selector -->
		<div class="relative">
			<button
				type="button"
				onclick={() => (showCountryDropdown = !showCountryDropdown)}
				disabled={disabled}
				class="h-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[100px]"
			>
				<span class="text-xl">{getCountryFlag(selectedCountry)}</span>
				<span class="text-sm">{callingCode}</span>
				<svg class="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			<!-- Country Dropdown -->
			{#if showCountryDropdown}
				<div
					class="absolute top-full left-0 mt-2 w-80 max-h-96 overflow-auto bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50"
					role="menu"
					tabindex="-1"
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => {
						if (e.key === 'Escape') {
							showCountryDropdown = false;
							searchQuery = '';
						}
					}}
				>
					<!-- Search -->
					<div class="sticky top-0 p-3 bg-gray-800 border-b border-gray-700">
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search countries..."
							class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none text-sm"
						/>
					</div>

					<!-- Country List -->
					<div class="py-1">
						{#each filteredCountries as country}
							<button
								type="button"
								onclick={() => selectCountry(country)}
								class="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/10 transition-colors text-left {country ===
								selectedCountry
									? 'bg-orange-500/20 text-orange-400'
									: 'text-white'}"
							>
								<span class="text-xl">{getCountryFlag(country)}</span>
								<span class="flex-1 text-sm">{getCountryName(country)}</span>
								<span class="text-sm text-gray-400">+{getCountryCallingCode(country)}</span>
							</button>
						{:else}
							<div class="px-4 py-8 text-center text-gray-400 text-sm">
								No countries found
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Phone Number Input -->
		<input
			type="tel"
			{id}
			value={phoneNumber}
			oninput={handleInput}
			disabled={disabled}
			placeholder="Phone number"
			class="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border text-white placeholder-gray-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed {isValid
				? 'border-white/10'
				: 'border-red-500/50'}"
		/>
	</div>

	{#if error}
		<p class="text-xs text-red-400 mt-1">{error}</p>
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
