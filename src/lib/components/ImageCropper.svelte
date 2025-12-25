<script lang="ts">
	import { Modal, Button } from '$lib/components/ui';

	interface Props {
		open: boolean;
		imageFile: File | null;
		oncrop: (blob: Blob) => void;
		oncancel: () => void;
	}

	let { open = $bindable(), imageFile, oncrop, oncancel }: Props = $props();

	// Image element reference
	let imageEl: HTMLImageElement | undefined = $state();

	// Image dimensions
	let originalWidth = $state(0);
	let originalHeight = $state(0);
	let displayWidth = $state(0);
	let displayHeight = $state(0);

	// Crop box state (in display coordinates)
	let cropX = $state(0);
	let cropY = $state(0);
	let cropSize = $state(200);

	// Minimum crop size in display pixels
	const MIN_CROP_SIZE = 100;

	// Drag state
	let isDragging = $state(false);
	let isResizing = $state<'nw' | 'ne' | 'sw' | 'se' | null>(null);
	let dragStart = $state({ x: 0, y: 0, cropX: 0, cropY: 0, cropSize: 0 });

	// Image URL
	let imageUrl = $state('');

	// Track which file we've initialized for
	let initializedForFile: File | null = null;

	// Create object URL when file changes
	$effect(() => {
		if (imageFile) {
			const url = URL.createObjectURL(imageFile);
			imageUrl = url;

			// Reset initialization tracking when file changes
			if (imageFile !== initializedForFile) {
				initializedForFile = null;
			}

			return () => {
				URL.revokeObjectURL(url);
			};
		}
	});

	function handleImageLoad(e: Event) {
		const img = e.target as HTMLImageElement;
		originalWidth = img.naturalWidth;
		originalHeight = img.naturalHeight;
		displayWidth = img.width;
		displayHeight = img.height;

		// Only initialize if we haven't already for this file
		if (imageFile && imageFile !== initializedForFile) {
			initializedForFile = imageFile;
			initializeCrop();
		}
	}

	function initializeCrop() {
		// Initialize crop box centered, as large as possible while maintaining square
		const minDim = Math.min(displayWidth, displayHeight);
		cropSize = minDim * 0.8;
		cropX = (displayWidth - cropSize) / 2;
		cropY = (displayHeight - cropSize) / 2;
	}

	function handleMouseDown(e: MouseEvent, mode: 'drag' | 'nw' | 'ne' | 'sw' | 'se') {
		e.preventDefault();
		e.stopPropagation();

		if (mode === 'drag') {
			isDragging = true;
		} else {
			isResizing = mode;
		}

		dragStart = {
			x: e.clientX,
			y: e.clientY,
			cropX,
			cropY,
			cropSize,
		};

		// Add global listeners
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
	}

	function handleMouseMove(e: MouseEvent) {
		const dx = e.clientX - dragStart.x;
		const dy = e.clientY - dragStart.y;

		if (isDragging) {
			// Move crop box, constrain to image bounds
			let newX = dragStart.cropX + dx;
			let newY = dragStart.cropY + dy;

			newX = Math.max(0, Math.min(displayWidth - cropSize, newX));
			newY = Math.max(0, Math.min(displayHeight - cropSize, newY));

			cropX = newX;
			cropY = newY;
		} else if (isResizing) {
			// Calculate size change based on corner being dragged
			let delta: number;

			switch (isResizing) {
				case 'se':
					// Bottom-right: positive delta increases size
					delta = Math.max(dx, dy);
					break;
				case 'nw':
					// Top-left: negative delta increases size
					delta = -Math.min(dx, dy);
					break;
				case 'ne':
					// Top-right: x positive, y negative increases size
					delta = Math.max(dx, -dy);
					break;
				case 'sw':
					// Bottom-left: x negative, y positive increases size
					delta = Math.max(-dx, dy);
					break;
			}

			let newSize = dragStart.cropSize + delta;
			let newX = dragStart.cropX;
			let newY = dragStart.cropY;

			// Adjust position based on which corner is being dragged
			if (isResizing === 'nw' || isResizing === 'sw') {
				newX = dragStart.cropX - delta;
			}
			if (isResizing === 'nw' || isResizing === 'ne') {
				newY = dragStart.cropY - delta;
			}

			// Constrain to minimum size
			if (newSize < MIN_CROP_SIZE) {
				const diff = MIN_CROP_SIZE - newSize;
				newSize = MIN_CROP_SIZE;
				if (isResizing === 'nw' || isResizing === 'sw') {
					newX -= diff;
				}
				if (isResizing === 'nw' || isResizing === 'ne') {
					newY -= diff;
				}
			}

			// Constrain to image bounds
			if (newX < 0) {
				newSize += newX;
				newX = 0;
			}
			if (newY < 0) {
				newSize += newY;
				newY = 0;
			}
			if (newX + newSize > displayWidth) {
				newSize = displayWidth - newX;
			}
			if (newY + newSize > displayHeight) {
				newSize = displayHeight - newY;
			}

			// Ensure minimum size after all constraints
			if (newSize >= MIN_CROP_SIZE) {
				cropX = newX;
				cropY = newY;
				cropSize = newSize;
			}
		}
	}

	function handleMouseUp() {
		isDragging = false;
		isResizing = null;
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('mouseup', handleMouseUp);
	}

	function performCrop() {
		if (!imageEl) return;

		// Calculate scale between display and original
		const scale = originalWidth / displayWidth;

		// Calculate crop in original image coordinates
		const origCropX = cropX * scale;
		const origCropY = cropY * scale;
		const origCropSize = cropSize * scale;

		// Create canvas
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d')!;

		// Set canvas to crop size (preserves original resolution)
		canvas.width = origCropSize;
		canvas.height = origCropSize;

		// Draw cropped region
		ctx.drawImage(
			imageEl,
			origCropX,
			origCropY,
			origCropSize,
			origCropSize,
			0,
			0,
			origCropSize,
			origCropSize,
		);

		// Export as blob
		canvas.toBlob(
			(blob) => {
				if (blob) {
					oncrop(blob);
				}
			},
			'image/jpeg',
			0.95,
		);
	}

	function handleCancel() {
		oncancel();
	}

	// Calculate output dimensions for display
	const outputSize = $derived(Math.round((cropSize * originalWidth) / displayWidth));
