<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Props {
		value?: string;
		label?: string;
		error?: string;
		hint?: string;
		class?: string;
		children: Snippet;
	}

	let {
		value = $bindable(''),
		label,
		error,
		hint,
		class: className = '',
		children,
		...restProps
	}: Props & Omit<HTMLSelectAttributes, 'class'> = $props();

	const selectId = restProps.id ?? `select-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="w-full">
	{#if label}
		<label for={selectId} class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
			{label}
			{#if restProps.required}
				<span class="text-orange-500 dark:text-orange-400">*</span>
			{/if}
		</label>
	{/if}

	<div class="relative">
		<select
			id={selectId}
			bind:value
			class="
				w-full px-4 py-2.5 rounded-lg text-gray-900 dark:text-white appearance-none cursor-pointer
				bg-white dark:bg-gray-900/50 border transition-all duration-200
				focus:outline-none focus:ring-2 focus:ring-offset-0
				disabled:opacity-50 disabled:cursor-not-allowed
				{error
				? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
				: 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-orange-500 focus:ring-orange-500/20'}
				{className}
			"
			{...restProps}
		>
			{@render children()}
		</select>

		<!-- Custom dropdown arrow -->
		<div
			class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>
	</div>

	{#if error}
		<p class="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
	{:else if hint}
		<p class="mt-1.5 text-sm text-gray-500">{hint}</p>
	{/if}
</div>
