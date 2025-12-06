<script lang="ts">
import type { HTMLTextareaAttributes } from 'svelte/elements';

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
}: Props & Omit<HTMLTextareaAttributes, 'class'> = $props();

const textareaId =
	restProps.id ?? `textarea-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="w-full">
	{#if label}
		<label for={textareaId} class="block text-sm font-medium text-white mb-2">
			{label}
			{#if restProps.required}
				<span class="text-orange-400">*</span>
			{/if}
		</label>
	{/if}

	<textarea
		id={textareaId}
		bind:value
		class="
			w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 resize-none
			bg-gray-900/50 border transition-all duration-200
			focus:outline-none focus:ring-2 focus:ring-offset-0
			disabled:opacity-50 disabled:cursor-not-allowed
			{error
				? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
				: 'border-gray-600 hover:border-gray-500 focus:border-orange-500 focus:ring-orange-500/20'}
			{className}
		"
		{...restProps}
	></textarea>

	{#if error}
		<p class="mt-1.5 text-sm text-red-400">{error}</p>
	{:else if hint}
		<p class="mt-1.5 text-sm text-gray-500">{hint}</p>
	{/if}
</div>
