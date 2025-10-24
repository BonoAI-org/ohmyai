/**
 * Service Worker pour Oh my AI!
 * Service Worker for Oh my AI!
 * 
 * Gère le cache offline et les mises à jour
 * Handles offline cache and updates
 */

import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { precacheAndRoute } from 'workbox-precaching';

// Version et nom du cache / Version and cache name
const VERSION = '1.0.1';
const CACHE_NAME = `ho-my-ai-${VERSION}`;

// Précache les ressources (injecté automatiquement par Workbox)
// Precache resources (automatically injected by Workbox)
// Ce placeholder est remplacé par Workbox lors du build
// This placeholder is replaced by Workbox during build
precacheAndRoute(self.__WB_MANIFEST || []);

// Stratégie pour les pages HTML / Strategy for HTML pages
registerRoute(
	({ request }) => request.mode === 'navigate',
	new NetworkFirst({
		cacheName: `${CACHE_NAME}-pages`,
		plugins: [
			new CacheableResponsePlugin({
				statuses: [0, 200]
			})
		]
	})
);

// Stratégie pour les ressources statiques (CSS, JS, fonts)
// Strategy for static resources (CSS, JS, fonts)
registerRoute(
	({ request }) => 
		request.destination === 'style' ||
		request.destination === 'script' ||
		request.destination === 'font',
	new StaleWhileRevalidate({
		cacheName: `${CACHE_NAME}-assets`,
		plugins: [
			new CacheableResponsePlugin({
				statuses: [0, 200]
			}),
			new ExpirationPlugin({
				maxEntries: 60,
				maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours / 30 days
			})
		]
	})
);

// Stratégie pour les images / Strategy for images
registerRoute(
	({ request }) => request.destination === 'image',
	new CacheFirst({
		cacheName: `${CACHE_NAME}-images`,
		plugins: [
			new CacheableResponsePlugin({
				statuses: [0, 200]
			}),
			new ExpirationPlugin({
				maxEntries: 60,
				maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours / 30 days
			})
		]
	})
);

// NE PAS CACHER les fichiers des modèles LLM et ressources WebLLM
// DON'T CACHE LLM model files and WebLLM resources
// WebLLM gère son propre cache via IndexedDB et Cache API
// WebLLM manages its own cache via IndexedDB and Cache API
registerRoute(
	({ url }) => {
		// Exclure tous les fichiers de modèles et ressources WebLLM
		// Exclude all model files and WebLLM resources
		return (
			url.hostname.includes('huggingface.co') ||
			url.hostname.includes('cdn.jsdelivr.net') ||
			url.hostname.includes('unpkg.com') ||
			url.pathname.includes('mlc-llm') ||
			url.pathname.endsWith('.wasm') ||
			url.pathname.endsWith('.bin') ||
			url.pathname.endsWith('.params') ||
			url.pathname.endsWith('.model')
		);
	},
	// Stratégie Network Only - ne pas cacher du tout / Network Only strategy - don't cache at all
	({ event }) => fetch(event.request)
);

// Installation du service worker / Service worker installation
self.addEventListener('install', (event) => {
	console.log('[SW] Installation...', VERSION);
	
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			console.log('[SW] Cache ouvert / Cache opened');
			// Le précache est géré par Workbox
			// Precaching is handled by Workbox
		})
	);
	
	// Active immédiatement / Activate immediately
	self.skipWaiting();
});

// Activation du service worker / Service worker activation
self.addEventListener('activate', (event) => {
	console.log('[SW] Activation...', VERSION);
	
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => name.startsWith('ho-my-ai-') && name !== CACHE_NAME)
					.map((name) => {
						console.log('[SW] Suppression ancien cache / Deleting old cache:', name);
						return caches.delete(name);
					})
			);
		})
	);
	
	// Prend le contrôle immédiatement / Take control immediately
	return self.clients.claim();
});

// Gestion des messages depuis l'app / Handle messages from app
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		console.log('[SW] Message reçu / Message received: SKIP_WAITING');
		self.skipWaiting();
	}
	
	if (event.data && event.data.type === 'GET_VERSION') {
		event.ports[0].postMessage({ version: VERSION });
	}
});

// Synchronisation en arrière-plan (si supporté)
// Background sync (if supported)
self.addEventListener('sync', (event) => {
	console.log('[SW] Sync event:', event.tag);
	
	if (event.tag === 'sync-conversations') {
		event.waitUntil(
			// Ici on pourrait synchroniser les conversations si nécessaire
			// Here we could sync conversations if needed
			Promise.resolve()
		);
	}
});

// Gestion des notifications push (si implémenté plus tard)
// Handle push notifications (if implemented later)
self.addEventListener('push', (event) => {
	console.log('[SW] Push reçu / Push received');
	
	const options = {
		body: event.data ? event.data.text() : 'Nouvelle notification',
		icon: '/icon-192x192.png',
		badge: '/icon-96x96.png',
		vibrate: [200, 100, 200]
	};
	
	event.waitUntil(
		self.registration.showNotification('Oh my AI!', options)
	);
});

// Gestion des clics sur notifications
// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
	console.log('[SW] Notification cliquée / Notification clicked');
	
	event.notification.close();
	
	event.waitUntil(
		clients.openWindow('/')
	);
});

// Gestion des erreurs globales / Global error handling
self.addEventListener('error', (event) => {
	console.error('[SW] Erreur globale / Global error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
	console.error('[SW] Promise rejetée non gérée / Unhandled promise rejection:', event.reason);
	// Empêche l'erreur de remonter et crasher le SW / Prevent error from bubbling up and crashing SW
	event.preventDefault();
});

console.log('[SW] Service Worker chargé / Service Worker loaded:', VERSION);
