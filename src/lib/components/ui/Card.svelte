<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'default' | 'glass' | 'outline';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
		children: Snippet;
	}

	const { variant = 'default', padding = 'md', class: className = '', children }: Props = $props();

	const variantClasses = {
		default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
		glass: 'bg-gradient-to-br from-white/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur border-gray-200/50 dark:border-gray-700/50',
		outline: 'bg-transparent border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
	};

	const paddingClasses = {
		none: '',
		sm: 'p-4',
		md: 'p-6',
		lg: 'p-8',
	};
</script>

<div
	class="rounded-2xl border transition-colors {variantClasses[variant]} {paddingClasses[
		padding
	]} {className}"
>
	{@render children()}
</div>
