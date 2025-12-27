<script lang="ts">
	import { Modal, Button, Input, SearchableSelect } from '$lib/components/ui';
	import { kyc, type LightKycData, type VerificationType } from '$lib/stores/kyc';
	import { CheckCircleSolid, ExclamationCircleOutline, UserSolid, BuildingSolid } from 'flowbite-svelte-icons';
	import { extractErrorMessage } from '$lib/utils/extractError';

	interface Props {
		open: boolean;
		onclose: () => void;
		oncomplete: () => void;
	}

	let { open = $bindable(), onclose, oncomplete }: Props = $props();

	// Form state
	let verificationType = $state<VerificationType>('individual');
	let firstName = $state('');
	let lastName = $state('');
	let dateOfBirth = $state('');
	let country = $state('');
	let street = $state('');
	let city = $state('');
	let postalCode = $state('');
	let stateProvince = $state('');

	// Business fields (for KYB)
	let companyName = $state('');
	let registrationNumber = $state('');
	let vatNumber = $state('');

	let submitting = $state(false);
	let error = $state('');
	let step = $state(1); // 1: Type Selection, 2: Personal Info, 3: Business Info (KYB only), 4: Address, 5: Review

	const totalSteps = $derived(verificationType === 'business' ? 5 : 4);

	// Country options (subset for demo)
	const countryOptions = [
		{ value: 'DE', label: 'Germany' },
		{ value: 'AT', label: 'Austria' },
		{ value: 'CH', label: 'Switzerland' },
		{ value: 'US', label: 'United States' },
		{ value: 'GB', label: 'United Kingdom' },
		{ value: 'FR', label: 'France' },
		{ value: 'ES', label: 'Spain' },
		{ value: 'IT', label: 'Italy' },
		{ value: 'NL', label: 'Netherlands' },
		{ value: 'BE', label: 'Belgium' },
		{ value: 'SE', label: 'Sweden' },
		{ value: 'NO', label: 'Norway' },
		{ value: 'DK', label: 'Denmark' },
		{ value: 'PL', label: 'Poland' },
		{ value: 'CZ', label: 'Czech Republic' },
		{ value: 'PT', label: 'Portugal' },
		{ value: 'IE', label: 'Ireland' },
		{ value: 'FI', label: 'Finland' },
		{ value: 'GR', label: 'Greece' },
		{ value: 'HU', label: 'Hungary' },
		{ value: 'RO', label: 'Romania' },
		{ value: 'BG', label: 'Bulgaria' },
		{ value: 'HR', label: 'Croatia' },
		{ value: 'SK', label: 'Slovakia' },
		{ value: 'SI', label: 'Slovenia' },
		{ value: 'LT', label: 'Lithuania' },
		{ value: 'LV', label: 'Latvia' },
		{ value: 'EE', label: 'Estonia' },
		{ value: 'LU', label: 'Luxembourg' },
		{ value: 'MT', label: 'Malta' },
		{ value: 'CY', label: 'Cyprus' },
		{ value: 'CA', label: 'Canada' },
		{ value: 'AU', label: 'Australia' },
		{ value: 'NZ', label: 'New Zealand' },
		{ value: 'JP', label: 'Japan' },
		{ value: 'KR', label: 'South Korea' },
		{ value: 'SG', label: 'Singapore' },
		{ value: 'BR', label: 'Brazil' },
		{ value: 'MX', label: 'Mexico' },
		{ value: 'AR', label: 'Argentina' },
	].sort((a, b) => a.label.localeCompare(b.label));

	// Validation
	const isStep1Valid = $derived(verificationType.length > 0);

	const isStep2Valid = $derived(
		firstName.trim().length > 0 && lastName.trim().length > 0 && dateOfBirth.length > 0
	);

	const isStep3Valid = $derived(
		verificationType === 'individual' ||
			(companyName.trim().length > 0 && registrationNumber.trim().length > 0)
	);

	const isAddressStepValid = $derived(
		country.length > 0 &&
			street.trim().length > 0 &&
			city.trim().length > 0 &&
			postalCode.trim().length > 0
	);

	// Age validation (must be 16+)
	const age = $derived.by(() => {
		if (!dateOfBirth) return 0;
		const birthDate = new Date(dateOfBirth);
		const today = new Date();
		let calculatedAge = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();
		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			calculatedAge--;
		}
		return calculatedAge;
	});

	const isAgeValid = $derived(age >= 16);

	// Get the actual step number for address based on verification type
	const addressStep = $derived(verificationType === 'business' ? 4 : 3);
	const reviewStep = $derived(verificationType === 'business' ? 5 : 4);

	function nextStep() {
		if (step === 1 && isStep1Valid) {
			step = 2;
		} else if (step === 2 && isStep2Valid && isAgeValid) {
			// For business, go to step 3 (business info), for individual skip to address
			step = verificationType === 'business' ? 3 : 3;
		} else if (step === 3) {
			// For business, this is business info step, for individual this is address step
			if (verificationType === 'business' && isStep3Valid) {
				step = 4; // Go to address
			} else if (verificationType === 'individual' && isAddressStepValid) {
				step = 4; // Go to review
			}
		} else if (step === 4) {
			// For business this is address, for individual this is review
			if (verificationType === 'business' && isAddressStepValid) {
				step = 5; // Go to review
			}
		}
	}

	function prevStep() {
		if (step > 1) step--;
	}

	async function handleSubmit() {
		error = '';
		submitting = true;

		try {
			const data: LightKycData = {
				verificationType,
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				dateOfBirth,
				country,
				address: {
					street: street.trim(),
					city: city.trim(),
					postalCode: postalCode.trim(),
					state: stateProvince.trim() || undefined,
				},
				...(verificationType === 'business' && {
					business: {
						companyName: companyName.trim(),
						registrationNumber: registrationNumber.trim(),
						vatNumber: vatNumber.trim() || undefined,
					},
				}),
			};

			// Submit to store (mock - instantly approves)
			kyc.submitLightKyc(data);

			// Small delay to show success state
			await new Promise((resolve) => setTimeout(resolve, 500));

			oncomplete();
		} catch (e: unknown) {
			error = extractErrorMessage(e, 'Failed to submit verification. Please try again.');
		} finally {
			submitting = false;
		}
	}

	function getCountryLabel(code: string): string {
		return countryOptions.find((c) => c.value === code)?.label || code;
	}
