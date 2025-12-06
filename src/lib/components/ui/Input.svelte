<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props {
		value?: string;
		label?: string;
		error?: string;
		hint?: string;
		class?: string;
	}

	let {
		value = $bindable(''),
		label,
		error,
		hint,
		class: className = '',
		...restProps
	}: Props & Omit<HTMLInputAttributes, 'class'> = $props();

	const inputId = restProps.id ?? `input-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="w-full">
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
			{label}
			{#if restProps.required}
				<span class="text-orange-500 dark:text-orange-400">*</span>
			{/if}
		</label>
	{/if}

	<input
		id={inputId}
		bind:value
		class="
			w-full px-4 py-2.5 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
			bg-white dark:bg-gray-900/50 border transition-all duration-200
			focus:outline-none focus:ring-2 focus:ring-offset-0
			disabled:opacity-50 disabled:cursor-not-allowed
			{error
			? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
			: 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-orange-500 focus:ring-orange-500/20'}
			{className}
		"
		{...restProps}
	/>

	{#if error}
		<p class="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
	{:else if hint}
		<p class="mt-1.5 text-sm text-gray-500">{hint}</p>
	{/if}
</div>
