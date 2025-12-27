<script lang="ts">
	import { Heading } from '$lib/components/ui';
	import { ChevronDownOutline } from 'flowbite-svelte-icons';

	const sections = [
		{ num: 1, title: 'Geltungsbereich und Begriffsbestimmungen' },
		{ num: 2, title: 'Vertragsgegenstand und Leistungen' },
		{ num: 3, title: 'Vertragsschluss und Kontoerstellung' },
		{ num: 4, title: 'Pflichten des Nutzers' },
		{ num: 5, title: 'Vergütung und Preise' },
		{ num: 6, title: 'Abrechnung und Auszahlungen' },
		{ num: 7, title: 'Widerrufsrecht für Verbraucher' },
		{ num: 8, title: 'Vertragslaufzeit und Kündigung' },
		{ num: 9, title: 'Änderungen dieser AGB' },
		{ num: 10, title: 'Haftung von BBN Music' },
		{ num: 11, title: 'Rechte Dritter und Freistellung' },
		{ num: 12, title: 'Datenschutz' },
		{ num: 13, title: 'Kontakt und Streitbeilegung' },
		{ num: 14, title: 'Schlussbestimmungen' },
	];
</script>

<svelte:head>
	<title>Allgemeine Geschäftsbedingungen (AGB) - bbn.music</title>
</svelte:head>

