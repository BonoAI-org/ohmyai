# 🗺️ Sitemap Configuration / Configuration du Sitemap

## 📋 Vue d'ensemble / Overview

Le sitemap XML est un fichier qui aide les moteurs de recherche à explorer et indexer votre site web. Ce guide explique comment le sitemap est configuré dans Oh my AI! et comment le personnaliser.

The XML sitemap is a file that helps search engines crawl and index your website. This guide explains how the sitemap is configured in Oh my AI! and how to customize it.

## 📁 Fichiers / Files

### 1. Générateur de Sitemap / Sitemap Generator

**Fichier / File**: `/src/routes/sitemap.xml/+server.js`

Ce fichier génère dynamiquement le sitemap XML accessible à l'URL `/sitemap.xml`.

This file dynamically generates the XML sitemap accessible at the URL `/sitemap.xml`.

### 2. Robots.txt

**Fichier / File**: `/static/robots.txt`

Le fichier robots.txt référence le sitemap pour les moteurs de recherche.

The robots.txt file references the sitemap for search engines.

## 🔧 Configuration

### Modifier l'URL de base / Change Base URL

Dans le fichier `/src/routes/sitemap.xml/+server.js`, modifiez la constante `BASE_URL` :

In the file `/src/routes/sitemap.xml/+server.js`, modify the `BASE_URL` constant:

```javascript
const BASE_URL = 'https://votre-domaine.com'; // Remplacez par votre URL / Replace with your URL
```

**Important** : N'oubliez pas également de mettre à jour l'URL dans `/static/robots.txt` !

**Important**: Don't forget to also update the URL in `/static/robots.txt`!

### Ajouter de nouvelles pages / Add New Pages

Pour ajouter de nouvelles pages au sitemap, modifiez le tableau `staticPages` dans `/src/routes/sitemap.xml/+server.js` :

To add new pages to the sitemap, modify the `staticPages` array in `/src/routes/sitemap.xml/+server.js`:

```javascript
const staticPages = [
	{
		url: '/',
		changefreq: 'weekly',
		priority: 1.0,
		lastmod: new Date().toISOString().split('T')[0]
	},
	{
		url: '/about',
		changefreq: 'monthly',
		priority: 0.8,
		lastmod: '2024-01-15'
	},
	// Ajoutez vos pages ici / Add your pages here
];
```

### Paramètres disponibles / Available Parameters

- **url** : Chemin de la page (ex: `/`, `/about`) / Page path (e.g., `/`, `/about`)
- **changefreq** : Fréquence de mise à jour / Update frequency
  - `always` : Toujours / Always
  - `hourly` : Toutes les heures / Hourly
  - `daily` : Quotidien / Daily
  - `weekly` : Hebdomadaire / Weekly
  - `monthly` : Mensuel / Monthly
  - `yearly` : Annuel / Yearly
  - `never` : Jamais / Never
- **priority** : Priorité de la page (0.0 à 1.0) / Page priority (0.0 to 1.0)
- **lastmod** : Date de dernière modification (format YYYY-MM-DD) / Last modification date (YYYY-MM-DD format)

## 🚀 Déploiement / Deployment

### Vérifier le sitemap localement / Test Sitemap Locally

1. Démarrez le serveur de développement / Start development server:
```sh
bun run dev
```

2. Accédez au sitemap / Access the sitemap:
```
http://localhost:5173/sitemap.xml
```

### Production

Une fois déployé, votre sitemap sera accessible à / Once deployed, your sitemap will be accessible at:
```
https://votre-domaine.com/sitemap.xml
```

## 🔍 Soumettre votre sitemap / Submit Your Sitemap

### Google Search Console

1. Connectez-vous à [Google Search Console](https://search.google.com/search-console)
2. Sélectionnez votre propriété / Select your property
3. Allez dans "Sitemaps" dans le menu de gauche / Go to "Sitemaps" in the left menu
4. Entrez l'URL de votre sitemap : `sitemap.xml` / Enter your sitemap URL: `sitemap.xml`
5. Cliquez sur "Soumettre" / Click "Submit"

### Bing Webmaster Tools

1. Connectez-vous à [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Sélectionnez votre site / Select your site
3. Allez dans "Sitemaps" / Go to "Sitemaps"
4. Soumettez l'URL de votre sitemap / Submit your sitemap URL

## 📊 Surveillance / Monitoring

### Vérifier l'indexation / Check Indexing

Utilisez ces commandes dans votre moteur de recherche / Use these commands in your search engine:

- Google: `site:votre-domaine.com`
- Bing: `site:votre-domaine.com`

### Valider le sitemap / Validate Sitemap

Utilisez des outils en ligne pour valider votre sitemap / Use online tools to validate your sitemap:

- [XML Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)
- [Google Search Console Sitemap Tester](https://search.google.com/search-console)

## 💡 Bonnes pratiques / Best Practices

1. **Mettez à jour régulièrement** / **Update regularly**: Gardez les dates `lastmod` à jour / Keep `lastmod` dates current
2. **Hiérarchisez correctement** / **Prioritize correctly**: Utilisez la priorité pour indiquer l'importance / Use priority to indicate importance
3. **Limitez la taille** / **Limit size**: Maximum 50 000 URLs par sitemap / Maximum 50,000 URLs per sitemap
4. **Testez avant déploiement** / **Test before deployment**: Vérifiez toujours localement / Always verify locally

## 🔄 Cache

Le sitemap est mis en cache pendant 1 heure pour améliorer les performances. Pour forcer une actualisation, redémarrez votre serveur.

The sitemap is cached for 1 hour to improve performance. To force a refresh, restart your server.

## 📚 Ressources / Resources

- [Protocole Sitemaps](https://www.sitemaps.org/)
- [Guide Google SEO](https://developers.google.com/search/docs/advanced/sitemaps/overview)
- [SvelteKit Documentation](https://kit.svelte.dev/docs/routing#server)

## ❓ Dépannage / Troubleshooting

### Le sitemap ne s'affiche pas / Sitemap Not Displaying

1. Vérifiez que le fichier existe : `/src/routes/sitemap.xml/+server.js` / Check the file exists
2. Redémarrez le serveur de développement / Restart development server
3. Vérifiez les logs d'erreur / Check error logs

### Erreur de format XML / XML Format Error

1. Vérifiez la syntaxe XML dans le générateur / Check XML syntax in generator
2. Utilisez un validateur XML en ligne / Use an online XML validator
3. Assurez-vous que les caractères spéciaux sont échappés / Ensure special characters are escaped

### Les moteurs de recherche ne trouvent pas le sitemap / Search Engines Can't Find Sitemap

1. Vérifiez `/static/robots.txt` contient la bonne URL / Check `/static/robots.txt` contains correct URL
2. Assurez-vous que l'URL de base est correcte / Ensure base URL is correct
3. Soumettez manuellement via Search Console / Submit manually via Search Console

## 🤝 Support

Pour toute question ou problème, ouvrez une issue sur GitHub ou consultez la documentation.

For any questions or issues, open an issue on GitHub or check the documentation.
