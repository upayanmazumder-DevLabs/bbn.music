<script lang="ts">
	import { Modal, Button, Input, SearchableSelect } from '$lib/components/ui';
	import { kyc, type HardKycData } from '$lib/stores/kyc';
	import {
		CheckCircleSolid,
		ExclamationCircleOutline,
		UploadOutline,
		UserSolid,
	} from 'flowbite-svelte-icons';
	import { extractErrorMessage } from '$lib/utils/extractError';

	interface Props {
		open: boolean;
		onclose: () => void;
		oncomplete: () => void;
	}

	let { open = $bindable(), onclose, oncomplete }: Props = $props();

	// Form state
	let idType = $state<'passport' | 'drivers_license' | 'national_id'>('passport');
	let idNumber = $state('');
	let idFrontFile = $state<File | null>(null);
	let idBackFile = $state<File | null>(null);
	let selfieFile = $state<File | null>(null);
	let proofOfAddressFile = $state<File | null>(null);
	let taxCountry = $state('');
	let taxId = $state('');

	let submitting = $state(false);
	let error = $state('');
	let step = $state(1); // 1: ID Type, 2: ID Upload, 3: Selfie, 4: Proof of Address, 5: Tax Info, 6: Review

	// ID type options
	const idTypeOptions = [
		{ value: 'passport', label: 'Passport' },
		{ value: 'drivers_license', label: "Driver's License" },
		{ value: 'national_id', label: 'National ID Card' },
	];

	// Country options for tax info
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
		{ value: 'CA', label: 'Canada' },
		{ value: 'AU', label: 'Australia' },
		{ value: 'NZ', label: 'New Zealand' },
		{ value: 'JP', label: 'Japan' },
		{ value: 'KR', label: 'South Korea' },
		{ value: 'SG', label: 'Singapore' },
		{ value: 'BR', label: 'Brazil' },
		{ value: 'MX', label: 'Mexico' },
	].sort((a, b) => a.label.localeCompare(b.label));

	// File refs
	let idFrontInput = $state<HTMLInputElement | null>(null);
	let idBackInput = $state<HTMLInputElement | null>(null);
	let selfieInput = $state<HTMLInputElement | null>(null);
	let proofInput = $state<HTMLInputElement | null>(null);

	// Validation per step
	const isStep1Valid = $derived(idType.length > 0 && idNumber.trim().length > 0);
	const isStep2Valid = $derived(
		idFrontFile !== null && (idType === 'passport' || idBackFile !== null),
	);
	const isStep3Valid = $derived(selfieFile !== null);
	const isStep4Valid = $derived(proofOfAddressFile !== null);
	const isStep5Valid = $derived(taxCountry.length > 0 && taxId.trim().length > 0);

	const totalSteps = 6;

	function nextStep() {
		if (step < totalSteps) {
			step++;
		}
	}

	function prevStep() {
		if (step > 1) step--;
	}

	function handleFileChange(
		event: Event,
		setter: (file: File | null) => void,
		maxSizeMB: number = 10,
	) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		// Validate file type
		if (!file.type.match(/^image\/(jpeg|png|pdf)$/) && !file.type.match(/^application\/pdf$/)) {
			error = 'Please select a JPEG, PNG, or PDF file';
			return;
		}

		// Validate file size
		if (file.size > maxSizeMB * 1024 * 1024) {
			error = `File must be less than ${maxSizeMB}MB`;
			return;
		}

		error = '';
		setter(file);
	}

	async function handleSubmit() {
		error = '';
		submitting = true;

		try {
			const data: HardKycData = {
				idType,
				idNumber: idNumber.trim(),
				idFrontUploaded: idFrontFile !== null,
				idBackUploaded: idBackFile !== null,
				selfieUploaded: selfieFile !== null,
				proofOfAddressUploaded: proofOfAddressFile !== null,
				taxCountry,
				taxId: taxId.trim(),
			};

			// In production, we would upload files here
			// For mock, just submit the data
			kyc.submitHardKyc(data);

			// Small delay to show success state
			await new Promise((resolve) => setTimeout(resolve, 500));

			oncomplete();
		} catch (e: unknown) {
			error = extractErrorMessage(e, 'Failed to submit verification. Please try again.');
		} finally {
			submitting = false;
		}
	}

	function getIdTypeLabel(type: string): string {
		return idTypeOptions.find((t) => t.value === type)?.label || type;
	}

	function getCountryLabel(code: string): string {
		return countryOptions.find((c) => c.value === code)?.label || code;
	}