</script>

<Modal bind:open title="Identity Verification" size="md" onclose={() => onclose()}>
	<div class="space-y-6">
		<!-- Progress indicator -->
		<div class="flex items-center justify-center gap-1.5">
			{#each Array(totalSteps) as _, i}
				<div
					class="w-2.5 h-2.5 rounded-full transition-colors {i + 1 === step
						? 'bg-orange-500'
						: i + 1 < step
							? 'bg-green-500'
							: 'bg-gray-600'}"
				></div>
			{/each}
		</div>

		{#if error}
			<div
				class="flex items-center gap-3 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300"
			>
				<ExclamationCircleOutline class="w-5 h-5 flex-shrink-0" />
				<span class="text-sm">{error}</span>
			</div>
		{/if}

		<!-- Step 1: Verification Type Selection -->
		{#if step === 1}
			<div class="space-y-4">
				<div class="text-center mb-6">
					<h3 class="text-lg font-semibold text-white">Account Type</h3>
					<p class="text-sm text-gray-400 mt-1">
						Are you registering as an individual or a business?
					</p>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<button
						type="button"
						onclick={() => (verificationType = 'individual')}
						class="p-6 rounded-lg border-2 text-center transition-all {verificationType === 'individual'
							? 'bg-orange-500/20 border-orange-500'
							: 'bg-gray-800/50 border-gray-700 hover:border-gray-600'}"
					>
						<UserSolid class="w-10 h-10 mx-auto mb-3 {verificationType === 'individual' ? 'text-orange-400' : 'text-gray-400'}" />
						<span class="block font-medium {verificationType === 'individual' ? 'text-orange-400' : 'text-white'}">Individual</span>
						<span class="text-xs text-gray-400 mt-1 block">Personal account</span>
					</button>
					<button
						type="button"
						onclick={() => (verificationType = 'business')}
						class="p-6 rounded-lg border-2 text-center transition-all {verificationType === 'business'
							? 'bg-orange-500/20 border-orange-500'
							: 'bg-gray-800/50 border-gray-700 hover:border-gray-600'}"
					>
						<BuildingSolid class="w-10 h-10 mx-auto mb-3 {verificationType === 'business' ? 'text-orange-400' : 'text-gray-400'}" />
						<span class="block font-medium {verificationType === 'business' ? 'text-orange-400' : 'text-white'}">Business</span>
						<span class="text-xs text-gray-400 mt-1 block">Company or label</span>
					</button>
				</div>
			</div>
		{/if}

		<!-- Step 2: Personal Information -->
		{#if step === 2}
			<div class="space-y-4">
				<div class="text-center mb-6">
					<h3 class="text-lg font-semibold text-white">
						{verificationType === 'business' ? 'Representative Information' : 'Personal Information'}
					</h3>
					<p class="text-sm text-gray-400 mt-1">
						{verificationType === 'business'
							? 'Information about the person representing the business'
							: 'We need some basic information to verify your identity'}
					</p>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<Input
						bind:value={firstName}
						label="First Name"
						placeholder="John"
						required
					/>
					<Input
						bind:value={lastName}
						label="Last Name"
						placeholder="Doe"
						required
					/>
				</div>

				<Input
					label="Date of Birth"
					type="date"
					bind:value={dateOfBirth}
					max={new Date().toISOString().split('T')[0]}
					required
					error={dateOfBirth && !isAgeValid ? 'You must be at least 16 years old' : undefined}
				/>
			</div>
		{/if}

		<!-- Step 3: Business Information (KYB only) OR Address (KYC) -->
		{#if step === 3}
			{#if verificationType === 'business'}
				<div class="space-y-4">
					<div class="text-center mb-6">
						<h3 class="text-lg font-semibold text-white">Business Information</h3>
						<p class="text-sm text-gray-400 mt-1">Enter your company details</p>
					</div>

					<Input
						bind:value={companyName}
						label="Company Name"
						placeholder="Your Company Ltd."
						required
					/>

					<Input
						bind:value={registrationNumber}
						label="Company Registration Number"
						placeholder="e.g., HRB 12345"
						required
					/>

					<Input
						bind:value={vatNumber}
						label="VAT Number"
						placeholder="e.g., DE123456789"
						hint="Optional - Required for EU businesses"
					/>
				</div>
			{:else}
				<!-- Address step for individuals -->
				<div class="space-y-4">
					<div class="text-center mb-6">
						<h3 class="text-lg font-semibold text-white">Address</h3>
						<p class="text-sm text-gray-400 mt-1">Enter your current residential address</p>
					</div>

					<SearchableSelect
						bind:value={country}
						options={countryOptions}
						label="Country"
						placeholder="Select your country..."
						required
					/>

					<Input
						bind:value={street}
						label="Street Address"
						placeholder="123 Main Street"
						required
					/>

					<div class="grid grid-cols-2 gap-4">
						<Input bind:value={city} label="City" placeholder="Berlin" required />
						<Input bind:value={postalCode} label="Postal Code" placeholder="10115" required />
					</div>

					<Input bind:value={stateProvince} label="State/Province" placeholder="Optional" />
				</div>
			{/if}
		{/if}

		<!-- Step 4: Address (KYB) OR Review (KYC) -->
		{#if step === 4}
			{#if verificationType === 'business'}
				<!-- Address step for business -->
				<div class="space-y-4">
					<div class="text-center mb-6">
						<h3 class="text-lg font-semibold text-white">Business Address</h3>
						<p class="text-sm text-gray-400 mt-1">Enter your company's registered address</p>
					</div>

					<SearchableSelect
						bind:value={country}
						options={countryOptions}
						label="Country"
						placeholder="Select country..."
						required
					/>

					<Input
						bind:value={street}
						label="Street Address"
						placeholder="123 Business Street"
						required
					/>

					<div class="grid grid-cols-2 gap-4">
						<Input bind:value={city} label="City" placeholder="Berlin" required />
						<Input bind:value={postalCode} label="Postal Code" placeholder="10115" required />
					</div>

					<Input bind:value={stateProvince} label="State/Province" placeholder="Optional" />
				</div>
			{:else}
				<!-- Review step for individuals -->
				<div class="space-y-4">
					<div class="text-center mb-6">
						<h3 class="text-lg font-semibold text-white">Review Your Information</h3>
						<p class="text-sm text-gray-400 mt-1">Please verify all details are correct</p>
					</div>

					<div class="bg-gray-800/50 rounded-lg p-4 space-y-3">
						<div class="flex justify-between">
							<span class="text-gray-400">Account Type</span>
							<span class="text-white">Individual</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-400">Name</span>
							<span class="text-white">{firstName} {lastName}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-400">Date of Birth</span>
							<span class="text-white"
								>{new Date(dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-400">Country</span>
							<span class="text-white">{getCountryLabel(country)}</span>
						</div>
						<div class="border-t border-gray-700 my-2"></div>
						<div>
							<span class="text-gray-400 block mb-1">Address</span>
							<span class="text-white">
								{street}<br />
								{city}, {postalCode}
								{#if stateProvince}<br />{stateProvince}{/if}
							</span>
						</div>
					</div>

					<div class="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
						<p class="text-sm text-orange-300">
							By submitting, you confirm that all information provided is accurate and matches your
							legal identity documents.
						</p>
					</div>
				</div>
			{/if}
		{/if}

		<!-- Step 5: Review (KYB only) -->
		{#if step === 5 && verificationType === 'business'}
			<div class="space-y-4">
				<div class="text-center mb-6">
					<h3 class="text-lg font-semibold text-white">Review Your Information</h3>
					<p class="text-sm text-gray-400 mt-1">Please verify all details are correct</p>
				</div>

				<div class="bg-gray-800/50 rounded-lg p-4 space-y-3">
					<div class="flex justify-between">
						<span class="text-gray-400">Account Type</span>
						<span class="text-white">Business</span>
					</div>
					<div class="border-t border-gray-700 my-2"></div>
					<div class="flex justify-between">
						<span class="text-gray-400">Company Name</span>
						<span class="text-white">{companyName}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-400">Registration No.</span>
						<span class="text-white">{registrationNumber}</span>
					</div>
					{#if vatNumber}
						<div class="flex justify-between">
							<span class="text-gray-400">VAT Number</span>
							<span class="text-white">{vatNumber}</span>
						</div>
					{/if}
					<div class="border-t border-gray-700 my-2"></div>
					<div class="flex justify-between">
						<span class="text-gray-400">Representative</span>
						<span class="text-white">{firstName} {lastName}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-400">Date of Birth</span>
						<span class="text-white"
							>{new Date(dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span
						>
					</div>
					<div class="border-t border-gray-700 my-2"></div>
					<div class="flex justify-between">
						<span class="text-gray-400">Country</span>
						<span class="text-white">{getCountryLabel(country)}</span>
					</div>
					<div>
						<span class="text-gray-400 block mb-1">Address</span>
						<span class="text-white">
							{street}<br />
							{city}, {postalCode}
							{#if stateProvince}<br />{stateProvince}{/if}
						</span>
					</div>
				</div>

				<div class="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
					<p class="text-sm text-orange-300">
						By submitting, you confirm that all information provided is accurate and matches your
						company registration documents.
					</p>
				</div>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<div class="flex justify-between w-full">
			{#if step > 1}
				<Button variant="secondary" onclick={prevStep} disabled={submitting}>Back</Button>
			{:else}
				<div></div>
			{/if}

			{#if step < totalSteps}
				<Button
					onclick={nextStep}
					disabled={(step === 1 && !isStep1Valid) ||
						(step === 2 && (!isStep2Valid || !isAgeValid)) ||
						(step === 3 && verificationType === 'business' && !isStep3Valid) ||
						(step === 3 && verificationType === 'individual' && !isAddressStepValid) ||
						(step === 4 && verificationType === 'business' && !isAddressStepValid)}
				>
					Continue
				</Button>
			{:else}
				<Button onclick={handleSubmit} disabled={submitting} loading={submitting}>
					{submitting ? 'Submitting...' : 'Submit Verification'}
				</Button>
			{/if}
		</div>
	{/snippet}
</Modal>
