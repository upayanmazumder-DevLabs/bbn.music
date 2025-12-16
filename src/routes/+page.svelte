<script lang="ts">
	import { Button } from '$lib/components/ui';
	import { CheckCircleSolid, GlobeSolid, ChartPieSolid, InboxSolid } from 'flowbite-svelte-icons';

	// Platform logos for the carousel
	const platforms = [
		{ name: 'Spotify', logo: '/landing/spotify.svg' },
		{ name: 'Apple Music', logo: '/landing/apple.svg' },
		{ name: 'YouTube', logo: '/landing/youtube.svg' },
		{ name: 'Deezer', logo: '/landing/deezer.svg' },
		{ name: 'Tidal', logo: '/landing/tidal.svg' },
		{ name: 'TikTok', logo: '/landing/tiktok.svg' },
		{ name: 'Instagram', logo: '/landing/instagram.svg' },
		{ name: 'Facebook', logo: '/landing/facebook.svg' },
		{ name: 'Pandora', logo: '/landing/pandora.svg' },
	];

	const freePlanFeatures = [
		'Unlimited Drops',
		'Unlimited Artists',
		'Reach 52 Stores',
		'Reach 195 Countries',
		'No Payment Needed',
	];

	const paidPlanFeatures = [
		'Unlimited Drops',
		'Unlimited Artists',
		'Reach 52 Stores',
		'Reach 195 Countries',
		'No Revenue Cut',
		'Fully Customizable',
		'Priority Queue',
		'Priority Support',
	];

	const keyFeatures = [
		{
			icon: ChartPieSolid,
			title: 'Lowest Cut',
			description: 'With our free plan, we only take a 3% cut of your revenue.',
			color: 'bg-red-500',
		},
		{
			icon: GlobeSolid,
			title: 'Global',
			description: 'We support all major and many smaller stores, without any extra cost for you.',
			color: 'bg-green-500',
		},
		{
			icon: InboxSolid,
			title: 'Unlimited',
			description: 'No hard limits. You can manage as many Drops and Artists as you want.',
			color: 'bg-indigo-500',
		},
	];

	const testimonials = [
		{
			quote:
				'The thing I love the most is the flexibility and the contactability of the entire bbn.music team. It is also just great to develop concepts and plans with motivated and very friendly people.',
			name: 'Redz',
			avatar: '/landing/redz.jpg',
			link: 'https://open.spotify.com/artist/2V0Z2KWSK8h7ttrKOuteuk',
		},
		{
			quote:
				'There is pretty much no other digital distributor that offers more and at the same time, works so closely with artists and who artists are so valued by and feel so understood by.',
			name: 'Criticz',
			avatar: '/landing/criticz.jpg',
			link: 'https://open.spotify.com/artist/4ZlkFIOahypZ3Xi8SzeNaQ',
		},
	];
</script>

<svelte:head>
	<title>bbn.music - Drop in with your Audience</title>
</svelte:head>

