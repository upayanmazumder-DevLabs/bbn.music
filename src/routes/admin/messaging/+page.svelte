<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Card, Badge, Spinner } from '$lib/components/ui';
	import {
		getConversationsByMessaging,
		getIdByConversationsByMessaging,
		putSendByConversationsByMessaging,
	} from '$lib/api/sdk.gen';
	import { getAuthHeaders } from '$lib/apiClient';
	import type { Conversation, Message, Platform } from '$lib/api/types.gen';
	import {
		EnvelopeSolid,
		UserOutline,
		PaperPlaneOutline,
		CheckCircleSolid,
		ClockOutline,
		ExclamationCircleOutline,
		ChevronLeftOutline,
	} from 'flowbite-svelte-icons';

	// Conversation with messages and user info from the detail endpoint
	type ConversationDetail = Conversation & {
		messages: Message[];
		userInfo?: {
			username: string;
			email?: string;
			phone?: string;
		};
	};

	let conversations = $state<Conversation[]>([]);
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let hasMore = $state(true);

	// Selected conversation
	let selectedConversation = $state<ConversationDetail | null>(null);
	let loadingConversation = $state(false);

	// New message
	let newMessage = $state('');
	let sendingMessage = $state(false);

	const LIMIT = 20;

	onMount(async () => {
		await loadConversations();
	});

	async function loadConversations(lastId?: string) {
		if (!lastId) {
			loading = true;
			error = null;
		} else {
			loadingMore = true;
		}

		try {
			const response = await getConversationsByMessaging({
				query: { _limit: LIMIT, _lastId: lastId },
				headers: getAuthHeaders(),
			});

			if (response.data) {
				const newConversations = response.data as Conversation[];
				if (!lastId) {
					conversations = newConversations;
				} else {
					conversations = [...conversations, ...newConversations];
				}
				hasMore = newConversations.length === LIMIT;
			}
		} catch (e: any) {
			error = e?.error?.message || e?.message || 'Failed to load conversations';
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	async function selectConversation(conversation: Conversation) {
		loadingConversation = true;

		try {
			const response = await getIdByConversationsByMessaging({
				path: { id: conversation._id },
				headers: getAuthHeaders(),
			});

			if (response.data) {
				selectedConversation = response.data as ConversationDetail;
			}
		} catch (e: any) {
			console.error('Failed to load conversation:', e);
		} finally {
			loadingConversation = false;
		}
	}

	async function sendMessage() {
		if (!selectedConversation || !newMessage.trim()) return;

		sendingMessage = true;

		try {
			await putSendByConversationsByMessaging({
				body: {
					conversationId: selectedConversation._id,
					content: newMessage.trim(),
				},
				headers: getAuthHeaders(),
			});

			// Reload conversation to get the new message
			await selectConversation(selectedConversation);
			newMessage = '';
		} catch (e: any) {
			console.error('Failed to send message:', e);
		} finally {
			sendingMessage = false;
		}
	}

	function getPlatformColor(platform: Platform): 'green' | 'blue' | 'purple' | 'gray' {
		switch (platform) {
			case 'whatsapp':
				return 'green';
			case 'email':
				return 'blue';
			case 'rcs':
				return 'purple';
			case 'sms':
				return 'gray';
			default:
				return 'gray';
		}
	}

	function formatTime(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function formatMessageTime(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function loadMore() {
		const lastConversation = conversations[conversations.length - 1];
		if (lastConversation) {
			loadConversations(lastConversation._id);
		}
	}
</script>

<div class="h-[calc(100vh-8rem)]">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-white">Messaging</h1>
			<p class="text-gray-400 text-sm">Manage user conversations and support requests</p>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<Spinner size="lg" color="primary" />
		</div>
	{:else if error}
		<Card variant="default" padding="lg">
			<p class="text-red-400">{error}</p>
		</Card>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-4rem)]">
			<!-- Conversations List -->
			<div
				class="lg:col-span-1 bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden flex flex-col"
			>
				<div class="p-4 border-b border-gray-700">
					<h2 class="text-lg font-semibold text-white flex items-center gap-2">
						<EnvelopeSolid class="w-5 h-5 text-orange-400" />
						Conversations
						{#if conversations.length > 0}
							<span class="text-sm text-gray-400">({conversations.length})</span>
						{/if}
					</h2>
				</div>

				<div class="flex-1 overflow-y-auto">
					{#if conversations.length === 0}
						<div class="p-8 text-center text-gray-500">No conversations found</div>
					{:else}
						{#each conversations as conversation}
							<button
								onclick={() => selectConversation(conversation)}
								class="w-full p-4 text-left border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors {selectedConversation?._id ===
								conversation._id
									? 'bg-gray-700/50'
									: ''}"
							>
								<div class="flex items-start justify-between gap-2 mb-2">
									<Badge color={getPlatformColor(conversation.platform)} size="sm">
										{conversation.platform}
									</Badge>
									<span class="text-xs text-gray-500">
										{formatTime(conversation.lastMessageAt || conversation.updatedAt)}
									</span>
								</div>
								<p class="text-white text-sm font-medium truncate">
									{conversation.subject || 'No subject'}
								</p>
								{#if conversation.user}
									<p class="text-gray-400 text-xs truncate mt-1">
										User: {conversation.user}
									</p>
								{/if}
							</button>
						{/each}

						{#if hasMore}
							<div class="p-4">
								<Button
									onclick={loadMore}
									variant="ghost"
									size="sm"
									class="w-full"
									disabled={loadingMore}
								>
									{loadingMore ? 'Loading...' : 'Load more'}
								</Button>
							</div>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Conversation Detail -->
			<div
				class="lg:col-span-2 bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden flex flex-col"
			>
				{#if loadingConversation}
					<div class="flex-1 flex items-center justify-center">
						<Spinner size="lg" color="primary" />
					</div>
				{:else if selectedConversation}
					<!-- Header -->
					<div class="p-4 border-b border-gray-700 flex items-center justify-between">
						<div class="flex items-center gap-4">
							<button
								onclick={() => (selectedConversation = null)}
								class="lg:hidden p-2 hover:bg-gray-700 rounded-lg transition-colors"
							>
								<ChevronLeftOutline class="w-5 h-5 text-gray-400" />
							</button>
							<div
								class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"
							>
								<UserOutline class="w-5 h-5 text-orange-400" />
							</div>
							<div>
								<p class="text-white font-medium">
									{selectedConversation.userInfo?.username || 'Unknown User'}
								</p>
								<p class="text-gray-400 text-sm">
									{selectedConversation.userInfo?.email ||
										selectedConversation.userInfo?.phone ||
										selectedConversation.user ||
										'No contact info'}
								</p>
							</div>
						</div>
						<Badge color={getPlatformColor(selectedConversation.platform)}>
							{selectedConversation.platform}
						</Badge>
					</div>

					<!-- Messages -->
					<div class="flex-1 overflow-y-auto p-4 space-y-4">
						{#if selectedConversation.messages.length === 0}
							<div class="text-center text-gray-500 py-8">No messages yet</div>
						{:else}
							{#each selectedConversation.messages as message}
								<div
									class="flex {message.direction === 'outbound'
										? 'justify-end'
										: 'justify-start'}"
								>
									<div
										class="max-w-[70%] rounded-2xl px-4 py-2 {message.direction === 'outbound'
											? 'bg-orange-500 text-white'
											: 'bg-gray-700 text-white'}"
									>
										<p class="text-sm whitespace-pre-wrap">{message.content}</p>
										<div
											class="flex items-center gap-2 mt-1 {message.direction === 'outbound'
												? 'justify-end'
												: 'justify-start'}"
										>
											<span
												class="text-xs {message.direction === 'outbound'
													? 'text-orange-200'
													: 'text-gray-400'}"
											>
												{formatMessageTime(message.sentAt)}
											</span>
											{#if message.direction === 'outbound'}
												{#if message.readAt}
													<CheckCircleSolid class="w-3 h-3 text-orange-200" />
												{:else if message.deliveredAt}
													<CheckCircleSolid class="w-3 h-3 text-orange-300" />
												{:else if message.error}
													<ExclamationCircleOutline class="w-3 h-3 text-red-300" />
												{:else}
													<ClockOutline class="w-3 h-3 text-orange-300" />
												{/if}
											{/if}
										</div>
									</div>
								</div>
							{/each}
						{/if}
					</div>

					<!-- Message Input -->
					<div class="p-4 border-t border-gray-700">
						<form
							onsubmit={(e) => {
								e.preventDefault();
								sendMessage();
							}}
							class="flex gap-3"
						>
							<input
								type="text"
								bind:value={newMessage}
								placeholder="Type a message..."
								class="flex-1 px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
							/>
							<Button type="submit" disabled={!newMessage.trim() || sendingMessage}>
								{#if sendingMessage}
									<Spinner size="sm" color="white" />
								{:else}
									<PaperPlaneOutline class="w-5 h-5" />
								{/if}
							</Button>
						</form>
					</div>
				{:else}
					<div class="flex-1 flex items-center justify-center">
						<div class="text-center text-gray-500">
							<EnvelopeSolid class="w-12 h-12 mx-auto mb-4 opacity-50" />
							<p>Select a conversation to view messages</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
