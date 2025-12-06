<script lang="ts">
	import { Heading } from '$lib/components/ui';
</script>

<svelte:head>
	<title>Accessibility Statement - bbn.music</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
	<Heading tag="h1" class="text-white">Accessibility Statement</Heading>

	<div class="prose prose-invert max-w-none text-gray-300">
		<p>
			BBN Music GmbH is committed to making its website accessible in accordance with the
			Barrierefreiheitsstärkungsgesetz (BFSG) implementing EU Directive 2019/882 (European
			Accessibility Act).
		</p>

		<section class="mt-8">
			<Heading tag="h2" class="text-white text-xl font-bold">Conformity Status</Heading>
			<p class="mt-4">
				This website is <strong class="text-white">fully conformant</strong> with WCAG 2.1 Level AA.
			</p>
		</section>

		<section class="mt-8">
			<Heading tag="h2" class="text-white text-xl font-bold">Accessibility Features</Heading>
			<p class="mt-4">This website includes the following accessibility features:</p>
			<ul class="list-disc list-inside mt-2 space-y-2">
				<li>Skip navigation link to main content</li>
				<li>Semantic HTML structure with proper headings</li>
				<li>ARIA labels on interactive elements</li>
				<li>Keyboard navigation support throughout</li>
				<li>Sufficient color contrast ratios</li>
				<li>Form inputs with associated labels and error messages</li>
				<li>Focus indicators on all interactive elements</li>
			</ul>
		</section>

		<section class="mt-8">
			<Heading tag="h2" class="text-white text-xl font-bold">Preparation of this Statement</Heading>
			<p class="mt-4">This statement was prepared on December 6, 2024.</p>
			<p>The assessment was carried out through self-evaluation.</p>
			<p>This statement was last reviewed on December 6, 2024.</p>
		</section>

		<section class="mt-8">
			<Heading tag="h2" class="text-white text-xl font-bold">Feedback and Contact</Heading>
			<p class="mt-4">
				If you notice any accessibility barriers on our website, or if you require information in an
				accessible format, please contact us:
			</p>
			<div class="mt-4 p-4 bg-gray-800/50 rounded-lg">
				<p>
					<strong class="text-white">Email:</strong>
					<a href="mailto:support@bbn.music" class="text-purple-400 hover:text-purple-300">
						support@bbn.music
					</a>
				</p>
				<p class="mt-2">
					<strong class="text-white">Phone:</strong> +49 171 7525811
				</p>
				<p class="mt-2">
					<strong class="text-white">Address:</strong><br />
					BBN Music GmbH<br />
					Rosa-Luxemburg-Str. 37<br />
					14482 Potsdam, Germany
				</p>
			</div>
			<p class="mt-4">We will respond to your inquiry as soon as possible.</p>
		</section>

		<section class="mt-8">
			<Heading tag="h2" class="text-white text-xl font-bold">Enforcement Procedure</Heading>
			<p class="mt-4">
				If you have contacted us regarding accessibility issues and are not satisfied with our
				response, you have the right to contact the competent enforcement body.
			</p>
			<p class="mt-4">
				In Germany, you can contact the Federal Agency for Accessibility
				(Bundesfachstelle Barrierefreiheit):
			</p>
			<div class="mt-4 p-4 bg-gray-800/50 rounded-lg">
				<p><strong class="text-white">Bundesfachstelle Barrierefreiheit</strong></p>
				<p class="mt-2">
					<a
						href="https://www.bundesfachstelle-barrierefreiheit.de"
						target="_blank"
						rel="noopener noreferrer"
						class="text-purple-400 hover:text-purple-300"
					>
						www.bundesfachstelle-barrierefreiheit.de
					</a>
				</p>
			</div>
		</section>

		<section class="mt-8">
			<Heading tag="h2" class="text-white text-xl font-bold">Technical Specifications</Heading>
			<p class="mt-4">
				Accessibility of this website relies on the following technologies to work with your
				browser and any assistive technologies or plugins installed on your computer:
			</p>
			<ul class="list-disc list-inside mt-2 space-y-1">
				<li>HTML</li>
				<li>WAI-ARIA</li>
				<li>CSS</li>
				<li>JavaScript</li>
			</ul>
			<p class="mt-4">These technologies are relied upon for conformance with WCAG 2.1 Level AA.</p>
		</section>
	</div>
</div>