<div class="space-y-24 -mt-8">
	<!-- Hero Section - Full viewport width -->
	<section class="hero-section relative min-h-[70vh] flex items-center overflow-hidden">
		<!-- Background with blur effect - extends beyond viewport edges -->
		<div class="hero-bg" aria-hidden="true"></div>

		<div class="relative z-10 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
			<h1 class="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
				Drop in with<br />your Audience
			</h1>
			<p class="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl font-medium leading-relaxed">
				bbn.music, your gateway to unlimited music distribution at a low cost. Maximize your reach
				without limits. Join us and let the world hear your music.
			</p>
			<Button
				href="/music"
				size="lg"
				class="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transition-all"
			>
				Drop your Music
			</Button>
		</div>
	</section>

	<!-- Pricing Section -->
	<section>
		<p class="text-center text-gray-500 font-semibold text-sm mb-10 tracking-wide">
			Our pricing plan to disrupt the Market:
		</p>

		<div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
			<!-- Free Plan -->
			<div
				class="rounded-2xl p-8 bg-gradient-to-br from-white to-white dark:from-orange-900/20 dark:to-orange-800/10 border border-gray-200 dark:border-orange-500/20 shadow-lg dark:shadow-none"
			>
				<span
					class="inline-block px-3 py-1 rounded-md bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold text-sm mb-6"
				>
					Free Plan
				</span>

				<div class="mb-4">
					<p class="text-gray-500 dark:text-gray-400 text-lg font-semibold">Your Revenue</p>
					<p class="text-7xl font-black text-gray-900 dark:text-white">97%</p>
				</div>

				<p class="text-3xl font-bold text-gray-400 dark:text-white/60 mb-8">No Extra Cost</p>

				<ul class="space-y-4 mb-8">
					{#each freePlanFeatures as feature}
						<li class="flex items-center gap-3 text-gray-900 dark:text-white text-lg font-semibold">
							<CheckCircleSolid class="w-6 h-6 text-orange-500" />
							{feature}
						</li>
					{/each}
				</ul>

				<Button
					href="/music"
					class="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 text-lg"
				>
					Drop Now!
				</Button>
			</div>

			<!-- Paid Plan -->
			<div class="rounded-2xl p-8 bg-gradient-to-br from-orange-600 to-orange-700">
				<span
					class="inline-block px-3 py-1 rounded-md bg-black/30 text-white font-bold text-sm mb-6"
				>
					Paid Plan
				</span>

				<div class="mb-4">
					<p class="text-white/80 text-lg font-semibold">Your Revenue</p>
					<p class="text-7xl font-black text-white">100%</p>
				</div>

				<p class="text-3xl font-bold text-white/60 mb-8">1€ per Year</p>

				<ul class="space-y-4 mb-8">
					{#each paidPlanFeatures as feature}
						<li class="flex items-center gap-3 text-white text-lg font-semibold">
							<CheckCircleSolid class="w-6 h-6 text-white" />
							{feature}
						</li>
					{/each}
				</ul>

				<Button
					disabled
					class="w-full bg-white/20 text-white font-bold py-4 text-lg cursor-not-allowed"
				>
					Coming Soon
				</Button>
			</div>
		</div>
	</section>

	<!-- Platform Logos Carousel -->
	<section>
		<p class="text-center text-gray-500 dark:text-gray-400 font-semibold text-lg mb-8">
			Let your fans enjoy your Drops where they feel home.
		</p>

		<div class="space-y-8">
			<!-- First carousel - scrolling right -->
			<div class="carousel-container">
				<div class="flex gap-16 animate-scroll-reverse">
					{#each [...platforms, ...platforms, ...platforms, ...platforms] as platform}
						<div class="flex-shrink-0 w-24 h-24 flex items-center justify-center">
							<img
								src={platform.logo}
								alt={platform.name}
								class="w-24 h-24 max-w-24 max-h-24 object-contain platform-logo"
							/>
						</div>
					{/each}
				</div>
			</div>

			<!-- Second carousel - scrolling left -->
			<div class="carousel-container">
				<div class="flex gap-16 animate-scroll">
					{#each [...platforms, ...platforms, ...platforms, ...platforms] as platform}
						<div class="flex-shrink-0 w-24 h-24 flex items-center justify-center">
							<img
								src={platform.logo}
								alt={platform.name}
								class="w-24 h-24 max-w-24 max-h-24 object-contain platform-logo"
							/>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- Make it. Drop it. -->
	<section class="text-center py-12">
		<h2 class="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-4">Make it. Drop it.</h2>
		<p class="text-xl text-gray-500 dark:text-gray-400 font-semibold">
			Distributing music should be accessible without any credit card.
		</p>
	</section>

	<!-- Why bbn.music -->
	<section>
		<div
			class="rounded-2xl p-8 md:p-12 bg-gradient-to-br from-white to-white dark:from-orange-900/20 dark:to-orange-800/10 border border-gray-200 dark:border-orange-500/20 shadow-lg dark:shadow-none"
		>
			<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
				<h2 class="text-3xl font-bold text-gray-900 dark:text-white">Why bbn.music?</h2>
				<Button
					href="/music"
					class="w-fit bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-full px-6"
				>
					Drop your Music
				</Button>
			</div>

			<div class="grid md:grid-cols-3 gap-8">
				{#each keyFeatures as feature}
					<div class="space-y-4">
						<div class="{feature.color} w-12 h-12 rounded-xl flex items-center justify-center">
							<feature.icon class="w-6 h-6 text-white" />
						</div>
						<h3 class="text-xl font-bold text-gray-900 dark:text-white">{feature.title}</h3>
						<p class="text-gray-500 dark:text-gray-400">{feature.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Testimonials -->
	<section>
		<div class="text-center mb-12">
			<h2 class="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-4">Loved by Artists</h2>
			<p class="text-xl text-gray-500 dark:text-gray-400 font-semibold">See how our Artists value bbn.music</p>
		</div>

		<div class="max-w-3xl mx-auto space-y-12">
			{#each testimonials as testimonial, i}
				<div class={i % 2 === 0 ? 'text-left' : 'text-right ml-auto'}>
					<p class="text-lg md:text-xl text-gray-900 dark:text-white font-semibold italic mb-6 leading-relaxed">
						"{testimonial.quote}"
					</p>
					<a
						href={testimonial.link}
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-4 {i % 2 === 0 ? '' : 'flex-row-reverse'} group"
					>
						<img
							src={testimonial.avatar}
							alt={testimonial.name}
							class="w-10 h-10 rounded-full object-cover group-hover:ring-2 group-hover:ring-orange-500 transition-all"
						/>
						<span class="text-xl font-bold text-gray-900 dark:text-white group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">
							{testimonial.name}
						</span>
					</a>
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	/* Hero section - full viewport width */
	.hero-section {
		position: relative;
		margin-left: calc(-50vw + 50%);
		margin-right: calc(-50vw + 50%);
		width: 100vw;
		isolation: isolate;
		overflow: visible;
	}

	.hero-bg {
		position: absolute;
		/* Extend up behind the navbar (h-16 = 4rem) */
		top: -4rem;
		left: 0;
		right: 0;
		/* Extend the background well below the section, plus the 4rem we moved up */
		height: calc(100% + 16rem);
		background: url('/landing/background.png') no-repeat center top;
		background-size: cover;
		z-index: -1;
		/* Mask the image to fade to transparent at the bottom */
		-webkit-mask-image: linear-gradient(to bottom, black 0%, black 40%, transparent 100%);
		mask-image: linear-gradient(to bottom, black 0%, black 40%, transparent 100%);
	}

	/* Dark overlay for text readability */
	.hero-bg::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgba(17, 24, 39, 0.4) 0%,
			rgba(17, 24, 39, 0.5) 50%,
			rgba(17, 24, 39, 0.6) 100%
		);
	}

	/* Carousel with mask fade effect */
	.carousel-container {
		mask-image: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0) 0%,
			#fff 50%,
			rgba(255, 255, 255, 0) 100%
		);
		overflow: hidden;
	}

	@keyframes scroll {
		0% {
			transform: translateX(0);
		}
		100% {
			/* (96px + 64px gap) * 9 icons */
			transform: translateX(calc(-160px * 9));
		}
	}

	@keyframes scroll-reverse {
		0% {
			transform: translateX(calc(-160px * 9));
		}
		100% {
			transform: translateX(0);
		}
	}

	.animate-scroll {
		animation: scroll 30s linear infinite;
	}

	.animate-scroll-reverse {
		animation: scroll-reverse 30s linear infinite;
	}

	.platform-logo {
		filter: brightness(0);
	}

	@media (prefers-color-scheme: dark) {
		.platform-logo {
			filter: brightness(0) invert(1);
		}
	}
</style>
