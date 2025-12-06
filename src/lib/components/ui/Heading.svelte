<script lang="ts">
import type { Snippet } from 'svelte';

type Tag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

interface Props {
	tag?: Tag;
	class?: string;
	children: Snippet;
}

const { tag = 'h2', class: className = '', children }: Props = $props();

const tagClasses: Record<Tag, string> = {
	h1: 'text-4xl font-bold text-white',
	h2: 'text-3xl font-bold text-white',
	h3: 'text-2xl font-semibold text-white',
	h4: 'text-xl font-semibold text-white',
	h5: 'text-lg font-semibold text-white',
	h6: 'text-base font-semibold text-white',
};

const classes = $derived(`${tagClasses[tag]} ${className}`);
</script>

<svelte:element this={tag} class={classes}>
	{@render children()}
</svelte:element>
