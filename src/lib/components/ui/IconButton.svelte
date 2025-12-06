<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'ghost' | 'subtle';
	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		variant?: Variant;
		size?: Size;
		class?: string;
		children: Snippet;
		onclick?: (e: MouseEvent) => void;
	}

	const {
		variant = 'ghost',
		size = 'md',
		class: className = '',
		children,
		onclick,
		...restProps
	}: Props & Omit<HTMLButtonAttributes, 'class'> = $props();

	const variantClasses: Record<Variant, string> = {
		ghost: 'text-gray-400 hover:text-white hover:bg-gray-700',
		subtle: 'text-gray-400 hover:text-orange-400 hover:bg-orange-500/10',
	};

	const sizeClasses: Record<Size, string> = {
		sm: 'p-1.5',
		md: 'p-2',
		lg: 'p-2.5',
	};
</script>

<button
	type="button"
	class="rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed {variantClasses[
		variant
	]} {sizeClasses[size]} {className}"
	{onclick}
	{...restProps}
>
	{@render children()}
</button>
