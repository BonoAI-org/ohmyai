/**
 * Gestion du PWA et du Service Worker
 * PWA and Service Worker management
 */

import { browser } from '$app/environment';

/**
 * Enregistre le service worker / Register service worker
 */
export async function registerServiceWorker() {
	if (!browser || !('serviceWorker' in navigator)) {
		console.log('⚠️ Service Worker non supporté / Service Worker not supported');
		return null;
	}

	// En dev, pas de SW : il servirait des modules Vite périmés. On désinscrit
	// aussi tout SW resté d'une session précédente.
	// In dev, no SW: it would serve stale Vite modules. Also unregister any SW
	// left over from a previous session.
	if (import.meta.env.DEV) {
		const registrations = await navigator.serviceWorker.getRegistrations();
		for (const registration of registrations) {
			await registration.unregister();
			console.log('🧹 Service Worker désinscrit en dev / Service Worker unregistered in dev');
		}
		return null;
	}

	try {
		// Attend que la page soit chargée / Wait for page to load
		if (document.readyState !== 'complete') {
			await new Promise(resolve => {
				window.addEventListener('load', resolve, { once: true });
			});
		}

		console.log('🔄 Enregistrement du Service Worker / Registering Service Worker...');

		// Type classique, comme les enregistrements précédents de SvelteKit : le
		// script compilé n'a aucune syntaxe de module, et changer de type à
		// chaque chargement forçait une réinstallation (voir svelte.config.js).
		// Classic type, like SvelteKit's previous registrations: the built
		// script has no module syntax, and switching type on every load forced
		// a reinstall (see svelte.config.js).
		const registration = await navigator.serviceWorker.register('/service-worker.js', {
			scope: '/'
		});

		console.log('✅ Service Worker enregistré / Service Worker registered');

		// Une nouvelle version n'est installée que si le build a changé : le
		// manifeste de précache, haché, modifie le script à chaque déploiement.
		// On ne compare donc pas de numéros de version. Ils ne changeaient
		// jamais (0.0.0 des deux côtés), si bien que le bandeau ne s'affichait
		// pas et que la nouvelle version restait en attente indéfiniment.
		// A new version only installs when the build changed: the hashed
		// precache manifest changes the script on every deploy. We therefore
		// compare no version numbers. They never changed (0.0.0 on both sides),
		// so the banner never showed and the new version waited forever.
		if (registration.waiting && navigator.serviceWorker.controller) {
			// Installée lors d'une visite précédente, jamais activée.
			// Installed during a previous visit, never activated.
			showUpdateNotification(registration);
		}

		registration.addEventListener('updatefound', () => {
			const newWorker = registration.installing;
			console.log('🆕 Nouvelle version détectée / New version detected');

			newWorker?.addEventListener('statechange', () => {
				// Sans contrôleur, c'est la première installation : rien à proposer.
				// Without a controller, it is the first install: nothing to offer.
				if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
					console.log('📦 Nouvelle version prête / New version ready');
					showUpdateNotification(registration);
				}
			});
		});

		// Vérifie les mises à jour toutes les heures. Un échec réseau (hors
		// ligne, connexion saturée par un téléchargement de modèle) n'a rien
		// d'anormal : on le journalise au lieu de le laisser en « Uncaught ».
		// Check for updates every hour. A network failure (offline, connection
		// saturated by a model download) is nothing abnormal: log it instead of
		// leaving it "Uncaught".
		setInterval(() => {
			checkForUpdate(registration);
		}, 60 * 60 * 1000);

		return registration;
	} catch (error) {
		console.error('❌ Erreur Service Worker / Service Worker error:', error);
		return null;
	}
}

/**
 * Demande au navigateur de vérifier la présence d'une nouvelle version.
 * Asks the browser to check for a new version.
 * @param {ServiceWorkerRegistration} registration
 * @returns {Promise<void>}
 */
export async function checkForUpdate(registration) {
	try {
		await registration.update();
	} catch (error) {
		console.warn('⚠️ Vérification de mise à jour impossible / Update check failed:', error?.message ?? error);
	}
}

/**
 * Active la version en attente puis recharge la page une fois qu'elle a pris
 * le contrôle. Le message doit aller au service worker en attente : l'envoyer
 * au contrôleur actuel, comme auparavant, n'activait rien.
 * Activates the waiting version then reloads the page once it has taken
 * control. The message must go to the waiting service worker: sending it to
 * the current controller, as before, activated nothing.
 * @param {ServiceWorkerRegistration} registration
 */
export function activateWaitingWorker(registration) {
	const waiting = registration.waiting;
	if (!waiting) {
		window.location.reload();
		return;
	}
	let reloading = false;
	navigator.serviceWorker.addEventListener('controllerchange', () => {
		if (reloading) return;
		reloading = true;
		window.location.reload();
	});
	waiting.postMessage({ type: 'SKIP_WAITING' });
}

function showUpdateNotification(registration) {
	// Un seul bandeau à la fois / One banner at a time
	if (document.querySelector('.pwa-update-banner')) return;

	// Crée une bannière de notification / Create notification banner
	const banner = document.createElement('div');
	banner.className = 'pwa-update-banner';
	banner.innerHTML = `
		<div style="animation: slideUp 0.3s ease-out;"
			class="fixed bottom-5 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 py-4 px-6 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] z-[9999] flex items-center gap-4 max-w-[90vw]"
		>
			<div class="flex-1">
				<div class="font-semibold mb-1">
					🎉 Nouvelle version disponible !
				</div>
				<div class="text-sm opacity-90">
					New version available!
				</div>
			</div>
			<button
				data-pwa-action="refresh"
				class="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-transform hover:scale-105"
			>
				Actualiser / Refresh
			</button>
			<button
				data-pwa-action="later"
				class="bg-transparent text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold py-2 px-4 rounded-lg transition-colors"
			>
				Plus tard / Later
			</button>
		</div>
	`;

	// Ajoute l'animation CSS / Add CSS animation
	if (!document.querySelector('#pwa-update-styles')) {
		const style = document.createElement('style');
		style.id = 'pwa-update-styles';
		style.textContent = `
			@keyframes slideUp {
				from {
					opacity: 0;
					transform: translateY(20px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}
		`;
		document.head.appendChild(style);
	}

	document.body.appendChild(banner);

	banner.querySelector('[data-pwa-action="refresh"]')?.addEventListener('click', () => {
		banner.remove();
		activateWaitingWorker(registration);
	});
	banner.querySelector('[data-pwa-action="later"]')?.addEventListener('click', () => {
		banner.remove();
	});

	// Auto-fermeture après 30 secondes / Auto-close after 30 seconds
	setTimeout(() => {
		banner.remove();
	}, 30000);
}

/**
 * Vérifie si l'app est installée / Check if app is installed
 */
export function isInstalled() {
	if (!browser) return false;

	// PWA installée / PWA installed
	if (window.matchMedia('(display-mode: standalone)').matches) {
		return true;
	}

	// Mode standalone iOS / iOS standalone mode
	if (window.navigator.standalone === true) {
		return true;
	}

	return false;
}