</script>

<Modal bind:open title="Crop Artwork" size="lg" dismissible={false}>
	<div class="flex flex-col items-center gap-4">
		<p class="text-sm text-gray-400">
			Drag to position, use corners to resize. Artwork must be square (1:1 ratio).
		</p>

		<!-- Image container -->
		<div
			class="relative inline-block select-none"
			role="application"
			aria-label="Image cropper"
		>
			<!-- The image -->
			<img
				bind:this={imageEl}
				src={imageUrl}
				alt="Artwork to crop"
				class="max-h-[500px] max-w-full"
				style="display: block;"
				onload={handleImageLoad}
				draggable="false"
			/>

			<!-- Dark overlay - using clip-path to create the hole -->
			{#if displayWidth > 0}
				<div
					class="absolute inset-0 bg-black/60 pointer-events-none"
					style="clip-path: polygon(
						0% 0%, 0% 100%, {(cropX / displayWidth) * 100}% 100%,
						{(cropX / displayWidth) * 100}% {(cropY / displayHeight) * 100}%,
						{((cropX + cropSize) / displayWidth) * 100}% {(cropY / displayHeight) * 100}%,
						{((cropX + cropSize) / displayWidth) * 100}% {((cropY + cropSize) / displayHeight) * 100}%,
						{(cropX / displayWidth) * 100}% {((cropY + cropSize) / displayHeight) * 100}%,
						{(cropX / displayWidth) * 100}% 100%, 100% 100%, 100% 0%
					);"
				></div>

				<!-- Crop box border and drag area -->
				<div
					class="absolute border-2 border-white cursor-move"
					style="left: {cropX}px; top: {cropY}px; width: {cropSize}px; height: {cropSize}px;"
					role="button"
					tabindex="0"
					aria-label="Drag to move crop area"
					onmousedown={(e) => handleMouseDown(e, 'drag')}
				>
					<!-- Corner handles -->
					<!-- NW -->
					<div
						class="absolute -top-2 -left-2 w-4 h-4 bg-white rounded-full cursor-nw-resize shadow-lg"
						role="button"
						tabindex="0"
						aria-label="Resize top-left"
						onmousedown={(e) => handleMouseDown(e, 'nw')}
					></div>
					<!-- NE -->
					<div
						class="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full cursor-ne-resize shadow-lg"
						role="button"
						tabindex="0"
						aria-label="Resize top-right"
						onmousedown={(e) => handleMouseDown(e, 'ne')}
					></div>
					<!-- SW -->
					<div
						class="absolute -bottom-2 -left-2 w-4 h-4 bg-white rounded-full cursor-sw-resize shadow-lg"
						role="button"
						tabindex="0"
						aria-label="Resize bottom-left"
						onmousedown={(e) => handleMouseDown(e, 'sw')}
					></div>
					<!-- SE -->
					<div
						class="absolute -bottom-2 -right-2 w-4 h-4 bg-white rounded-full cursor-se-resize shadow-lg"
						role="button"
						tabindex="0"
						aria-label="Resize bottom-right"
						onmousedown={(e) => handleMouseDown(e, 'se')}
					></div>

					<!-- Grid lines for composition -->
					<div class="absolute inset-0 pointer-events-none">
						<div class="absolute left-1/3 top-0 bottom-0 w-px bg-white/30"></div>
						<div class="absolute left-2/3 top-0 bottom-0 w-px bg-white/30"></div>
						<div class="absolute top-1/3 left-0 right-0 h-px bg-white/30"></div>
						<div class="absolute top-2/3 left-0 right-0 h-px bg-white/30"></div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Size indicator -->
		{#if outputSize > 0}
			<p class="text-sm text-gray-400">
				Output size: <span class="font-medium text-white">{outputSize} × {outputSize}px</span>
				{#if outputSize < 3000}
					<span class="text-yellow-400 ml-2">(Recommended: 3000×3000px)</span>
				{/if}
			</p>
		{/if}
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={handleCancel}>Cancel</Button>
		<Button onclick={performCrop}>Crop & Upload</Button>
	{/snippet}
</Modal>
