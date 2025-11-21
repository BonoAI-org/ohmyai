/**
 * Générateur de sitemap dynamique pour Oh my AI!
 * Ce fichier génère automatiquement un sitemap.xml avec toutes les pages de l'application
 * 
 * Dynamic sitemap generator for Oh my AI!
 * This file automatically generates a sitemap.xml with all application pages
 */

// URL de base de l'application en production
// Base URL of the application in production
const BASE_URL = 'https://ohmyai.bonoai.org'; // TODO: Remplacer par votre URL de production / Replace with your production URL

/**
 * Liste des URLs statiques de l'application
 * List of static URLs in the application
 */
const staticPages = [
	{
		url: '/',
		changefreq: 'weekly',
		priority: 1.0,
		lastmod: new Date().toISOString().split('T')[0]
	}
];

/**
 * Génère le XML du sitemap
 * Generates the sitemap XML
 * 
 * @param {Array} pages - Liste des pages à inclure / List of pages to include
 * @returns {string} - XML du sitemap / Sitemap XML
 */
function generateSitemap(pages) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		(page) => `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;
}

/**
 * Gère la requête GET pour le sitemap
 * Handles the GET request for the sitemap
 */
export async function GET() {
	// Génération du sitemap avec les pages statiques
	// Generate sitemap with static pages
	const sitemap = generateSitemap(staticPages);

	// Retourne le sitemap avec les headers appropriés
	// Return sitemap with appropriate headers
	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600, s-maxage=3600' // Cache d'1 heure / 1 hour cache
		}
	});
}
