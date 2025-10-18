# 🤝 Guide de Contribution / Contributing Guide

Merci de votre intérêt pour contribuer à ce projet ! / Thank you for your interest in contributing to this project!

## 🌟 Comment Contribuer / How to Contribute

### 1. Signaler des Bugs / Report Bugs

Si vous trouvez un bug, veuillez créer une issue avec :

If you find a bug, please create an issue with:

- **Description claire** du problème / **Clear description** of the problem
- **Étapes pour reproduire** / **Steps to reproduce**
- **Comportement attendu vs actuel** / **Expected vs actual behavior**
- **Environnement** (OS, navigateur, version) / **Environment** (OS, browser, version)
- **Captures d'écran** si applicable / **Screenshots** if applicable

### 2. Proposer des Fonctionnalités / Suggest Features

Pour proposer une nouvelle fonctionnalité :

To suggest a new feature:

1. Vérifiez qu'elle n'existe pas déjà dans les issues
2. Créez une issue avec le tag `enhancement`
3. Décrivez clairement le cas d'usage / Clearly describe the use case
4. Expliquez pourquoi cette fonctionnalité serait utile

### 3. Soumettre une Pull Request / Submit a Pull Request

#### Processus / Process

1. **Fork** le projet
2. **Créez une branche** : `git checkout -b feature/ma-fonctionnalite`
3. **Commitez vos changements** : `git commit -m 'Ajout de ma fonctionnalité'`
4. **Pushez vers votre fork** : `git push origin feature/ma-fonctionnalite`
5. **Ouvrez une Pull Request**

#### Checklist avant de soumettre / Checklist before submitting

- [ ] Le code suit le style du projet
- [ ] Les commentaires sont en français ET anglais
- [ ] Testé sur Chrome et Firefox
- [ ] Pas d'erreurs dans la console
- [ ] La documentation est mise à jour si nécessaire
- [ ] Les commits ont des messages descriptifs

## 📝 Standards de Code / Code Standards

### Style de Code / Code Style

#### JavaScript/Svelte
- Utiliser `const` et `let`, jamais `var`
- Noms de variables en camelCase
- Noms de composants en PascalCase
- Indentation : tabulations (comme configuré dans le projet)

```javascript
// ✅ Bon / Good
const userMessage = $state('');
let isLoading = $state(false);

// ❌ Mauvais / Bad
var user_message = '';
let IsLoading = false;
```

#### Commentaires / Comments
Toujours en français ET anglais :

Always in French AND English:

```javascript
// Initialise le moteur LLM / Initialize LLM engine
async function initEngine() {
	// ...
}
```

### Structure des Composants / Component Structure

```svelte
<script>
	// 1. Imports
	import { onMount } from 'svelte';
	
	// 2. Props
	let { message } = $props();
	
	// 3. State
	let count = $state(0);
	
	// 4. Fonctions / Functions
	function handleClick() {
		// ...
	}
	
	// 5. Lifecycle
	onMount(() => {
		// ...
	});
</script>

<!-- 6. Template -->
<div>
	<!-- Contenu / Content -->
</div>

<!-- 7. Styles (si nécessaire) -->
<style>
	/* Styles */
</style>
```

## 🧪 Tests / Testing

### Tests Manuels / Manual Testing

Avant de soumettre une PR, testez sur :

Before submitting a PR, test on:

- [ ] **Chrome** (dernière version / latest version)
- [ ] **Firefox** (dernière version / latest version)
- [ ] **Safari** (si possible / if possible)
- [ ] **Mobile** (Chrome mobile au minimum / Chrome mobile at minimum)

### Scénarios à Tester / Test Scenarios

1. **Chargement initial** / **Initial loading**
   - Le modèle se charge sans erreur
   - La progression s'affiche correctement

2. **Chat basique** / **Basic chat**
   - Envoi de message avec Enter
   - Envoi de message avec le bouton
   - Shift+Enter pour nouvelle ligne

3. **Génération de texte** / **Text generation**
   - Le streaming fonctionne
   - Les messages s'affichent correctement
   - Pas d'erreur dans la console

4. **Nettoyage** / **Cleanup**
   - Effacer la conversation fonctionne
   - Rechargement de la page garde le modèle en cache

## 🎨 Améliorations Suggérées / Suggested Improvements

Voici quelques idées de fonctionnalités à implémenter :

Here are some feature ideas to implement:

### Facile / Easy
- [ ] Sélecteur de modèle dans l'UI
- [ ] Bouton pour copier les réponses
- [ ] Dark/Light mode toggle
- [ ] Historique de conversation persistant
- [ ] Export de conversation en Markdown

### Moyen / Medium
- [ ] Support du markdown dans les messages
- [ ] Syntax highlighting pour le code
- [ ] Paramètres ajustables (temperature, max_tokens)
- [ ] Indicateur de tokens utilisés
- [ ] Mode "System prompt" personnalisable

### Avancé / Advanced
- [ ] Support multi-modal (images)
- [ ] Fine-tuning du modèle
- [ ] Intégration avec RAG (Retrieval Augmented Generation)
- [ ] Support de plugins
- [ ] Mode hors-ligne complet (PWA)

## 🐛 Déboguer / Debugging

### Outils Utiles / Useful Tools

1. **Console navigateur** / **Browser console**
   ```javascript
   // Activer les logs détaillés / Enable detailed logs
   localStorage.setItem('debug', 'webllm:*');
   ```

2. **Performance**
   ```javascript
   // Mesurer la vitesse de génération / Measure generation speed
   console.time('generation');
   await llmStore.sendMessage('test');
   console.timeEnd('generation');
   ```

3. **Mémoire** / **Memory**
   - Chrome DevTools → Performance → Memory
   - Vérifier les fuites mémoire / Check for memory leaks

## 📚 Ressources / Resources

### Documentation
- [Svelte 5 Docs](https://svelte.dev/docs/svelte)
- [SvelteKit Docs](https://kit.svelte.dev/)
- [WebLLM API](https://github.com/mlc-ai/web-llm)
- [TailwindCSS](https://tailwindcss.com/)

### Tutoriels Utiles / Useful Tutorials
- [Svelte Runes (nouveau système de réactivité)](https://svelte.dev/blog/runes)
- [WebAssembly Introduction](https://webassembly.org/getting-started/developers-guide/)
- [WebLLM Examples](https://github.com/mlc-ai/web-llm/tree/main/examples)

## 🔧 Configuration de Développement / Development Setup

### Outils Recommandés / Recommended Tools

- **Éditeur** / **Editor**: VSCode, WebStorm, Cursor
- **Extensions VSCode**:
  - Svelte for VS Code
  - Tailwind CSS IntelliSense
  - ESLint
  - Prettier

### Configuration VSCode

Créez `.vscode/settings.json` :

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "svelte.enable-ts-plugin": true
}
```

## ❓ Questions / Questions

Si vous avez des questions :

If you have questions:

1. Consultez d'abord la documentation / Check documentation first
2. Recherchez dans les issues existantes / Search existing issues
3. Créez une nouvelle issue avec le tag `question`
4. Rejoignez les discussions / Join discussions

## 📄 Licence / License

En contribuant, vous acceptez que vos contributions soient sous la même licence MIT que le projet.

By contributing, you agree that your contributions will be licensed under the same MIT license as the project.

---

**Merci pour vos contributions ! / Thank you for your contributions!** 🎉