</script>

<Modal bind:open title="Full Identity Verification" size="md" onclose={() => onclose()}>
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

		<!-- Step 1: ID Type Selection -->
		{#if step === 1}
			<div class="space-y-4">
				<div class="text-center mb-6">
					<div
						class="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center"
					>
						<UserSolid class="w-8 h-8 text-orange-400" />
					</div>
					<h3 class="text-lg font-semibold text-white">Identity Document</h3>
					<p class="text-sm text-gray-400 mt-1">
						Select your ID type and enter the document number
					</p>
				</div>

				<div class="space-y-4">
					<div>
						<span id="doc-type-label" class="block text-sm font-medium text-white mb-2">
							Document Type <span class="text-orange-400">*</span>
						</span>
						<div class="grid grid-cols-3 gap-2" role="group" aria-labelledby="doc-type-label">
							{#each idTypeOptions as option}
								<button
									type="button"
									onclick={() => (idType = option.value as typeof idType)}
									aria-pressed={idType === option.value}
									class="p-3 rounded-lg border text-center transition-colors {idType ===
									option.value
										? 'bg-orange-500/20 border-orange-500 text-orange-400'
										: 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'}"
								>
									<span class="text-sm">{option.label}</span>
								</button>
							{/each}
						</div>
					</div>

					<Input
						bind:value={idNumber}
						label="Document Number"
						placeholder="Enter your document number"
						required
					/>
				</div>
			</div>
		{/if}

		<!-- Step 2: ID Document Upload -->
		{#if step === 2}
			<div class="space-y-4">
				<div class="text-center mb-6">
					<h3 class="text-lg font-semibold text-white">Upload Your {getIdTypeLabel(idType)}</h3>
					<p class="text-sm text-gray-400 mt-1">Take a clear photo of your document</p>
				</div>

				<!-- Front of ID -->
				<div>
					<span id="id-front-label" class="block text-sm font-medium text-white mb-2">
						Front of Document <span class="text-orange-400">*</span>
					</span>
					<button
						type="button"
						onclick={() => idFrontInput?.click()}
						aria-labelledby="id-front-label"
						class="w-full p-6 rounded-lg border-2 border-dashed transition-colors {idFrontFile
							? 'border-green-500 bg-green-500/10'
							: 'border-gray-600 hover:border-gray-500 bg-gray-800/30'}"
					>
						{#if idFrontFile}
							<div class="flex items-center justify-center gap-2 text-green-400">
								<CheckCircleSolid class="w-5 h-5" />
								<span class="text-sm">{idFrontFile.name}</span>
							</div>
						{:else}
							<div class="flex flex-col items-center gap-2 text-gray-400">
								<UploadOutline class="w-8 h-8" />
								<span class="text-sm">Click to upload front of ID</span>
							</div>
						{/if}
					</button>
					<input
						bind:this={idFrontInput}
						type="file"
						accept="image/jpeg,image/png,application/pdf"
						onchange={(e) => handleFileChange(e, (f) => (idFrontFile = f))}
						class="hidden"
					/>
				</div>

				<!-- Back of ID (not needed for passport) -->
				{#if idType !== 'passport'}
					<div>
						<span id="id-back-label" class="block text-sm font-medium text-white mb-2">
							Back of Document <span class="text-orange-400">*</span>
						</span>
						<button
							type="button"
							onclick={() => idBackInput?.click()}
							aria-labelledby="id-back-label"
							class="w-full p-6 rounded-lg border-2 border-dashed transition-colors {idBackFile
								? 'border-green-500 bg-green-500/10'
								: 'border-gray-600 hover:border-gray-500 bg-gray-800/30'}"
						>
							{#if idBackFile}
								<div class="flex items-center justify-center gap-2 text-green-400">
									<CheckCircleSolid class="w-5 h-5" />
									<span class="text-sm">{idBackFile.name}</span>
								</div>
							{:else}
								<div class="flex flex-col items-center gap-2 text-gray-400">
									<UploadOutline class="w-8 h-8" />
									<span class="text-sm">Click to upload back of ID</span>
								</div>
							{/if}
						</button>
						<input
							bind:this={idBackInput}
							type="file"
							accept="image/jpeg,image/png,application/pdf"
							onchange={(e) => handleFileChange(e, (f) => (idBackFile = f))}
							class="hidden"
						/>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Step 3: Selfie Verification -->
		{#if step === 3}
			<div class="space-y-4">
				<div class="text-center mb-6">
					<div
						class="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center"
					>
						<UserSolid class="w-8 h-8 text-orange-400" />
					</div>
					<h3 class="text-lg font-semibold text-white">Selfie Verification</h3>
					<p class="text-sm text-gray-400 mt-1">
						Take a clear photo of yourself holding your ID document
					</p>
				</div>

				<div class="bg-gray-800/50 rounded-lg p-4 mb-4">
					<p class="text-sm text-gray-300 mb-2">Tips for a good selfie:</p>
					<ul class="text-xs text-gray-400 space-y-1">
						<li>- Make sure your face is clearly visible</li>
						<li>- Hold your ID next to your face</li>
						<li>- Ensure good lighting</li>
						<li>- Remove sunglasses or hats</li>
					</ul>
				</div>

				<button
					type="button"
					onclick={() => selfieInput?.click()}
					class="w-full p-8 rounded-lg border-2 border-dashed transition-colors {selfieFile
						? 'border-green-500 bg-green-500/10'
						: 'border-gray-600 hover:border-gray-500 bg-gray-800/30'}"
				>
					{#if selfieFile}
						<div class="flex items-center justify-center gap-2 text-green-400">
							<CheckCircleSolid class="w-5 h-5" />
							<span class="text-sm">{selfieFile.name}</span>
						</div>
					{:else}
						<div class="flex flex-col items-center gap-2 text-gray-400">
							<UserSolid class="w-12 h-12" />
							<span class="text-sm">Click to upload selfie with ID</span>
						</div>
					{/if}
				</button>
				<input
					bind:this={selfieInput}
					type="file"
					accept="image/jpeg,image/png"
					onchange={(e) => handleFileChange(e, (f) => (selfieFile = f))}
					class="hidden"
				/>
			</div>
		{/if}

		<!-- Step 4: Proof of Address -->
		{#if step === 4}
			<div class="space-y-4">
				<div class="text-center mb-6">
					<div
						class="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center"
					>
						<UploadOutline class="w-8 h-8 text-orange-400" />
					</div>
					<h3 class="text-lg font-semibold text-white">Proof of Address</h3>
					<p class="text-sm text-gray-400 mt-1">Upload a document showing your current address</p>
				</div>

				<div class="bg-gray-800/50 rounded-lg p-4 mb-4">
					<p class="text-sm text-gray-300 mb-2">Accepted documents:</p>
					<ul class="text-xs text-gray-400 space-y-1">
						<li>- Utility bill (electricity, gas, water)</li>
						<li>- Bank statement</li>
						<li>- Government letter</li>
						<li>- Must be dated within the last 3 months</li>
					</ul>
				</div>

				<button
					type="button"
					onclick={() => proofInput?.click()}
					class="w-full p-8 rounded-lg border-2 border-dashed transition-colors {proofOfAddressFile
						? 'border-green-500 bg-green-500/10'
						: 'border-gray-600 hover:border-gray-500 bg-gray-800/30'}"
				>
					{#if proofOfAddressFile}
						<div class="flex items-center justify-center gap-2 text-green-400">
							<CheckCircleSolid class="w-5 h-5" />
							<span class="text-sm">{proofOfAddressFile.name}</span>
						</div>
					{:else}
						<div class="flex flex-col items-center gap-2 text-gray-400">
							<UploadOutline class="w-8 h-8" />
							<span class="text-sm">Click to upload proof of address</span>
						</div>
					{/if}
				</button>
				<input
					bind:this={proofInput}
					type="file"
					accept="image/jpeg,image/png,application/pdf"
					onchange={(e) => handleFileChange(e, (f) => (proofOfAddressFile = f))}
					class="hidden"
				/>
			</div>
		{/if}

		<!-- Step 5: Tax Information -->
		{#if step === 5}
			<div class="space-y-4">
				<div class="text-center mb-6">
					<h3 class="text-lg font-semibold text-white">Tax Information</h3>
					<p class="text-sm text-gray-400 mt-1">Required for tax reporting and payout processing</p>
				</div>

				<SearchableSelect
					bind:value={taxCountry}
					options={countryOptions}
					label="Tax Residence Country"
					placeholder="Select your tax residence..."
					required
				/>

				<Input
					bind:value={taxId}
					label="Tax Identification Number"
					placeholder="Enter your tax ID"
					required
					hint="This could be your SSN (US), TIN, or national tax ID"
				/>
			</div>
		{/if}

		<!-- Step 6: Review -->
		{#if step === 6}
			<div class="space-y-4">
				<div class="text-center mb-6">
					<div
						class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
					>
						<CheckCircleSolid class="w-8 h-8 text-green-400" />
					</div>
					<h3 class="text-lg font-semibold text-white">Review & Submit</h3>
					<p class="text-sm text-gray-400 mt-1">Please verify all information is correct</p>
				</div>

				<div class="bg-gray-800/50 rounded-lg p-4 space-y-3 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-400">ID Type</span>
						<span class="text-white">{getIdTypeLabel(idType)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-400">ID Number</span>
						<span class="text-white">{idNumber}</span>
					</div>
					<div class="border-t border-gray-700 my-2"></div>
					<div class="flex justify-between">
						<span class="text-gray-400">ID Front</span>
						<span class="text-green-400 flex items-center gap-1">
							<CheckCircleSolid class="w-4 h-4" /> Uploaded
						</span>
					</div>
					{#if idType !== 'passport'}
						<div class="flex justify-between">
							<span class="text-gray-400">ID Back</span>
							<span class="text-green-400 flex items-center gap-1">
								<CheckCircleSolid class="w-4 h-4" /> Uploaded
							</span>
						</div>
					{/if}
					<div class="flex justify-between">
						<span class="text-gray-400">Selfie</span>
						<span class="text-green-400 flex items-center gap-1">
							<CheckCircleSolid class="w-4 h-4" /> Uploaded
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-400">Proof of Address</span>
						<span class="text-green-400 flex items-center gap-1">
							<CheckCircleSolid class="w-4 h-4" /> Uploaded
						</span>
					</div>
					<div class="border-t border-gray-700 my-2"></div>
					<div class="flex justify-between">
						<span class="text-gray-400">Tax Country</span>
						<span class="text-white">{getCountryLabel(taxCountry)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-400">Tax ID</span>
						<span class="text-white">{taxId}</span>
					</div>
				</div>

				<div class="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
					<p class="text-sm text-orange-300">
						By submitting, you confirm that all documents and information are authentic and
						accurate. Providing false information may result in account suspension.
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
						(step === 2 && !isStep2Valid) ||
						(step === 3 && !isStep3Valid) ||
						(step === 4 && !isStep4Valid) ||
						(step === 5 && !isStep5Valid)}
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
