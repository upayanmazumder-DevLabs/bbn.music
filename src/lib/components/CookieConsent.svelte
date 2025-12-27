<script lang="ts">
	import { browser } from '$app/environment';
	import { cookieConsent } from '$lib/stores/cookieConsent.svelte';
	import { acceptTracking, declineTracking } from '$lib/analytics/posthog';

	// Only show banner after hydration to prevent flash
	let mounted = $state(false);
	$effect(() => {
		mounted = true;
	});

	function accept() {
		cookieConsent.accept();
		acceptTracking();
	}

	function decline() {
		cookieConsent.decline();
		declineTracking();
	}
</script>

{#if browser && mounted && cookieConsent.state === 'pending'}
	<div
		class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-900 border-t border-gray-700 shadow-lg"
	>
		<div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="text-sm text-gray-300 text-center sm:text-left">
				<p>
					Help us make bbn.music better! We use privacy-friendly analytics to understand what
					features you love. No ads, no data selling.
				</p>
				<a href="/privacy" class="text-orange-400 hover:text-orange-300 underline text-xs"
					>Privacy Policy</a
				>
			</div>
			<div class="flex items-center gap-3 flex-shrink-0">
				<!-- Equal styling for both buttons per German TTDSG requirements -->
				<!-- Accept on right follows natural UI convention (primary action placement) -->
				<button
					onclick={decline}
					class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-600 text-white bg-gray-800 hover:bg-gray-700 transition-colors"
				>
					No Thanks
				</button>
				<button
					onclick={accept}
					class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-600 text-white bg-gray-800 hover:bg-gray-700 transition-colors"
				>
					Sure, Help Out
				</button>
			</div>
		</div>
	</div>
{/if}
