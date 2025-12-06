<script lang="ts">
import { toast } from '$lib/stores/toast';
import { fly, fade } from 'svelte/transition';
import {
	CheckCircleSolid,
	ExclamationCircleOutline,
	InfoCircleSolid,
	CloseOutline,
} from 'flowbite-svelte-icons';

const typeConfig = {
	success: {
		icon: CheckCircleSolid,
		bgColor: 'bg-green-500/10',
		borderColor: 'border-green-500',
		textColor: 'text-green-400',
		iconBg: 'bg-green-500/20',
	},
	error: {
		icon: ExclamationCircleOutline,
		bgColor: 'bg-red-500/10',
		borderColor: 'border-red-500',
		textColor: 'text-red-400',
		iconBg: 'bg-red-500/20',
	},
	warning: {
		icon: ExclamationCircleOutline,
		bgColor: 'bg-yellow-500/10',
		borderColor: 'border-yellow-500',
		textColor: 'text-yellow-400',
		iconBg: 'bg-yellow-500/20',
	},
	info: {
		icon: InfoCircleSolid,
		bgColor: 'bg-blue-500/10',
		borderColor: 'border-blue-500',
		textColor: 'text-blue-400',
		iconBg: 'bg-blue-500/20',
	},
};
</script>

<div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-md">
	{#each $toast as item (item.id)}
		{@const config = typeConfig[item.type]}
		{@const Icon = config.icon}
		<div
			transition:fly={{ x: 300, duration: 300 }}
			class="flex items-start gap-3 p-4 rounded-lg border {config.bgColor} {config.borderColor} backdrop-blur-sm shadow-xl"
		>
			<div class="flex-shrink-0 {config.iconBg} rounded-lg p-2">
				<Icon class="w-5 h-5 {config.textColor}" />
			</div>
			<p class="flex-1 text-white text-sm leading-relaxed">{item.message}</p>
			<button
				onclick={() => toast.dismiss(item.id)}
				class="flex-shrink-0 p-1 text-gray-400 hover:text-white transition-colors rounded"
				aria-label="Dismiss"
			>
				<CloseOutline class="w-4 h-4" />
			</button>
		</div>
	{/each}
</div>
