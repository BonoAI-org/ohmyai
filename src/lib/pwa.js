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

		const registration = await navigator.serviceWorker.register('/service-worker.js', {
			scope: '/',
			type: 'module'
		});

		console.log('✅ Service Worker enregistré / Service Worker registered');

		// Gère les mises à jour / Handle updates
		registration.addEventListener('updatefound', () => {
			const newWorker = registration.installing;
			console.log('🆕 Nouvelle version détectée / New version detected');

			newWorker?.addEventListener('statechange', async () => {
				if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
					const oldVersion = await getSWVersion(navigator.serviceWorker.controller);
					const newVersion = await getSWVersion(newWorker);
					console.log(`[PWA] Version installée: ${oldVersion}, Nouvelle version: ${newVersion}`);
					if (newVersion && newVersion !== oldVersion) {
						console.log('📦 Nouvelle version prête / New version ready');
						showUpdateNotification(registration);
					}
				}
			});
		});

		// Vérifie les mises à jour toutes les heures / Check for updates every hour
		setInterval(() => {
			registration.update();
		}, 60 * 60 * 1000);

		return registration;
	} catch (error) {
		console.error('❌ Erreur Service Worker / Service Worker error:', error);
		return null;
	}
}

/**
 * Affiche une notification de mise à jour
 * Show update notification
 */
async function getSWVersion(worker) {
	return new Promise((resolve, reject) => {
		const messageChannel = new MessageChannel();
		messageChannel.port1.onmessage = (event) => {
			if (event.data.error) {
				reject(event.data.error);
			} else {
				resolve(event.data.version);
			}
		};
		try {
			worker.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
		} catch (e) {
			reject(e);
		}
	});
}

function showUpdateNotification(registration) {
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
				onclick="this.parentElement.remove(); if (navigator.serviceWorker && navigator.serviceWorker.controller) { navigator.serviceWorker.controller.postMessage({type: 'SKIP_WAITING'}); } window.location.reload();"
				class="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-transform hover:scale-105"
			>
				Actualiser / Refresh
			</button>
			<button 
				onclick="this.parentElement.remove();"
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
