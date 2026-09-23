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

### Méthode Git (auto) : par GitHub Actions / via GitHub Actions

Le workflow `.github/workflows/ci.yml` déploie `main` sur Cloudflare Pages à chaque
push, une fois le build, `svelte-check` et les tests unitaires passés. Les PR sont
vérifiées mais jamais déployées. Un redéploiement manuel se lance depuis l'onglet
**Actions** (« Run workflow »).
The `.github/workflows/ci.yml` workflow deploys `main` to Cloudflare Pages on every
push, once the build, `svelte-check` and unit tests pass. PRs are checked but never
deployed. A manual redeploy starts from the **Actions** tab ("Run workflow").

Configuration à faire une fois, dans **Settings > Secrets and variables > Actions**
du dépôt GitHub / One-time setup, under the GitHub repository's
**Settings > Secrets and variables > Actions**:

1. `CLOUDFLARE_ACCOUNT_ID` : l'identifiant du compte Cloudflare qui possède le
   projet Pages `ohmyai-app` (visible dans `wrangler whoami`) / the ID of the
   Cloudflare account owning the `ohmyai-app` Pages project (shown by `wrangler whoami`).
2. `CLOUDFLARE_API_TOKEN` : un jeton créé sur
   <https://dash.cloudflare.com/profile/api-tokens>, permission **Account →
   Cloudflare Pages → Edit**, limité à ce compte / a token created at
   <https://dash.cloudflare.com/profile/api-tokens>, permission **Account →
   Cloudflare Pages → Edit**, scoped to that account.

```bash
# Depuis le dépôt, avec gh : la valeur est demandée sans être affichée
# From the repository, with gh: the value is prompted for without being shown
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set CLOUDFLARE_API_TOKEN
```

Ensuite / Then:
```bash
git push origin main
# GitHub Actions construit, vérifie, puis déploie / builds, checks, then deploys
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

### ❌ "Pages only supports files up to 25 MiB in size"
**Cause** : Cloudflare Pages refuse tout fichier de plus de 25 Mio, et le déploiement
entier échoue. Le seul fichier concerné est le runtime WebAssembly d'onnxruntime
(`ort-wasm-*.wasm`, ~26 Mio), émis dans le build par Vite mais jamais téléchargé
depuis notre origine : Transformers.js le charge depuis le CDN jsdelivr.
**Solution** : `bun run build` enchaîne `scripts/prune-oversized-assets.js`, qui
retire ces fichiers. Tout autre fichier trop gros fait échouer le build avec son nom,
pour être traité en connaissance de cause.
**Cause**: Cloudflare Pages rejects any file over 25 MiB, and the whole deployment
fails. The only affected file is onnxruntime's WebAssembly runtime
(`ort-wasm-*.wasm`, ~26 MiB), emitted into the build by Vite but never fetched from
our origin: Transformers.js loads it from the jsdelivr CDN.
**Solution**: `bun run build` chains `scripts/prune-oversized-assets.js`, which
removes those files. Any other oversized file fails the build with its name, so it
gets handled knowingly.

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
