# 📚 Documentation Oh my AI!

Bienvenue dans la documentation complète de **Oh my AI!** - Une application web qui exécute des modèles d'IA entièrement dans votre navigateur.

Welcome to the complete documentation for **Oh my AI!** - A web app that runs AI models entirely in your browser.

---

## 🚀 Démarrage / Getting Started

### Pour Commencer / Start Here
- **[Quick Start Guide](QUICKSTART.md)** - Guide de démarrage rapide
- **[Architecture](ARCHITECTURE.md)** - Comprendre l'architecture du projet

---

## 🌐 Déploiement / Deployment

### Guides de Déploiement / Deployment Guides
- **[Guide de Déploiement Complet](DEPLOYMENT.md)** - Déploiement détaillé (Netlify, Vercel, Cloudflare)
- **[Cloudflare Quick Deploy](CLOUDFLARE_QUICKSTART.md)** - Déploiement rapide sur Cloudflare Pages (5 min)

**Recommandé** : Cloudflare Pages pour les meilleures performances
**Recommended**: Cloudflare Pages for best performance

---

## 📱 Progressive Web App (PWA)

### Fonctionnalités PWA / PWA Features
- **[PWA Guide](PWA_GUIDE.md)** - Guide complet PWA (installation, service workers, offline)
- **[Vérification RAM](RAM_CHECK.md)** - Détection automatique de la RAM disponible

**Points clés / Key points** :
- ✅ Installation sur mobile et desktop
- ✅ Fonctionne offline après la première visite
- ✅ Vérification de RAM avant installation (minimum 4 GB)

---

## 🤖 Modèles IA / AI Models

### Documentation Modèles / Models Documentation
- **[Liste des Modèles](MODELES.md)** - Tous les modèles disponibles avec specs
- **[Modèles Personnalisés](CUSTOM_MODELS.md)** - Ajouter et gérer vos propres modèles

**Modèles populaires / Popular models** :
- 🚀 **Llama-3.2-1B** : Léger et rapide (~1 GB)
- ⚡ **Phi-3.5** : Équilibré (~2 GB)
- 🧠 **Llama-3.1-8B** : Puissant (~8 GB)

---

## 💬 Fonctionnalités / Features

### Gestion des Conversations / Conversation Management
- **[Historique des Conversations](CONVERSATION_HISTORY.md)** - Sauvegarde et reprise de conversations
- **[Migration Dexie](DEXIE_MIGRATION.md)** - Migration de la base de données locale

**Fonctionnalités** :
- 💾 Sauvegarde automatique locale (IndexedDB)
- 📝 Renommer les conversations
- 🗑️ Supprimer les anciennes conversations
- 🔄 Export/Import (à venir)

---

## 🛠️ Développement / Development

### Pour les Contributeurs / For Contributors
- **[Guide de Contribution](CONTRIBUTING.md)** - Comment contribuer au projet
- **[Résumé du Projet](PROJECT_SUMMARY.md)** - Vue d'ensemble technique

**Technologies principales / Main technologies** :
- SvelteKit 2
- Bun (runtime & package manager)
- WebLLM (exécution IA)
- Dexie (base de données locale)
- TailwindCSS (styling)

---

## 📊 Structure de la Documentation

```
docs/
├── README.md                      # Ce fichier / This file
│
├── 🚀 Démarrage / Getting Started
│   ├── QUICKSTART.md              # Guide rapide
│   └── ARCHITECTURE.md            # Architecture
│
├── 🌐 Déploiement / Deployment
│   ├── DEPLOYMENT.md              # Guide complet
│   └── CLOUDFLARE_QUICKSTART.md   # Cloudflare rapide
│
├── 📱 PWA
│   ├── PWA_GUIDE.md               # Guide PWA
│   └── RAM_CHECK.md               # Vérification RAM
│
├── 🤖 Modèles / Models
│   ├── MODELES.md                 # Liste modèles
│   └── CUSTOM_MODELS.md           # Modèles perso
│
├── 💬 Fonctionnalités / Features
│   ├── CONVERSATION_HISTORY.md    # Historique
│   └── DEXIE_MIGRATION.md         # Migration DB
│
└── 🛠️ Développement / Development
    ├── CONTRIBUTING.md            # Contribution
    └── PROJECT_SUMMARY.md         # Résumé projet
```

