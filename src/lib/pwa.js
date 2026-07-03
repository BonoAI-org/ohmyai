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

/**
 * Affiche le prompt d'installation / Show install prompt
 */
export function setupInstallPrompt() {
	if (!browser) return;

	console.log('🚀 PWA: Initialisation du prompt d\'installation...');
	console.log('🔍 PWA: isInstalled =', isInstalled());
	console.log('🔍 PWA: Service Worker supported =', 'serviceWorker' in navigator);

	let deferredPrompt = null;

	// Capture l'événement beforeinstallprompt / Capture beforeinstallprompt event
	window.addEventListener('beforeinstallprompt', (event) => {
		console.log('💾 Prompt d\'installation disponible / Install prompt available');

		// Empêche le prompt automatique / Prevent auto prompt
		event.preventDefault();
		deferredPrompt = event;

		// Affiche un bouton d'installation personnalisé / Show custom install button
		showInstallButton(deferredPrompt);
	});

	// Gère l'installation / Handle installation
	window.addEventListener('appinstalled', () => {
		console.log('✅ App installée / App installed');
		deferredPrompt = null;

		// Cache le bouton d'installation / Hide install button
		const installButton = document.querySelector('.pwa-install-button');
		if (installButton) {
			installButton.remove();
		}
	});

	// DEBUG: Affiche le toast après 2 secondes pour tester (même sans beforeinstallprompt)
	// DEBUG: Show toast after 2 seconds for testing (even without beforeinstallprompt)
	setTimeout(() => {
		if (!deferredPrompt && !isInstalled()) {
			console.log('⚠️ PWA: beforeinstallprompt non déclenché, affichage du toast de test...');
			showInstallButton(null); // Affiche quand même pour test
		}
	}, 2000);
}

/**
 * Affiche le bouton d'installation / Show install button
 */
function showInstallButton(deferredPrompt) {
	console.log('🎨 PWA: showInstallButton appelé, deferredPrompt =', deferredPrompt ? 'disponible' : 'null');

	// Ne montre pas si déjà installé / Don't show if already installed
	if (isInstalled()) {
		console.log('⚠️ PWA: App déjà installée, toast non affiché');
		return;
	}

	// Ne montre pas si déjà affiché / Don't show if already displayed
	if (document.querySelector('.pwa-install-button')) {
		console.log('⚠️ PWA: Toast déjà affiché');
		return;
	}

	console.log('✅ PWA: Création du toast...');

	const button = document.createElement('button');
	button.className = 'pwa-install-button';
	button.innerHTML = `
		<div style="animation: toastSlideUp 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);"
			class="fixed bottom-5 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 py-4 px-6 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] cursor-pointer z-[9998] flex items-center gap-3 font-semibold text-[15px] max-w-[90vw] transition-all hover:scale-105 backdrop-blur-md"
		>
			<svg class="w-6 h-6 shrink-0 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
			</svg>
			<div class="flex flex-col items-start gap-0.5">
				<div class="font-bold text-[15px]">Installer l'app</div>
				<div class="text-[12px] opacity-90 font-normal">Install app</div>
			</div>
		</div>
	`;

	button.onclick = async () => {
		if (!deferredPrompt) {
			console.log('⚠️ PWA: Installation non disponible (beforeinstallprompt non déclenché)');
			alert('L\'installation PWA n\'est pas disponible pour le moment.\n\nPossible raisons:\n- App déjà installée\n- Critères PWA non remplis\n- Navigateur ne supporte pas\n\nInstallation PWA not available at the moment.');
			return;
		}

		// Affiche le prompt d'installation / Show install prompt
		deferredPrompt.prompt();

		// Attend le choix de l'utilisateur / Wait for user choice
		const { outcome } = await deferredPrompt.userChoice;
		console.log('👤 Choix utilisateur / User choice:', outcome);

		// Reset
		deferredPrompt = null;
		button.remove();
	};

	// Ajoute l'animation CSS / Add CSS animation
	if (!document.querySelector('#pwa-install-styles')) {
		const style = document.createElement('style');
		style.id = 'pwa-install-styles';
		style.textContent = `
			@keyframes toastSlideUp {
				from {
					opacity: 0;
					transform: translateY(100px);
				}
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}
			@keyframes toastSlideDown {
				from {
					opacity: 1;
					transform: translateY(0);
				}
				to {
					opacity: 0;
					transform: translateY(100px);
				}
			}
		`;
		document.head.appendChild(style);
	}

	document.body.appendChild(button);
	console.log('✅ PWA: Toast ajouté au DOM!');

	// Auto-fermeture après 5 secondes / Auto-close after 5 seconds
	setTimeout(() => {
		console.log('⏱️ PWA: Fermeture du toast...');
		// Animation de sortie / Exit animation
		button.querySelector('div').style.animation = 'toastSlideDown 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
		setTimeout(() => {
			button.remove();
			console.log('✅ PWA: Toast supprimé');
		}, 400);
	}, 5000);
}

/**
 * Vérifie si l'app est à jour / Check if app is up to date
 */
export async function checkForUpdates() {
	if (!browser || !('serviceWorker' in navigator)) return;

	try {
		const registration = await navigator.serviceWorker.getRegistration();
		if (registration) {
			await registration.update();
			console.log('🔄 Vérification des mises à jour / Checking for updates');
		}
	} catch (error) {
		console.error('❌ Erreur vérification mise à jour / Update check error:', error);
	}
}
