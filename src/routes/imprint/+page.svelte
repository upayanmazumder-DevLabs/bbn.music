<script lang="ts">
	import { Heading } from '$lib/components/ui';
</script>

<svelte:head>
	<title>Imprint - bbn.music</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<Heading tag="h1">Imprint</Heading>

	<div class="prose prose-gray dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
			<div class="font-semibold text-gray-900 dark:text-white">Phone:</div>
			<div>+49 171 7525811</div>

			<div class="font-semibold text-gray-900 dark:text-white">Email:</div>
			<div>
				<a
					href="mailto:support@bbn.music"
					class="text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300"
					>support@bbn.music</a
				>
			</div>

			<div class="font-semibold text-gray-900 dark:text-white">Internet:</div>
			<div>
				<a
					href="https://bbn.music"
					class="text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300"
					>bbn.music</a
				>
			</div>

			<div class="font-semibold text-gray-900 dark:text-white">Address:</div>
			<div class="whitespace-pre-line">
				BBN Music GmbH Rosa-Luxemburg-Str. 37 14482 Potsdam Germany
			</div>

			<div class="font-semibold text-gray-900 dark:text-white">Commercial register:</div>
			<div class="whitespace-pre-line">Potsdam Local Court HRB 39134 P</div>

			<div class="font-semibold text-gray-900 dark:text-white">EUID:</div>
			<div>DEG1312.HRB39134P</div>

			<div class="font-semibold text-gray-900 dark:text-white">VAT ID:</div>
			<div>DE370194161</div>

			<div class="font-semibold text-gray-900 dark:text-white">Managing Directors:</div>
			<div class="whitespace-pre-line">Maximilian Arzberger Gregor Bigalke</div>

			<div class="font-semibold text-gray-900 dark:text-white">Responsible for content:</div>
			<div class="whitespace-pre-line">
				Maximilian Arzberger, Gregor Bigalke Rosa-Luxemburg-Str. 37 14482 Potsdam Germany
			</div>
		</div>

		<section class="mt-8">
			<Heading tag="h2" class="text-xl font-bold">Alternative dispute resolution</Heading>
			<p class="mt-4">
				The European Commission provides a platform for the out-of-court resolution of disputes (ODR
				platform), which can be viewed under <a
					href="https://ec.europa.eu/odr"
					target="_blank"
					rel="noopener noreferrer"
					class="text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300"
					>ec.europa.eu/odr</a
				>
			</p>
			<p>
				We are not willing or obliged to participate in dispute resolution proceedings before a
				consumer arbitration board.
			</p>
		</section>
	</div>
</div>