---

## 🎯 Guides par Cas d'Usage / Guides by Use Case

### Je veux... / I want to...

#### 🚀 Démarrer rapidement / Start quickly
→ [Quick Start Guide](QUICKSTART.md)

#### 🌐 Déployer mon app / Deploy my app
→ [Cloudflare Quick Deploy](CLOUDFLARE_QUICKSTART.md) (plus rapide / fastest)
→ [Guide de Déploiement](DEPLOYMENT.md) (complet / complete)

#### 📱 Créer une PWA / Create a PWA
→ [PWA Guide](PWA_GUIDE.md)

#### 🤖 Ajouter un nouveau modèle / Add a new model
→ [Modèles Personnalisés](CUSTOM_MODELS.md)

#### 💬 Gérer l'historique / Manage history
→ [Historique des Conversations](CONVERSATION_HISTORY.md)

#### 🛠️ Contribuer au projet / Contribute to project
→ [Guide de Contribution](CONTRIBUTING.md)

#### 🏗️ Comprendre le code / Understand the code
→ [Architecture](ARCHITECTURE.md)
→ [Project Summary](PROJECT_SUMMARY.md)

---

## 💡 Conseils / Tips

### 🎯 Performances / Performance
- Utilisez Chrome ou Edge pour meilleures performances / Use Chrome or Edge for best performance
- Minimum 4 GB RAM recommandé / Minimum 4 GB RAM recommended
- Activez l'accélération matérielle / Enable hardware acceleration

### 🔒 Confidentialité / Privacy
- ✅ Toutes les données restent locales / All data stays local
- ✅ Aucune connexion serveur après téléchargement / No server connection after download
- ✅ Modèles cachés dans le navigateur / Models cached in browser

### 📦 Premier Chargement / First Load
- Le modèle se télécharge (~1-8 GB selon le modèle)
- Soyez patient lors du premier chargement (3-10 min)
- Les chargements suivants sont instantanés (cache)

---

## 🆘 Besoin d'Aide ? / Need Help?

### Problèmes Courants / Common Issues

**Le modèle ne charge pas / Model won't load**
→ Vérifiez votre connexion internet
→ Essayez un modèle plus petit
→ Consultez [Dépannage dans QUICKSTART](QUICKSTART.md#dépannage)

**Erreur de mémoire / Memory error**
→ Fermez les autres onglets
→ Utilisez un modèle plus léger
→ Consultez [Vérification RAM](RAM_CHECK.md)

**Problème de déploiement / Deployment issue**
→ Vérifiez les headers CORS
→ Consultez [Guide Déploiement](DEPLOYMENT.md#dépannage)

---

## 🔗 Liens Rapides / Quick Links

### Documentation Externe / External Documentation
- [WebLLM](https://github.com/mlc-ai/web-llm)
- [SvelteKit](https://kit.svelte.dev/)
- [Bun](https://bun.sh/)
- [Dexie](https://dexie.org/)
- [TailwindCSS](https://tailwindcss.com/)

### Repository
- [GitHub](https://github.com/votre-repo) *(à mettre à jour)*
- [Issues](https://github.com/votre-repo/issues)
- [Discussions](https://github.com/votre-repo/discussions)

---

## 📝 Contribuer à la Documentation / Contributing to Documentation

La documentation n'est jamais parfaite ! Si vous trouvez des erreurs ou souhaitez améliorer quelque chose :

The documentation is never perfect! If you find errors or want to improve something:

1. Ouvrez une issue / Open an issue
2. Proposez une modification / Propose a change
3. Consultez [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Bonne lecture ! / Happy reading!** 📚✨