<div class="max-w-6xl mx-auto">
	<!-- Header -->
	<div class="mb-8">
		<Heading tag="h1" class="text-gray-900 dark:text-white mb-2"
			>Allgemeine Geschäftsbedingungen (AGB)</Heading
		>
		<p class="text-gray-500 dark:text-gray-400">
			für die Nutzung der Plattform bbn.music der BBN Music GmbH
		</p>
		<p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Stand: Februar 2024</p>
	</div>

	<div class="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
		<!-- Table of Contents - Sticky Sidebar -->
		<aside class="hidden lg:block">
			<div class="sticky top-24">
				<div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
					<h2 class="font-semibold text-gray-900 dark:text-white text-sm mb-3">Inhaltsverzeichnis</h2>
					<nav class="space-y-1">
						{#each sections as section}
							<a
								href="#section-{section.num}"
								class="block text-sm py-1.5 px-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							>
								<span class="font-medium">{section.num}.</span>
								{section.title}
							</a>
						{/each}
					</nav>
				</div>
			</div>
		</aside>

		<!-- Main Content -->
		<main class="space-y-6">
			<!-- Mobile TOC Toggle -->
			<details class="lg:hidden bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
				<summary class="p-4 cursor-pointer font-medium text-gray-900 dark:text-white flex items-center justify-between">
					<span>Inhaltsverzeichnis</span>
					<ChevronDownOutline class="w-5 h-5" />
				</summary>
				<nav class="px-4 pb-4 space-y-1">
					{#each sections as section}
						<a
							href="#section-{section.num}"
							class="block text-sm py-1.5 px-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
						>
							<span class="font-medium">{section.num}.</span>
							{section.title}
						</a>
					{/each}
				</nav>
			</details>

			<!-- Section 1 -->
			<section id="section-1" class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="p-4 border-b border-gray-100 dark:border-gray-700/50">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">1.</span> Geltungsbereich und Begriffsbestimmungen
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<p>
						<strong class="text-gray-900 dark:text-white">1.1 Anwendungsbereich:</strong> Diese AGB regeln die Geschäftsbeziehung zwischen der
						BBN Music GmbH (nachfolgend „BBN Music", „wir" oder „uns") und den Nutzerinnen und Nutzern
						der Online-Plattform bbn.music (nachfolgend „Nutzer"). Die AGB gelten für alle Verträge, die
						über die Plattform zwischen BBN Music und den Nutzern geschlossen werden, unabhängig davon,
						ob der Nutzer Verbraucher oder Unternehmer ist. Individuell getroffene Vereinbarungen mit dem
						Nutzer (einschließlich Nebenabreden und Sonderkonditionen, z. B. für Großkunden wie
						Musiklabels) haben stets Vorrang vor diesen AGB, soweit sie von diesen Bestimmungen
						abweichen.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">1.2 Verbraucher und Unternehmer:</strong> Verbraucher im Sinne von § 13 BGB ist jede
						natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer
						gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden können.
						Unternehmer im Sinne von § 14 BGB ist eine natürliche oder juristische Person oder
						rechtsfähige Personengesellschaft, die bei Abschluss eines Vertrags in Ausübung ihrer
						gewerblichen oder selbständigen beruflichen Tätigkeit handelt. In diesen AGB werden
						Verbraucher und Unternehmer einheitlich als „Nutzer" bezeichnet, soweit nicht ausdrücklich
						zwischen ihnen unterschieden wird.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">1.3 Sprachen und Hinweise:</strong> Vertragssprache ist Deutsch. Rechtliche Hinweise
						in diesen AGB, die sich speziell auf Verbraucher beziehen, gelten nicht für Nutzer, die
						Unternehmer sind, und umgekehrt, sofern nicht ausdrücklich angegeben. BBN Music erkennt
						abweichende allgemeine Geschäftsbedingungen des Nutzers nicht an, es sei denn, wir stimmen
						ihrer Geltung ausdrücklich schriftlich zu.
					</p>
				</div>
			</section>

			<!-- Section 2 -->
			<section id="section-2" class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="p-4 border-b border-gray-100 dark:border-gray-700/50">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">2.</span> Vertragsgegenstand und Leistungen von BBN Music
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<p>
						<strong class="text-gray-900 dark:text-white">2.1 Plattform und Servicebeschreibung:</strong> BBN Music betreibt unter der Adresse
						bbn.music eine Online-Plattform, über welche Rechteinhaber von Musik (z. B. Musikerinnen,
						Labels, andere Inhaber von Urheber- und Leistungsschutzrechten) ihre Musikinhalte digital
						vertreiben lassen können. Dies umfasst insbesondere die Distribution von Audioaufnahmen
						(nebst zugehörigen Metadaten, Cover-Artwork usw.) an verschiedene digitale Musikdienste wie
						Streaming- und Download-Plattformen (z. B. Spotify, Apple Music, YouTube Music, Amazon,
						Deezer und weitere – nachfolgend gemeinsam „Stores" genannt).
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">2.2 Leistungsumfang:</strong> BBN Music stellt dem Nutzer ein persönliches
						Online-Konto (Nutzerkonto) bereit. Die Hauptleistungen umfassen:
					</p>
					<ul class="list-none space-y-2 ml-4">
						<li class="flex gap-2">
							<span class="text-orange-500">•</span>
							<span><strong>Upload & Verwaltung:</strong> Hochladen von Audio-Dateien samt Metadaten und Coverbildern</span>
						</li>
						<li class="flex gap-2">
							<span class="text-orange-500">•</span>
							<span><strong>Digitale Distribution:</strong> Übermittlung an ausgewählte Stores</span>
						</li>
						<li class="flex gap-2">
							<span class="text-orange-500">•</span>
							<span><strong>Identifikationscodes:</strong> ISRC, UPC/EAN und Katalognummern</span>
						</li>
						<li class="flex gap-2">
							<span class="text-orange-500">•</span>
							<span><strong>Updates & Takedowns:</strong> Änderungen und Entfernungen auf Wunsch</span>
						</li>
						<li class="flex gap-2">
							<span class="text-orange-500">•</span>
							<span><strong>Reporting:</strong> Nutzungs- und Verkaufsdaten einsehen</span>
						</li>
						<li class="flex gap-2">
							<span class="text-orange-500">•</span>
							<span><strong>Abrechnung & Auszahlung:</strong> Einnahmen verwalten und auszahlen</span>
						</li>
					</ul>
					<p>
						<strong class="text-gray-900 dark:text-white">2.3 Keine Erfolgsgarantie:</strong> BBN Music schuldet dem Nutzer nicht den Erfolg
						einer bestimmten Vermarktung. Insbesondere übernimmt BBN Music keine Gewähr für die Aufnahme
						oder dauerhafte Verfügbarkeit der Inhalte in bestimmten Stores.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">2.4 Qualitätsprüfung:</strong> BBN Music ist berechtigt, aber nicht verpflichtet,
						die vom Nutzer eingestellten Inhalte vor der Distribution auf offensichtliche Rechtsverstöße
						oder Verstöße gegen Vorgaben der Stores zu prüfen.
					</p>
				</div>
			</section>

			<!-- Section 3 -->
			<section id="section-3" class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="p-4 border-b border-gray-100 dark:border-gray-700/50">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">3.</span> Vertragsschluss und Kontoerstellung
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<p>
						<strong class="text-gray-900 dark:text-white">3.1 Registrierung:</strong> Um die Dienste von BBN Music nutzen zu können, muss der
						Nutzer zunächst ein Nutzerkonto auf der Plattform bbn.music erstellen. Die Registrierung
						erfordert die Angabe einer gültigen E-Mail-Adresse und eines Passworts sowie – je nach
						gewähltem Modell – weiterer Informationen.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">3.2 Vertragsschluss:</strong> Der Vertrag zwischen BBN Music und dem Nutzer kommt
						zustande, sobald BBN Music das Angebot des Nutzers annimmt. Die Annahme kann entweder
						ausdrücklich durch eine Bestätigungs-E-Mail erfolgen oder konkludent dadurch, dass BBN Music
						das Nutzerkonto freischaltet.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">3.3 Kostenmodelle:</strong> Im Rahmen der Registrierung wählt
						der Nutzer eines der angebotenen Preismodelle (siehe Abschnitt 5). Bei kostenpflichtigem Modell wird der Preis von 12 €/Jahr explizit angezeigt.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">3.4 Voraussetzungen:</strong> Nutzer müssen mindestens 18 Jahre alt sein. BBN Music behält sich vor, Registrierungen bei begründeten Zweifeln abzulehnen.
					</p>
				</div>
			</section>

			<!-- Section 4 -->
			<section id="section-4" class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="p-4 border-b border-gray-100 dark:border-gray-700/50">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">4.</span> Pflichten und Verantwortlichkeiten des Nutzers
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<p>
						<strong class="text-gray-900 dark:text-white">4.1 Wahrheit und Aktualität:</strong> Der Nutzer ist verpflichtet, sämtliche Angaben
						wahrheitsgemäß und vollständig zu machen und sein Profil bei Änderungen unverzüglich zu aktualisieren.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">4.2 Zugangsdaten:</strong> Der Nutzer muss die Zugangsdaten zu seinem Nutzerkonto
						geheim halten und den Zugang vor unbefugten Dritten schützen.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">4.3 Inhaltsvoraussetzungen:</strong> Der Nutzer darf ausschließlich Inhalte hochladen,
						an denen er alle erforderlichen Rechte besitzt.
					</p>

					<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 my-3">
						<p class="font-medium text-red-800 dark:text-red-300 text-sm mb-2">4.4 Verbotene Inhalte:</p>
						<ul class="text-red-700 dark:text-red-400 text-xs space-y-1">
							<li>• Volksverhetzende, rassistische oder extremistische Inhalte</li>
							<li>• Gewaltverherrlichende Inhalte</li>
							<li>• Pornografische oder jugendgefährdende Inhalte (ohne Kennzeichnung)</li>
							<li>• Beleidigende oder diskriminierende Aussagen</li>
							<li>• Urheberrechtsverletzungen (z.B. nicht genehmigte Samples)</li>
							<li>• Persönlichkeitsrechtsverletzungen</li>
						</ul>
					</div>

					<p>
						<strong class="text-gray-900 dark:text-white">4.5 Kennzeichnungspflichten:</strong> Explizite Inhalte müssen als solche gekennzeichnet werden.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">4.6 Keine Doppelverwertung:</strong> Keine parallele Distribution über andere Dienste in dieselben Stores.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">4.7 Store-Richtlinien:</strong> Der Nutzer muss die Richtlinien der Stores beachten.
					</p>

					<div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 my-3">
						<p class="font-medium text-yellow-800 dark:text-yellow-300 text-sm mb-2">4.8 Anti-Fraud Policy:</p>
						<ul class="text-yellow-700 dark:text-yellow-400 text-xs space-y-1">
							<li>• Keine Manipulation von Streaming-/Download-Zahlen</li>
							<li>• Keine Bots, Klickfarmen oder automatisierte Streams</li>
							<li>• Keine Umgehung von Schutzmechanismen</li>
							<li>• Keine Mehrfachkonten oder Identitätstäuschung</li>
						</ul>
					</div>

					<p>
						<strong class="text-gray-900 dark:text-white">4.9-4.11:</strong> Der Nutzer trägt die volle Verantwortung für seine Inhalte und räumt BBN Music die erforderlichen Nutzungsrechte für die Distribution ein.
					</p>
				</div>
			</section>

			<!-- Section 5 - Pricing (highlighted) -->
			<section id="section-5" class="bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-800/30 rounded-xl border border-orange-200 dark:border-orange-800/50 overflow-hidden">
				<div class="p-4 border-b border-orange-100 dark:border-orange-800/30">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">5.</span> Vergütung, Preise und Abrechnungsmodelle
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<p><strong class="text-gray-900 dark:text-white">5.1 Kostenmodelle:</strong></p>

					<div class="grid md:grid-cols-2 gap-4 my-4">
						<div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
							<div class="text-lg font-bold text-gray-900 dark:text-white mb-1">Free-Modell</div>
							<div class="text-3xl font-black text-gray-900 dark:text-white">97%</div>
							<div class="text-sm text-gray-500 mb-3">deiner Einnahmen</div>
							<ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
								<li>• Keine Grundgebühr</li>
								<li>• 3% Provision für BBN Music</li>
								<li>• Unbegrenzte Releases</li>
							</ul>
						</div>
						<div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
							<div class="text-lg font-bold mb-1">Paid-Modell</div>
							<div class="text-3xl font-black">100%</div>
							<div class="text-sm text-white/80 mb-3">deiner Einnahmen</div>
							<ul class="text-xs text-white/90 space-y-1">
								<li>• 12 € pro Jahr</li>
								<li>• 0% Provision</li>
								<li>• Unbegrenzte Releases</li>
							</ul>
						</div>
					</div>

					<p>
						<strong class="text-gray-900 dark:text-white">5.2 Netto-Royalties:</strong> Nettoeinnahmen nach Abzug von Store-Anteilen und Steuern.
						Beispiel: 100 € vom Store = 97 € (Free) bzw. 100 € (Paid) für dich.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">5.3-5.6:</strong> Preisänderungen werden rechtzeitig angekündigt. Zahlung erfolgt vorab via Kreditkarte, SEPA oder PayPal. Bei Zahlungsverzug kann das Konto gesperrt oder auf Free heruntergestuft werden.
					</p>
				</div>
			</section>

			<!-- Section 6 -->
			<section id="section-6" class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="p-4 border-b border-gray-100 dark:border-gray-700/50">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">6.</span> Abrechnung und Auszahlungen
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<p>
						<strong class="text-gray-900 dark:text-white">6.1 Erfassung:</strong> BBN Music erfasst alle Einnahmen (Streams, Downloads, Content ID, etc.) und stellt Sales-Reports bereit.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">6.2 Abrechnungszeitraum:</strong> Abrechnungen erfolgen regelmäßig basierend auf den Store-Daten.
					</p>

					<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 my-3">
						<p class="font-medium text-blue-800 dark:text-blue-300 text-sm">6.3 Auszahlungsschwelle: <span class="font-bold">5 EUR</span></p>
						<p class="text-blue-700 dark:text-blue-400 text-xs mt-1">Guthaben unterhalb werden vorgetragen. Bei Vertragsende erfolgt Auszahlung unabhängig von der Schwelle.</p>
					</div>

					<p>
						<strong class="text-gray-900 dark:text-white">6.4 Zahlungswege:</strong> Banküberweisung (SEPA), PayPal oder Wise. Auszahlung in Euro.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">6.5 Steuern:</strong> Der Nutzer ist für die steuerliche Erklärung seiner Einnahmen selbst verantwortlich.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">6.6-6.8:</strong> Bei Korrekturen durch Stores können bereits erstellte Abrechnungen berichtigt werden. Store-Gebühren bei Regelverstößen können weiterbelastet werden.
					</p>
				</div>
			</section>

			<!-- Section 7 - Consumer Rights (highlighted) -->
			<section id="section-7" class="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800/30 rounded-xl border border-green-200 dark:border-green-800/50 overflow-hidden">
				<div class="p-4 border-b border-green-100 dark:border-green-800/30">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">7.</span> Widerrufsrecht für Verbraucher
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<div class="bg-green-100 dark:bg-green-900/30 rounded-lg p-4">
						<p class="font-bold text-green-800 dark:text-green-300 mb-2">Widerrufsbelehrung</p>
						<p class="text-green-700 dark:text-green-400 text-sm">
							Sie haben das Recht, binnen <strong>14 Tagen</strong> ohne Angabe von Gründen diesen Vertrag zu widerrufen.
						</p>
					</div>

					<p>
						<strong class="text-gray-900 dark:text-white">Widerruf an:</strong><br>
						BBN Music GmbH<br>
						Rosa-Luxemburg-Str. 37, 14482 Potsdam<br>
						E-Mail: support@bbn.music
					</p>

					<p>
						<strong class="text-gray-900 dark:text-white">Folgen des Widerrufs:</strong> Rückzahlung aller Zahlungen binnen 14 Tagen. Bei bereits genutzten Leistungen ist anteiliger Wertersatz zu leisten.
					</p>

					<details class="bg-gray-100 dark:bg-gray-800 rounded-lg">
						<summary class="p-3 cursor-pointer font-medium text-gray-700 dark:text-gray-300 text-sm">Muster-Widerrufsformular anzeigen</summary>
						<div class="p-3 pt-0 text-xs text-gray-600 dark:text-gray-400 space-y-2">
							<p>An: BBN Music GmbH, Rosa-Luxemburg-Str. 37, 14482 Potsdam – E-Mail: support@bbn.music</p>
							<p>Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung: _______</p>
							<p>Bestellt/registriert am: _______ / Name: _______ / Anschrift: _______</p>
							<p>Datum: _______ / Unterschrift (nur bei Papier): _______</p>
							<p class="text-gray-400">(*) Unzutreffendes streichen.</p>
						</div>
					</details>
				</div>
			</section>

			<!-- Section 8 -->
			<section id="section-8" class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="p-4 border-b border-gray-100 dark:border-gray-700/50">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">8.</span> Vertragslaufzeit, Kündigung und Sperrung
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<div class="grid md:grid-cols-2 gap-4">
						<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
							<p class="font-bold text-gray-900 dark:text-white text-sm mb-1">Free-Modell</p>
							<p class="text-xs text-gray-600 dark:text-gray-400">Unbefristet, kündbar mit 30 Tagen Frist zum Monatsende</p>
						</div>
						<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
							<p class="font-bold text-gray-900 dark:text-white text-sm mb-1">Paid-Modell</p>
							<p class="text-xs text-gray-600 dark:text-gray-400">1 Jahr, automatische Verlängerung, kündbar 14 Tage vor Ablauf</p>
						</div>
					</div>

					<p>
						<strong class="text-gray-900 dark:text-white">8.3 Wechsel:</strong> Von Free zu Paid jederzeit möglich. Von Paid zu Free zum Ende der bezahlten Laufzeit.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">8.4 Beschwerden:</strong> Bei Maßnahmen gegen den Nutzer besteht ein 14-tägiges Beschwerderecht.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">8.5 Außerordentliche Kündigung:</strong> Bei schweren Verstößen (Rechtsverletzungen, Streaming-Manipulation, etc.) kann BBN Music fristlos kündigen.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">8.6 Nach Vertragsende:</strong> Konto wird gesperrt, Inhalte aus Stores entfernt. Offene Guthaben werden ausgezahlt.
					</p>
				</div>
			</section>

			<!-- Section 9 -->
			<section id="section-9" class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="p-4 border-b border-gray-100 dark:border-gray-700/50">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">9.</span> Änderungen dieser AGB
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<p>
						<strong class="text-gray-900 dark:text-white">9.1-9.2:</strong> Änderungen werden mindestens 6 Wochen vorher per E-Mail angekündigt.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">9.3 Zustimmung:</strong> Verbraucher müssen ausdrücklich zustimmen. Unternehmer: Schweigen gilt als Zustimmung nach 30 Tagen.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">9.4 Ablehnung:</strong> Bei Ablehnung gelten die alten AGB weiter. BBN Music kann dann zum Inkrafttreten kündigen.
					</p>
				</div>
			</section>

			<!-- Section 10 -->
			<section id="section-10" class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="p-4 border-b border-gray-100 dark:border-gray-700/50">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">10.</span> Haftung von BBN Music
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<p>
						<strong class="text-gray-900 dark:text-white">10.1 Unbeschränkte Haftung:</strong> Bei Vorsatz, grober Fahrlässigkeit, Personenschäden und gesetzlichen Garantien.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">10.2 Einfache Fahrlässigkeit:</strong> Nur bei Verletzung wesentlicher Vertragspflichten, begrenzt auf vorhersehbare Schäden.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">10.3-10.4:</strong> Kein Ersatz für entgangenen Gewinn, indirekte Schäden. Keine Haftung für Nutzerinhalte oder Store-Entscheidungen.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">10.5 Höhere Gewalt:</strong> Keine Haftung bei Naturkatastrophen, Pandemien, Serverausfällen etc.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">10.8 Für Unternehmer:</strong> Haftung begrenzt auf Zahlungen der letzten 12 Monate (max. 100 EUR bei Free).
					</p>
				</div>
			</section>

			<!-- Section 11 -->
			<section id="section-11" class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="p-4 border-b border-gray-100 dark:border-gray-700/50">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">11.</span> Rechte Dritter, Freistellung und Sanktionen
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<p>
						<strong class="text-gray-900 dark:text-white">11.1-11.2 Freistellung:</strong> Der Nutzer stellt BBN Music von Ansprüchen Dritter frei, die durch seine Inhalte entstehen (inkl. Anwaltskosten).
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">11.3 Streitbeilegung:</strong> Bei Urheberrechtskonflikten erst interne Klärung mit BBN Music anstoßen (30 Tage).
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">11.4 Vertragsstrafe (Unternehmer):</strong> Max. 500 € pro Verstoß bei schuldhaften Verstößen. Nicht für Verbraucher.
					</p>
				</div>
			</section>

			<!-- Section 12 -->
			<section id="section-12" class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="p-4 border-b border-gray-100 dark:border-gray-700/50">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">12.</span> Datenschutz und Datennutzung
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<p>
						Alle Details zum Datenschutz findest du in unserer <a href="/privacy" class="text-orange-500 hover:text-orange-400 font-medium">Datenschutzerklärung</a>.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">Zusammenfassung:</strong> Daten werden nur zur Vertragserfüllung verwendet (Art. 6 Abs. 1 b DSGVO). Aufbewahrung erfolgt gemäß gesetzlicher Fristen (bis 10 Jahre für Abrechnungsdaten). Dritte werden nur als Auftragsverarbeiter eingesetzt.
					</p>
				</div>
			</section>

			<!-- Section 13 -->
			<section id="section-13" class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="p-4 border-b border-gray-100 dark:border-gray-700/50">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">13.</span> Anbieterkennzeichnung, Kontakt und Streitbeilegung
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<p>
						Unsere vollständige Anbieterkennzeichnung findest du im <a href="/imprint" class="text-orange-500 hover:text-orange-400 font-medium">Impressum</a>.
					</p>
					<p>
						<strong class="text-gray-900 dark:text-white">Streitbeilegung:</strong> Wir nehmen nicht an Verbraucherstreitbeilegungsverfahren teil. Die EU-Streitbeilegungsplattform wurde eingestellt.
					</p>
				</div>
			</section>

			<!-- Section 14 -->
			<section id="section-14" class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
				<div class="p-4 border-b border-gray-100 dark:border-gray-700/50">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						<span class="text-orange-500">14.</span> Schlussbestimmungen
					</h2>
				</div>
				<div class="p-4 space-y-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
					<div class="grid md:grid-cols-2 gap-4">
						<div>
							<p class="font-medium text-gray-900 dark:text-white text-sm mb-1">Anwendbares Recht</p>
							<p class="text-xs text-gray-500">Deutsches Recht (ohne UN-Kaufrecht)</p>
						</div>
						<div>
							<p class="font-medium text-gray-900 dark:text-white text-sm mb-1">Gerichtsstand</p>
							<p class="text-xs text-gray-500">Potsdam (für Unternehmer)</p>
						</div>
						<div>
							<p class="font-medium text-gray-900 dark:text-white text-sm mb-1">Vertragssprache</p>
							<p class="text-xs text-gray-500">Deutsch (englische Versionen dienen nur der Erleichterung)</p>
						</div>
						<div>
							<p class="font-medium text-gray-900 dark:text-white text-sm mb-1">Verjährung (Unternehmer)</p>
							<p class="text-xs text-gray-500">12 Monate ab Verjährungsbeginn</p>
						</div>
					</div>
					<p class="text-xs text-gray-500">
						Salvatorische Klausel: Unwirksame Bestimmungen berühren nicht die Wirksamkeit der übrigen Bestimmungen.
						BBN Music kann den Vertrag auf verbundene Unternehmen übertragen (4 Wochen Ankündigung).
						Mitteilungen an support@bbn.music sind ausreichend.
					</p>
				</div>
			</section>

			<!-- Footer -->
			<div class="text-center py-6 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-8">
				<p>Diese AGB gelten ab dem 02.02.2024 für alle Neuverträge.</p>
			</div>
		</main>
	</div>
</div>
