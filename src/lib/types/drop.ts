import { z } from 'zod';

export const artistTypes = [
	'PRIMARY',
	'FEATURING',
	'SONGWRITER',
	'PRODUCER',
] as const;
export type ArtistType = (typeof artistTypes)[number];

export const artistRefSchema = z.object({
	type: z.enum(artistTypes),
	_id: z.string().nullable(),
	name: z.string().optional(),
});

export type ArtistRef = z.infer<typeof artistRefSchema>;

export const songSchema = z.object({
	_id: z.string(),
	title: z.string().min(1).max(100),
	artists: artistRefSchema.array(),
	duration: z.number().optional(),
	instrumental: z.boolean().default(false),
	explicit: z.boolean().default(false),
	primaryGenre: z.string().optional(),
	secondaryGenre: z.string().optional(),
	isrc: z.string().optional(),
	file: z.string().optional(),
});

export type Song = z.infer<typeof songSchema>;

export const dropSchema = z.object({
	_id: z.string(),
	title: z.string().min(1).max(100),
	release: z.string().regex(/\d{4}-\d{2}-\d{2}/),
	language: z.string(),
	artists: artistRefSchema.array(),
	primaryGenre: z.string(),
	secondaryGenre: z.string(),
	gtin: z.string().optional(),
	compositionCopyright: z.string().min(1).max(100),
	soundRecordingCopyright: z.string().min(1).max(100),
	artwork: z.string().optional(),
	songs: songSchema.array(),
	comments: z.string().optional(),
	type: z
		.enum([
			'UNSUBMITTED',
			'UNDER_REVIEW',
			'PUBLISHED',
			'PUBLISHING',
			'PRIVATE',
			'TAKEDOWN_REQUESTED',
			'REVIEW_DECLINED',
		])
		.default('UNSUBMITTED'),
});

export type Drop = z.infer<typeof dropSchema>;

// Validation schemas for each step
export const stepOneSchema = z.object({
	title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
	release: z.string().regex(/\d{4}-\d{2}-\d{2}/, 'Invalid date format'),
	language: z.string().min(1, 'Language is required'),
	primaryGenre: z.string().min(1, 'Primary genre is required'),
	secondaryGenre: z.string().min(1, 'Secondary genre is required'),
	artists: artistRefSchema
		.array()
		.min(1, 'At least one artist is required')
		.refine(
			(arr) => arr.some((a) => a.type === 'PRIMARY' && (a.name || a._id)),
			'At least one primary artist with a name is required',
		),
	compositionCopyright: z
		.string()
		.min(1, 'Composition copyright is required')
		.max(100),
	soundRecordingCopyright: z
		.string()
		.min(1, 'Sound recording copyright is required')
		.max(100),
	gtin: z.string().optional(),
});

export const stepTwoSchema = stepOneSchema.extend({
	artwork: z.string().min(1, 'Artwork is required'),
});

export const stepThreeSchema = stepTwoSchema.extend({
	songs: songSchema.array().min(1, 'At least one song is required'),
});

export interface DropFormState {
	_id: string;
	title: string;
	release: string;
	language: string;
	artists: ArtistRef[];
	primaryGenre: string;
	secondaryGenre: string;
	gtin: string;
	compositionCopyright: string;
	soundRecordingCopyright: string;
	artwork: string;
	artworkPreview: string;
	songs: Song[];
	comments: string;
	currentStep: number;
	errors: Record<string, string>;
	isLoading: boolean;
}

export function createInitialDropState(id: string): DropFormState {
	return {
		_id: id,
		title: '',
		release: '',
		language: 'en',
		artists: [],
		primaryGenre: '',
		secondaryGenre: '',
		gtin: '',
		compositionCopyright: 'bbn.music',
		soundRecordingCopyright: 'bbn.music',
		artwork: '',
		artworkPreview: '',
		songs: [],
		comments: '',
		currentStep: 1,
		errors: {},
		isLoading: false,
	};
}
