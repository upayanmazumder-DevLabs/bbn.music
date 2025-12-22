<script lang="ts">
	import { Button } from '$lib/components/ui';
	import { cookieConsent } from '$lib/stores/cookieConsent.svelte';
	import { initPostHog } from '$lib/analytics/posthog';

	function accept() {
		cookieConsent.accept();
		initPostHog();
	}

	function decline() {
		cookieConsent.decline();
	}
</script>

{#if cookieConsent.state === 'pending'}
	<div
		class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-900 border-t border-gray-700 shadow-lg"
	>
		<div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
			<p class="text-sm text-gray-300 text-center sm:text-left">
				We use cookies to analyze site usage and improve your experience.
				<a href="/privacy" class="text-orange-400 hover:text-orange-300 underline">Learn more</a>
			</p>
			<div class="flex items-center gap-3 flex-shrink-0">
				<Button variant="secondary" size="sm" onclick={decline}>Decline</Button>
				<Button size="sm" onclick={accept}>Accept</Button>
			</div>
		</div>
	</div>
{/if}
