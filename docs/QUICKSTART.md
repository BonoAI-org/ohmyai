# 🚀 Guide de Démarrage Rapide / Quick Start Guide

Ce guide vous aidera à lancer votre application LLM WebAssembly en quelques minutes.

This guide will help you launch your LLM WebAssembly application in minutes.

## 📦 Installation en 3 Étapes / 3-Step Installation

### Étape 1 : Installer les dépendances / Step 1: Install dependencies

```bash
bun install
```

⏱️ Temps estimé / Estimated time: ~30 secondes / seconds

### Étape 2 : Lancer le serveur / Step 2: Start the server

```bash
bun run dev
```

⏱️ Temps estimé / Estimated time: ~2 secondes / seconds

### Étape 3 : Ouvrir dans le navigateur / Step 3: Open in browser

Ouvrez votre navigateur à : `http://localhost:4242`

Open your browser at: `http://localhost:4242`

⏱️ Premier chargement du modèle / First model load: ~2-5 minutes (téléchargement + initialisation)

## ✅ Checklist de Vérification / Verification Checklist

Avant de commencer, assurez-vous d'avoir : / Before starting, make sure you have:

- [ ] **Bun installé** (`bun --version`) / **Bun installed** (`bun --version`)
- [ ] **Connexion internet** (pour télécharger le modèle) / **Internet connection** (to download the model)
- [ ] **Navigateur moderne** (Chrome, Firefox, Edge, Safari) / **Modern browser** (Chrome, Firefox, Edge, Safari)
- [ ] **4 GB RAM minimum** disponible / **4 GB RAM minimum** available
- [ ] **2 GB d'espace disque** (cache navigateur) / **2 GB disk space** (browser cache)

## 🎯 Premier Test / First Test

### 1. Attendez le chargement / Wait for loading

Vous verrez un écran de chargement avec progression :

You will see a loading screen with progress:

```
Chargement du modèle... / Loading model...
Fetching param cache[0/36]: 5MB fetched...
```

### 2. Testez avec un message simple / Test with a simple message

Une fois chargé, tapez :

Once loaded, type:

```
Bonjour ! Peux-tu te présenter ?
```

ou / or:

```
Hello! Can you introduce yourself?
```

### 3. Vérifiez la réponse / Check the response

L'assistant devrait répondre en quelques secondes avec du texte qui apparaît progressivement (streaming).

The assistant should respond within seconds with text appearing progressively (streaming).

## 🐛 Problèmes Courants / Common Issues

### ❌ Le serveur ne démarre pas / Server won't start

**Problème / Issue**: `Port 4242 already in use`

**Solution**:
```bash
# Arrêtez le processus existant / Stop existing process
lsof -ti:4242 | xargs kill -9

# Ou utilisez un autre port / Or use another port
bun run dev -- --port 3000
```

### ❌ Erreur "Out of memory" dans le navigateur / Browser "Out of memory" error

**Solution**:
1. Fermez les autres onglets / Close other tabs
2. Redémarrez le navigateur / Restart the browser
3. Utilisez un modèle plus petit / Use a smaller model (voir `MODELES.md`)

### ❌ Le modèle ne se télécharge pas / Model won't download

**Solution**:
1. Vérifiez votre connexion internet / Check your internet connection
2. Désactivez les bloqueurs de pub / Disable ad blockers
3. Videz le cache du navigateur / Clear browser cache:
   - Chrome: `Ctrl+Shift+Del` > "Cached images and files"
   - Firefox: `Ctrl+Shift+Del` > "Cache"

### ❌ "WebAssembly is not supported" / "WebAssembly n'est pas supporté"

**Solution**:
- Mettez à jour votre navigateur / Update your browser
- Utilisez Chrome, Firefox, Edge ou Safari récent / Use recent Chrome, Firefox, Edge or Safari
- Vérifiez que WebAssembly est activé dans les paramètres / Check that WebAssembly is enabled in settings

## ⚡ Optimisations / Optimizations

### Pour une meilleure performance / For better performance:

#### 1. Activer l'accélération matérielle / Enable hardware acceleration

**Chrome/Edge**:
- `chrome://settings` → Système → "Utiliser l'accélération matérielle"
- `chrome://settings` → System → "Use hardware acceleration"

