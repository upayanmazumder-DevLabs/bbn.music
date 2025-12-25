import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

// Light KYC/KYB - Required before creating first drop
export type VerificationType = 'individual' | 'business';

export interface LightKycData {
	verificationType: VerificationType;
	// Personal info (always required)
	firstName: string;
	lastName: string;
	dateOfBirth: string; // YYYY-MM-DD format
	country: string;
	address: {
		street: string;
		city: string;
		postalCode: string;
		state?: string;
	};
	// Business info (only for KYB)
	business?: {
		companyName: string;
		registrationNumber: string;
		vatNumber?: string;
	};
	completedAt?: string;
}

// Hard KYC - Required before first payout
export interface HardKycData {
	idType: 'passport' | 'drivers_license' | 'national_id';
	idNumber: string;
	idFrontUploaded: boolean;
	idBackUploaded: boolean;
	selfieUploaded: boolean;
	proofOfAddressUploaded: boolean;
	taxCountry: string;
	taxId: string;
	completedAt?: string;
}

export type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

export interface KycState {
	lightKyc: {
		status: KycStatus;
		data: LightKycData | null;
		rejectionReason?: string;
	};
	hardKyc: {
		status: KycStatus;
		data: HardKycData | null;
		rejectionReason?: string;
	};
}

const STORAGE_KEY = 'bbn-kyc-state';

function getInitialState(): KycState {
	if (browser) {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				return JSON.parse(stored);
			} catch {
				// Invalid stored data
			}
		}
	}
	return {
		lightKyc: {
			status: 'not_started',
			data: null,
		},
		hardKyc: {
			status: 'not_started',
			data: null,
		},
	};
}

function createKycStore() {
	const { subscribe, set, update } = writable<KycState>(getInitialState());

	// Persist to localStorage whenever state changes
	if (browser) {
		subscribe((state) => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		});
	}

	return {
		subscribe,

		// Check if light KYC is completed
		isLightKycComplete(): boolean {
			const state = get({ subscribe });
			return state.lightKyc.status === 'approved';
		},

		// Check if hard KYC is completed
		isHardKycComplete(): boolean {
			const state = get({ subscribe });
			return state.hardKyc.status === 'approved';
		},

		// Submit light KYC data (mock - instantly approves for now)
		submitLightKyc(data: LightKycData) {
			update((state) => ({
				...state,
				lightKyc: {
					status: 'approved', // In production, this would be 'pending' until backend approves
					data: {
						...data,
						completedAt: new Date().toISOString(),
					},
				},
			}));
		},

		// Submit hard KYC data (mock - instantly approves for now)
		submitHardKyc(data: HardKycData) {
			update((state) => ({
				...state,
				hardKyc: {
					status: 'approved', // In production, this would be 'pending' until backend approves
					data: {
						...data,
						completedAt: new Date().toISOString(),
					},
				},
			}));
		},

		// Reset KYC state (for testing)
		reset() {
			const initial: KycState = {
				lightKyc: { status: 'not_started', data: null },
				hardKyc: { status: 'not_started', data: null },
			};
			set(initial);
		},

		// Set light KYC status (for admin/backend simulation)
		setLightKycStatus(status: KycStatus, rejectionReason?: string) {
			update((state) => ({
				...state,
				lightKyc: {
					...state.lightKyc,
					status,
					rejectionReason,
				},
			}));
		},

		// Set hard KYC status (for admin/backend simulation)
		setHardKycStatus(status: KycStatus, rejectionReason?: string) {
			update((state) => ({
				...state,
				hardKyc: {
					...state.hardKyc,
					status,
					rejectionReason,
				},
			}));
		},
	};
}

export const kyc = createKycStore();
