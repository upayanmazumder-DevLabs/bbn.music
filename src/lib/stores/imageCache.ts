// OPFS (Origin Private File System) image cache
// Most modern approach for client-side binary storage

const ARTWORKS_DIR = 'artworks';

async function getArtworksDir() {
	const root = await navigator.storage.getDirectory();
	return root.getDirectoryHandle(ARTWORKS_DIR, { create: true });
}

export const imageCache = {
	async get(dropId: string): Promise<string | null> {
		try {
			const dir = await getArtworksDir();
			const fileHandle = await dir.getFileHandle(`${dropId}.bin`);
			const file = await fileHandle.getFile();
			return URL.createObjectURL(file);
		} catch {
			return null;
		}
	},

	async set(dropId: string, blob: Blob): Promise<void> {
		const dir = await getArtworksDir();
		const fileHandle = await dir.getFileHandle(`${dropId}.bin`, { create: true });
		const writable = await fileHandle.createWritable();
		await writable.write(blob);
		await writable.close();
	},

	async delete(dropId: string): Promise<void> {
		try {
			const dir = await getArtworksDir();
			await dir.removeEntry(`${dropId}.bin`);
		} catch {
			// File doesn't exist, ignore
		}
	},

	async clear(): Promise<void> {
		try {
			const root = await navigator.storage.getDirectory();
			await root.removeEntry(ARTWORKS_DIR, { recursive: true });
		} catch {
			// Directory doesn't exist, ignore
		}
	},

	async has(dropId: string): Promise<boolean> {
		try {
			const dir = await getArtworksDir();
			await dir.getFileHandle(`${dropId}.bin`);
			return true;
		} catch {
			return false;
		}
	},
};
