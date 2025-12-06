<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'info' | 'success' | 'warning' | 'error';

	interface Props {
		variant?: Variant;
		title?: string;
		dismissible?: boolean;
		class?: string;
		children: Snippet;
		ondismiss?: () => void;
	}

	const {
		variant = 'info',
		title,
		dismissible = false,
		class: className = '',
		children,
		ondismiss,
	}: Props = $props();

	let visible = $state(true);

	const variantClasses: Record<Variant, string> = {
		info: 'bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400',
		success: 'bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400',
		warning: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-600 dark:text-yellow-400',
		error: 'bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400',
	};

	const iconPaths: Record<Variant, string> = {
		info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
		warning:
			'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
	};

	function dismiss() {
		visible = false;
		ondismiss?.();
	}
</script>

{#if visible}
	<div class="rounded-lg border p-4 {variantClasses[variant]} {className}" role="alert">
		<div class="flex items-start gap-3">
			<svg
				class="w-5 h-5 flex-shrink-0 mt-0.5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d={iconPaths[variant]}
				/>
			</svg>

			<div class="flex-1 min-w-0">
				{#if title}
					<p class="font-semibold">{title}</p>
				{/if}
				<div class="text-sm {title ? 'mt-1 opacity-90' : ''}">
					{@render children()}
				</div>
			</div>

			{#if dismissible}
				<button
					type="button"
					aria-label="Dismiss alert"
					class="flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors"
					onclick={dismiss}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			{/if}
		</div>
	</div>
{/if}
