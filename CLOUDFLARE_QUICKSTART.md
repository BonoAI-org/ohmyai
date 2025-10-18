# ⚡ Déploiement Rapide Cloudflare / Cloudflare Quick Deploy

Guide ultra-rapide pour déployer sur Cloudflare Pages en 5 minutes.
Ultra-fast guide to deploy on Cloudflare Pages in 5 minutes.

---

## 🎯 Méthode 1 : CLI (Le Plus Rapide)

### Étape 1 : Installer Wrangler
```bash
bun add -g wrangler
# ou / or
npm install -g wrangler
```

### Étape 2 : Se Connecter
```bash
wrangler login
```
Un navigateur s'ouvrira pour vous authentifier.
A browser will open to authenticate you.

### Étape 3 : Déployer ! 🚀
```bash
bun run deploy
```

**C'est tout !** Cloudflare vous donnera une URL comme :
**That's it!** Cloudflare will give you a URL like:
```
https://ohmyai-app.pages.dev
```

---

## 🎯 Méthode 2 : Via GitHub (Automatique)

### Étape 1 : Push sur GitHub
```bash
git add .
git commit -m "🚀 Ready for deployment"
git push
```

### Étape 2 : Cloudflare Dashboard
1. Allez sur [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Pages** → **Create project** → **Connect to Git**
3. Sélectionnez votre repo
4. **Configuration** :
   ```
   Framework:        SvelteKit
   Build command:    bun run build
   Build output:     .svelte-kit/cloudflare
   ```
5. Cliquez **Save and Deploy** ✨

---

## ⚙️ Settings Importants / Important Settings

### Variables d'Environnement (optionnel)
```bash
# Via CLI
wrangler pages secret put MY_SECRET

# Via Dashboard
Settings → Environment Variables → Add variable
```

### Domaine Personnalisé
```
Pages → Custom domains → Set up a custom domain
```

---

## ✅ Vérifications Post-Déploiement

### 1. Testez l'URL
```bash
curl -I https://votre-app.pages.dev
```

### 2. Vérifiez les Headers
Recherchez ces lignes :
Look for these lines:
```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

### 3. Testez la PWA
- Ouvrez l'app sur mobile
- Cliquez sur "Installer l'app"
- Vérifiez qu'elle fonctionne offline

---

## 🔄 Redéploiement

### Méthode CLI
```bash
bun run deploy
```

### Méthode Git (auto)
```bash
git push
# Cloudflare redéploie automatiquement !
```

---

## 🐛 Problèmes Courants / Common Issues

### ❌ "SharedArrayBuffer is not defined"
**Solution** : Headers manquants. Vérifiez que `static/_headers` est bien présent.

### ❌ "Build failed"
**Solution** : 
```bash
# Test local / Local test
bun run build

# Si ça marche localement, c'est un problème Cloudflare
# If it works locally, it's a Cloudflare issue
```

### ❌ "Page not found"
**Solution** : Vérifiez que `Build output directory` est bien `.svelte-kit/cloudflare`

---

## 📊 Commandes Utiles / Useful Commands

```bash
# Build local / Local build
bun run build

# Preview local / Local preview
bun run preview

# Deploy
bun run deploy

# Deploy production
bun run deploy:prod

# Logs en temps réel / Real-time logs
wrangler pages deployment tail

# Liste des déploiements / List deployments
wrangler pages deployment list
```

---

## 🎉 Terminé !

Votre app est maintenant déployée sur Cloudflare ! 🚀

### Prochaines Étapes / Next Steps
- [ ] Configurez un domaine personnalisé
- [ ] Ajoutez des analytics
- [ ] Configurez les alertes
- [ ] Testez sur plusieurs appareils

---

**Besoin d'aide ?** Consultez [DEPLOYMENT.md](./DEPLOYMENT.md) pour le guide complet.
**Need help?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) for the full guide.
