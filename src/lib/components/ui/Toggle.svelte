<script lang="ts">
type Color = 'orange' | 'blue' | 'green' | 'red';

interface Props {
	checked?: boolean;
	label?: string;
	color?: Color;
	disabled?: boolean;
	class?: string;
}

let {
	checked = $bindable(false),
	label,
	color = 'orange',
	disabled = false,
	class: className = '',
}: Props = $props();

const colorClasses: Record<Color, string> = {
	orange: 'peer-checked:bg-orange-500',
	blue: 'peer-checked:bg-blue-500',
	green: 'peer-checked:bg-green-500',
	red: 'peer-checked:bg-red-500',
};

const toggleId = `toggle-${Math.random().toString(36).slice(2, 9)}`;
</script>

<label for={toggleId} class="inline-flex items-center gap-3 cursor-pointer select-none {disabled ? 'opacity-50 cursor-not-allowed' : ''} {className}">
	<div class="relative">
		<input
			id={toggleId}
			type="checkbox"
			bind:checked
			{disabled}
			class="sr-only peer"
		/>
		<div class="w-11 h-6 bg-gray-700 rounded-full peer {colorClasses[color]} transition-colors duration-200"></div>
		<div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-5 shadow-sm"></div>
	</div>
	{#if label}
		<span class="text-sm font-medium text-white">{label}</span>
	{/if}
</label>
