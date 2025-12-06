<script lang="ts">
import type { Snippet } from 'svelte';

type Color = 'orange' | 'blue' | 'green' | 'red' | 'purple' | 'gray';

interface Props {
	color?: Color;
	size?: 'sm' | 'md';
	class?: string;
	children: Snippet;
}

const {
	color = 'gray',
	size = 'md',
	class: className = '',
	children,
}: Props = $props();

const colorClasses: Record<Color, string> = {
	orange: 'bg-orange-500/20 text-orange-400 ring-orange-500/30',
	blue: 'bg-blue-500/20 text-blue-400 ring-blue-500/30',
	green: 'bg-green-500/20 text-green-400 ring-green-500/30',
	red: 'bg-red-500/20 text-red-400 ring-red-500/30',
	purple: 'bg-purple-500/20 text-purple-400 ring-purple-500/30',
	gray: 'bg-gray-500/20 text-gray-400 ring-gray-500/30',
};

const sizeClasses = {
	sm: 'px-1.5 py-0.5 text-xs',
	md: 'px-2 py-1 text-xs',
};
</script>

<span class="inline-flex items-center font-medium rounded-md ring-1 ring-inset {colorClasses[color]} {sizeClasses[size]} {className}">
	{@render children()}
</span>