**Firefox**:
- `about:preferences` → Général → Performance → "Utiliser les paramètres de performance recommandés"
- `about:preferences` → General → Performance → "Use recommended performance settings"

#### 2. Augmenter la limite de mémoire du navigateur / Increase browser memory limit

**Chrome/Edge** (ligne de commande / command line):
```bash
# Windows
chrome.exe --js-flags="--max-old-space-size=8192"

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --js-flags="--max-old-space-size=8192"

# Linux
google-chrome --js-flags="--max-old-space-size=8192"
```

#### 3. Utiliser un modèle optimisé / Use an optimized model

Éditez `/src/lib/stores/llm.svelte.js` :

Edit `/src/lib/stores/llm.svelte.js`:

```javascript
// Pour vitesse maximale / For maximum speed
selectedModel = $state('Llama-3.2-1B-Instruct-q4f32_1-MLC');

// Pour qualité maximale / For maximum quality
selectedModel = $state('Phi-3.5-mini-instruct-q4f16_1-MLC');
```

## 📊 Performance Attendue / Expected Performance

### Avec Llama-3.2-1B (modèle par défaut / default model):

| Appareil / Device | Vitesse / Speed | Latence / Latency |
|---|---|---|
| MacBook Pro M1 | ~50 tokens/sec | <100ms |
| PC Gaming (RTX 3060) | ~40 tokens/sec | <150ms |
| Laptop Standard (i5) | ~15-25 tokens/sec | <300ms |
| PC Ancien / Old PC | ~5-10 tokens/sec | <500ms |

### Temps de chargement initial / Initial loading time:

- **Llama-3.2-1B**: 1-3 minutes
- **Llama-3.2-3B**: 3-6 minutes
- **Phi-3.5-mini**: 4-7 minutes

## 🎨 Personnalisation Rapide / Quick Customization

### Changer le titre / Change the title

Éditez `/src/routes/+page.svelte` ligne 66 :

Edit `/src/routes/+page.svelte` line 66:

```svelte
<h1 class="text-3xl font-bold text-white flex items-center gap-3">
	Mon Chat IA Personnalisé / My Custom AI Chat
</h1>
```

### Changer les couleurs / Change colors

Éditez les classes Tailwind dans `/src/routes/+page.svelte` :

Edit Tailwind classes in `/src/routes/+page.svelte`:

```svelte
<!-- Remplacez purple par blue, green, red, etc. -->
<!-- Replace purple with blue, green, red, etc. -->
class="bg-purple-600" → class="bg-blue-600"
```

### Ajuster la créativité / Adjust creativity

Éditez `/src/lib/stores/llm.svelte.js` ligne ~75 :

Edit `/src/lib/stores/llm.svelte.js` line ~75:

```javascript
temperature: 0.7, // 0.1 = précis, 1.0 = créatif / 0.1 = precise, 1.0 = creative
```

## 📱 Test sur Mobile / Mobile Testing

Pour tester sur votre téléphone / To test on your phone:

1. Lancez avec l'option `--host` :

```bash
bun run dev -- --host
```

2. Notez l'adresse réseau affichée / Note the network address displayed:

```
Network: http://192.168.1.100:4242/
```

3. Ouvrez cette URL sur votre téléphone (même réseau WiFi)

Open this URL on your phone (same WiFi network)

## 🎓 Prochaines Étapes / Next Steps

Maintenant que l'application fonctionne :

Now that the application works:

1. 📖 Lisez `MODELES.md` pour choisir un autre modèle / Read `MODELES.md` to choose another model
2. 🎨 Personnalisez l'interface selon vos besoins / Customize the interface to your needs
3. 🚀 Déployez en production (voir README.md) / Deploy to production (see README.md)
4. 🤝 Contribuez au projet / Contribute to the project

## 💬 Besoin d'Aide ? / Need Help?

- 📚 Documentation complète : `README.md`
- 🔍 Liste des modèles : `MODELES.md`
- 🐛 Signaler un bug : Créez une issue / Create an issue
- 💡 Suggestions : Pull requests bienvenues / Pull requests welcome

---

**Bon coding! / Happy coding!** 🎉
