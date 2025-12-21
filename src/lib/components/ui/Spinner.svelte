<script lang="ts">
	type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
	type Color = 'primary' | 'white' | 'gray' | 'red';

	interface Props {
		size?: Size;
		color?: Color;
		class?: string;
	}

	const { size = 'md', color = 'primary', class: className = '' }: Props = $props();

	const sizeClasses: Record<Size, string> = {
		xs: 'w-3 h-3 border-2',
		sm: 'w-4 h-4 border-2',
		md: 'w-6 h-6 border-2',
		lg: 'w-8 h-8 border-2',
		xl: 'w-12 h-12 border-4',
	};

	const colorClasses: Record<Color, string> = {
		primary: 'border-orange-500/30 border-t-orange-500',
		white: 'border-white/30 border-t-white',
		gray: 'border-gray-400/30 border-t-gray-400',
		red: 'border-red-500/30 border-t-red-500',
	};
</script>

<div
	class="rounded-full animate-spin {sizeClasses[size]} {colorClasses[color]} {className}"
	role="status"
	aria-label="Loading"
></div>
