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
		default: 'bg-gray-800 border-gray-700',
		glass: 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur border-gray-700/50',
		outline: 'bg-transparent border-gray-700 hover:border-gray-600',
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
