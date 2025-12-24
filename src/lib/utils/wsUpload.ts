import { getBaseUrl } from '$lib/apiClient';
import { auth } from '$lib/stores/auth';

export interface WsUploadOptions {
	/** The API path (e.g., 'api/@bbn/music/drops/123/upload') */
	path: string;
	/** The file to upload */
	file: File;
	/** Optional progress callback (0-100) */
	onProgress?: (percent: number) => void;
}

/**
 * Upload a file via WebSocket using the standard BBN protocol.
 * @returns The response data from the server (usually the uploaded file ID)
 */
export async function uploadViaWebSocket(options: WsUploadOptions): Promise<string> {
	const { path, file, onProgress } = options;

	return new Promise((resolve, reject) => {
		const baseUrl = getBaseUrl();
		const wsUrl = `${baseUrl.replace('https:', 'wss:').replace('http:', 'ws:')}${path}`;
		const ws = new WebSocket(wsUrl);

		const reader = file.stream().getReader();
		let uploadedBytes = 0;
		const totalBytes = file.size;

		ws.onopen = () => {
			const token = auth.getStoredToken();
			if (!token) {
				reject(new Error('No authentication token'));
				ws.close();
				return;
			}
			ws.send(`JWT ${token}`);
		};

		ws.onmessage = async ({ data }) => {
			if (data.startsWith('failed')) {
				ws.close();
				reject(new Error(data));
			} else if (data === 'file') {
				ws.send(`file ${JSON.stringify({ filename: file.name, type: file.type })}`);
			} else if (data === 'next') {
				const chunk = await reader.read();

				if (chunk.value) {
					ws.send(chunk.value);
					uploadedBytes += chunk.value.length;
					if (onProgress && totalBytes > 0) {
						onProgress(Math.round((uploadedBytes / totalBytes) * 100));
					}
				}

				if (chunk.done) {
					ws.send('end');
				}
			} else {
				// Upload complete - data contains the response (usually file ID)
				reader.releaseLock();
				ws.close();
				resolve(data);
			}
		};

		ws.onerror = () => {
			reader.releaseLock();
			reject(new Error('WebSocket connection error'));
		};

		ws.onclose = (event) => {
			if (!event.wasClean && uploadedBytes === 0) {
				reject(new Error('Connection closed unexpectedly'));
			}
		};
	});
}
