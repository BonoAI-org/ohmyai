# 🚀 Guide de Déploiement / Deployment Guide

Ce guide explique comment déployer **Oh my AI!** sur Cloudflare Pages.
This guide explains how to deploy **Oh my AI!** on Cloudflare Pages.

---

## 📋 Prérequis / Prerequisites

### 1. Compte Cloudflare / Cloudflare Account
- Créez un compte sur [Cloudflare](https://dash.cloudflare.com/sign-up)
- Create an account on [Cloudflare](https://dash.cloudflare.com/sign-up)

### 2. Wrangler CLI
```bash
# Installation globale / Global installation
bun add -g wrangler

# Ou utiliser npx / Or use npx
npx wrangler --version
```

### 3. Authentification / Authentication
```bash
# Se connecter à Cloudflare / Login to Cloudflare
wrangler login
```

---

## 🏗️ Configuration

### Fichiers Créés / Created Files

✅ **`wrangler.toml`** - Configuration Wrangler
✅ **`svelte.config.js`** - Adapter Cloudflare configuré
✅ **`static/_headers`** - En-têtes HTTP (déjà existant)
✅ **`.node-version`** - Version Node.js (20)

---

## 🎯 Déploiement / Deployment

### Option 1 : Via CLI (Recommandé)

#### Build et déploiement en une commande / Build and deploy in one command
```bash
bun run deploy
```

#### Build de production / Production build
```bash
bun run deploy:prod
```

### Option 2 : Via GitHub + Cloudflare Dashboard

#### 1. Push sur GitHub
```bash
git add .
git commit -m "Ready for Cloudflare deployment"
git push origin main
```

#### 2. Configuration Cloudflare Pages
1. Allez sur [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **Pages** → **Create a project**
3. Connectez votre repo GitHub
4. **Build settings** :
   - **Framework preset** : SvelteKit
   - **Build command** : `bun run build`
   - **Build output directory** : `.svelte-kit/cloudflare`
   - **Node version** : `20`

#### 3. Variables d'environnement (si nécessaire)
```
# Ajoutez vos variables dans Cloudflare Dashboard
# Add your variables in Cloudflare Dashboard
# Settings → Environment variables
```

---

## ⚙️ Configuration Importante / Important Configuration

### En-têtes Requis / Required Headers

L'app nécessite ces en-têtes pour WebAssembly et WebLLM :
The app requires these headers for WebAssembly and WebLLM:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

✅ Ces en-têtes sont déjà configurés dans :
✅ These headers are already configured in:
- `wrangler.toml`
- `static/_headers`
- `vite.config.js`

---

## 🧪 Test Local avec Cloudflare / Local Testing with Cloudflare

### Preview avec Wrangler / Preview with Wrangler
```bash
# Build l'app / Build the app
bun run build

# Test local avec Wrangler / Local test with Wrangler
bun run cf:dev
```

---

## 📦 Structure de Build / Build Structure

Après `bun run build`, la structure sera :
After `bun run build`, the structure will be:

```
.svelte-kit/
└── cloudflare/
    ├── _worker.js          # Cloudflare Worker
    ├── _routes.json        # Routes configuration
    └── ...                 # Autres fichiers / Other files
```

---

## 🔍 Vérification / Verification

### Checklist Post-Déploiement / Post-Deployment Checklist

✅ **PWA fonctionnelle** / PWA working
- Testez l'installation sur mobile
- Test installation on mobile

✅ **Service Worker actif** / Service Worker active
- Vérifiez dans DevTools → Application
- Check in DevTools → Application

✅ **WebAssembly fonctionne** / WebAssembly works
- Testez le chargement d'un modèle
- Test loading a model

✅ **Headers CORS corrects** / CORS headers correct
- Vérifiez dans Network tab
- Check in Network tab

---

## 🐛 Dépannage / Troubleshooting

### Erreur : "SharedArrayBuffer is not defined"

**Solution** : Vérifiez les en-têtes CORS
**Solution**: Check CORS headers

```bash
# Testez les en-têtes / Test headers
curl -I https://votre-app.pages.dev

# Doit inclure / Should include:
# Cross-Origin-Embedder-Policy: require-corp
# Cross-Origin-Opener-Policy: same-origin
```

### Erreur : Build échoue / Build fails

**Solution** : Vérifiez la version Node.js
**Solution**: Check Node.js version

```bash
# Cloudflare Pages utilise la version de .node-version
# Cloudflare Pages uses the version from .node-version
cat .node-version  # Devrait afficher: 20
```

### Fichiers WASM trop gros / WASM files too large

**Solution** : Les fichiers WASM ne sont pas précachés (voir `vite.config.js`)
**Solution**: WASM files are not precached (see `vite.config.js`)

---

## 📊 Monitoring

### Logs Cloudflare / Cloudflare Logs
```bash
# Voir les logs en temps réel / View real-time logs
wrangler pages deployment tail
```

### Analytics
- Dashboard Cloudflare → Analytics
- Métriques de performance / Performance metrics
- Erreurs / Errors

---

## 🔄 Mise à Jour / Updates

### Redéploiement / Redeployment
```bash
# Pull les dernières modifications / Pull latest changes
git pull

# Build et déploie / Build and deploy
bun run deploy:prod
```

### Rollback
```bash
# Via Cloudflare Dashboard
# Pages → Déploiements → Rollback to previous
```

---

## 💡 Conseils / Tips

### Performance
- ✅ Cloudflare CDN global
- ✅ Cache automatique des assets
- ✅ Compression Brotli/Gzip

### Domaine Personnalisé / Custom Domain
1. Dashboard → Pages → Custom domains
2. Ajoutez votre domaine / Add your domain
3. Configurez DNS / Configure DNS

### Preview Deployments
- Chaque branche → Preview URL automatique
- Each branch → Automatic preview URL
- Parfait pour tester / Perfect for testing

---

## 📞 Support

### Documentation
- [Cloudflare Pages](https://developers.cloudflare.com/pages)
- [SvelteKit + Cloudflare](https://svelte.dev/docs/kit/adapter-cloudflare)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler)

### Issues
- Ouvrez une issue sur le repo GitHub
- Open an issue on the GitHub repo

---

**Bonne chance avec votre déploiement ! 🚀**
**Good luck with your deployment! 🚀**
