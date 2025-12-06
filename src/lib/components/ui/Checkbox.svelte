<script lang="ts">
import type { HTMLInputAttributes } from 'svelte/elements';

interface Props extends Omit<HTMLInputAttributes, 'type' | 'class'> {
	checked?: boolean;
	label?: string;
	class?: string;
}

let {
	checked = $bindable(false),
	label,
	class: className = '',
	...restProps
}: Props = $props();
</script>

<label class="flex items-center gap-2 cursor-pointer group {className}">
	<input
		type="checkbox"
		bind:checked
		class="w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer transition-colors"
		{...restProps}
	/>
	{#if label}
		<span class="text-sm text-gray-300 group-hover:text-white transition-colors select-none">
			{label}
		</span>
	{/if}
</label>
