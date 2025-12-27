<script lang="ts">
	import {
		BellSolid,
		BellOutline,
		CheckCircleSolid,
		ExclamationCircleOutline,
		InfoCircleSolid,
		EnvelopeSolid,
	} from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';
	import { scale, fly } from 'svelte/transition';
	import {
		getNotificationsByMessaging,
		patchIdByNotificationsByMessaging,
		putReadAllByNotificationsByMessaging,
	} from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import type { Notification, MessageEvent } from '$lib/api/types.gen';
	import { extractErrorMessage } from '$lib/utils/extractError';

	let showDropdown = $state(false);
	let unreadCount = $state(0);
	let notifications = $state<Notification[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.notification-container')) {
			showDropdown = false;
		}
	}

	async function loadNotifications() {
		loading = true;
		error = null;
		try {
			const response = await getNotificationsByMessaging({
				headers: getAuthHeaders(),
				query: { _limit: 20 },
			});
			if (response.data) {
				notifications = response.data as Notification[];
				unreadCount = notifications.filter((n) => !n.read).length;
			}
		} catch (e: unknown) {
			error = extractErrorMessage(e, 'Failed to load notifications');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		loadNotifications();

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	function toggleDropdown() {
		showDropdown = !showDropdown;
	}

	async function markAsRead(id: string) {
		const notification = notifications.find((n) => n._id === id);
		if (notification && !notification.read) {
			// Optimistic update
			notification.read = true;
			unreadCount = Math.max(0, unreadCount - 1);

			try {
				await patchIdByNotificationsByMessaging({
					path: { id },
					body: { read: true },
					headers: getAuthHeaders(),
				});
			} catch {
				// Revert on error
				notification.read = false;
				unreadCount++;
			}
		}
	}

	async function markAllAsRead() {
		// Optimistic update
		const previousStates = notifications.map((n) => ({ id: n._id, read: n.read }));
		notifications.forEach((n) => (n.read = true));
		unreadCount = 0;

		try {
			await putReadAllByNotificationsByMessaging({
				headers: getAuthHeaders(),
			});
		} catch {
			// Revert on error
			previousStates.forEach((state) => {
				const notification = notifications.find((n) => n._id === state.id);
				if (notification) notification.read = state.read;
			});
			unreadCount = notifications.filter((n) => !n.read).length;
		}
	}

	function formatTimestamp(id: string): string {
		// Extract timestamp from MongoDB ObjectId (first 8 chars are hex timestamp)
		try {
			const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
			const date = new Date(timestamp);
			const now = new Date();
			const diff = now.getTime() - date.getTime();
			const minutes = Math.floor(diff / 60000);
			const hours = Math.floor(diff / 3600000);
			const days = Math.floor(diff / 86400000);

			if (minutes < 1) return 'Just now';
			if (minutes < 60) return `${minutes}m ago`;
			if (hours < 24) return `${hours}h ago`;
			if (days < 7) return `${days}d ago`;
			return date.toLocaleDateString();
		} catch {
			return '';
		}
	}

	// Map MessageEvent to display type
	function getNotificationType(event: MessageEvent): 'info' | 'success' | 'warning' | 'error' {
		switch (event) {
			case 'drop-approved':
			case 'drop-published':
			case 'payout-processed':
				return 'success';
			case 'drop-declined':
				return 'error';
			case 'drop-update':
			case 'royalty-payout':
				return 'warning';
			case 'newsletter':
			case 'message-from-support':
			default:
				return 'info';
		}
	}

	const typeConfig = {
		info: {
			icon: InfoCircleSolid,
			color: 'text-blue-600 dark:text-blue-400',
			bg: 'bg-blue-500/10',
			border: 'border-blue-500/20',
		},
		success: {
			icon: CheckCircleSolid,
			color: 'text-green-600 dark:text-green-400',
			bg: 'bg-green-500/10',
			border: 'border-green-500/20',
		},
		warning: {
			icon: ExclamationCircleOutline,
			color: 'text-yellow-600 dark:text-yellow-400',
			bg: 'bg-yellow-500/10',
			border: 'border-yellow-500/20',
		},
		error: {
			icon: ExclamationCircleOutline,
			color: 'text-red-600 dark:text-red-400',
			bg: 'bg-red-500/10',
			border: 'border-red-500/20',
		},
	};
</script>

<div class="notification-container relative">
	<!-- Notification Bell Button -->
	<button
		onclick={toggleDropdown}
		class="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all duration-200 group"
		aria-label="Notifications"
		aria-expanded={showDropdown}
	>
		{#if unreadCount > 0}
			<BellSolid class="w-6 h-6 text-orange-500 group-hover:scale-110 transition-transform" />
			<span
				class="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-orange-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg animate-pulse"
				transition:scale={{ duration: 200 }}
			>
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		{:else}
			<BellOutline class="w-6 h-6 group-hover:scale-110 transition-transform" />
		{/if}
	</button>

	<!-- Dropdown -->
	{#if showDropdown}
		<div
			class="absolute right-0 mt-3 w-[420px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
			transition:fly={{ y: -10, duration: 250, opacity: 0 }}
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700"
			>
				<div class="flex items-center gap-2">
					<BellSolid class="w-5 h-5 text-orange-500 dark:text-orange-400" />
					<h3 class="text-lg font-bold text-gray-900 dark:text-white">Notifications</h3>
					{#if unreadCount > 0}
						<span
							class="px-2 py-0.5 text-xs font-semibold bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full"
						>
							{unreadCount} new
						</span>
					{/if}
				</div>
				{#if notifications.length > 0 && unreadCount > 0}
					<button
						onclick={markAllAsRead}
						class="text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300 transition-colors px-3 py-1 rounded-lg hover:bg-orange-500/10"
					>
						Mark all read
					</button>
				{/if}
			</div>

			<!-- Notifications List -->
			<div class="max-h-[480px] overflow-y-auto custom-scrollbar">
				{#if loading}
					<div class="p-12 text-center">
						<div
							class="w-8 h-8 mx-auto mb-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"
						></div>
						<p class="text-gray-500 text-sm">Loading notifications...</p>
					</div>
				{:else if error}
					<div class="p-12 text-center">
						<div
							class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-200 to-red-300 dark:from-red-700 dark:to-red-800 rounded-2xl flex items-center justify-center"
						>
							<ExclamationCircleOutline class="w-8 h-8 text-red-500" />
						</div>
						<p class="text-gray-600 dark:text-gray-400 font-medium mb-1">Failed to load</p>
						<p class="text-sm text-gray-500">{error}</p>
						<button
							onclick={loadNotifications}
							class="mt-3 text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-500"
						>
							Try again
						</button>
					</div>
				{:else if notifications.length === 0}
					<div class="p-12 text-center">
						<div
							class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center"
						>
							<BellOutline class="w-8 h-8 text-gray-500" />
						</div>
						<p class="text-gray-600 dark:text-gray-400 font-medium mb-1">All caught up!</p>
						<p class="text-sm text-gray-500">No new notifications</p>
					</div>
				{:else}
					{#each notifications as notification (notification._id)}
						{@const notificationType = getNotificationType(notification.event)}
						{@const config = typeConfig[notificationType]}
						{@const Icon = config.icon}
						<div class="relative group" transition:fly={{ x: 20, duration: 200 }}>
							<button
								onclick={() => markAsRead(notification._id)}
								class="w-full p-4 text-left transition-all duration-200 border-b border-gray-200 dark:border-gray-700 last:border-b-0 {notification.read
									? 'hover:bg-black/5 dark:hover:bg-white/5'
									: 'bg-orange-500/5 hover:bg-orange-500/10'}"
							>
								<div class="flex items-start gap-3">
									<!-- Type icon -->
									<div
										class="flex-shrink-0 mt-0.5 {config.bg} {config.border} border rounded-lg p-2"
									>
										<Icon class="w-4 h-4 {config.color}" />
									</div>

									<!-- Content -->
									<div class="flex-1 min-w-0">
										<div class="flex items-start justify-between gap-2 mb-1">
											<h4 class="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
												{notification.title}
											</h4>
											<span class="text-xs text-gray-500 whitespace-nowrap font-medium">
												{formatTimestamp(notification._id)}
											</span>
										</div>
										<p
											class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2"
										>
											{notification.content}
										</p>
									</div>

									<!-- Unread indicator -->
									{#if !notification.read}
										<div class="flex-shrink-0 mt-2">
											<div
												class="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50"
											></div>
										</div>
									{/if}
								</div>
							</button>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.custom-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
	}

	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}
</style>
