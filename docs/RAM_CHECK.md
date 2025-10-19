# 💾 Vérification de la RAM / RAM Check

## Description

**Oh my AI!** vérifie automatiquement la RAM disponible avant d'installer l'application PWA et affiche des avertissements si la RAM est insuffisante.

**Oh my AI!** automatically checks available RAM before installing the PWA app and displays warnings if RAM is insufficient.

---

## 📊 Spécifications / Specifications

### RAM Minimum Requise / Minimum Required RAM
```
4 GB
```

### API Utilisée / API Used
```javascript
navigator.deviceMemory
```
- Disponible sur Chrome, Edge (Chromium-based)
- Retourne la RAM en GB / Returns RAM in GB
- Valeurs possibles : 0.25, 0.5, 1, 2, 4, 8, etc.

---

## 🔍 Fonctionnement / How It Works

### 1. **Détection au Chargement / Detection on Load**
```javascript
function checkRAM() {
  if ('deviceMemory' in navigator) {
    const deviceMemory = navigator.deviceMemory;
    
    if (deviceMemory < MIN_RAM_GB) {
      hasEnoughRAM = false;
      return false;
    }
  }
  
  hasEnoughRAM = true;
  return true;
}
```

### 2. **Affichage Conditionnel du Bouton / Conditional Button Display**
```svelte
{#if showInstallButton && hasEnoughRAM}
  <!-- Bouton d'installation vert -->
  <button>📥 Install</button>
{:else if !hasEnoughRAM && deferredInstallPrompt}
  <!-- Icône d'avertissement orange -->
  <div>⚠️</div>
{/if}
```

### 3. **Message d'Avertissement / Warning Message**
Si RAM < 4 GB, un bandeau orange s'affiche avec :
If RAM < 4 GB, an orange banner displays with:

- ⚠️ Avertissement visuel / Visual warning
- Message bilingue / Bilingual message
- Conseil de modèle léger / Light model recommendation

---

## 🎨 Interface Utilisateur / User Interface

### ✅ **RAM Suffisante (≥ 4 GB)**
```
Header:  [🆕] [🕐] [📥 Install] [🤖]
         └─ Bouton vert d'installation
```

### ⚠️ **RAM Insuffisante (< 4 GB)**
```
Header:  [🆕] [🕐] [⚠️] [🤖]
         └─ Icône d'avertissement orange

Main:
┌────────────────────────────────────────┐
│ ⚠️ RAM insuffisante détectée          │
│                                        │
│ Votre appareil < 4 GB RAM              │
│ Modèles IA peuvent être lents         │
│                                        │
│ 💡 Conseil : Utilisez Phi-3.5         │
└────────────────────────────────────────┘
```

---

## 📱 Compatibilité / Compatibility

### Navigateurs Supportés / Supported Browsers

| Navigateur / Browser | Support | Version |
|---------------------|---------|---------|
| Chrome              | ✅ Oui  | 63+     |
| Edge (Chromium)     | ✅ Oui  | 79+     |
| Firefox             | ❌ Non  | -       |
| Safari              | ❌ Non  | -       |

### Comportement si API Non Disponible / Behavior if API Unavailable

Si `navigator.deviceMemory` n'existe pas :
If `navigator.deviceMemory` doesn't exist:

```javascript
// On assume que c'est OK et on autorise l'installation
// Assume it's OK and allow installation
hasEnoughRAM = true;
```

---

## 🔧 Configuration / Configuration

### Modifier le Seuil / Modify Threshold

Dans `src/routes/+page.svelte` :
In `src/routes/+page.svelte`:

```javascript
// RAM minimum requise en Go / Minimum required RAM in GB
const MIN_RAM_GB = 4;  // ← Modifier ici / Modify here
```

### Désactiver la Vérification / Disable Check

```javascript
// Option 1 : Toujours autoriser / Always allow
const hasEnoughRAM = $state(true);

// Option 2 : Commenter la vérification / Comment out check
// checkRAM();
```

---

## 📊 Logs Console / Console Logs

### RAM Suffisante
```
💾 RAM détectée: 8 GB
📱 PWA installable, bouton activé
```

### RAM Insuffisante
```
💾 RAM détectée: 2 GB
⚠️ RAM insuffisante: 2 GB (minimum 4 GB requis)
⚠️ PWA installable mais RAM insuffisante, bouton masqué
```

### API Non Disponible
```
ℹ️ Device Memory API non disponible, installation autorisée
📱 PWA installable, bouton activé
```

---

## 🎯 Cas d'Usage / Use Cases

### 1. **Desktop Moderne (8+ GB)**
- ✅ Bouton d'installation visible
- ✅ Aucun avertissement
- ✅ Peut utiliser tous les modèles

### 2. **Desktop Ancien (2-4 GB)**
- ⚠️ Icône d'avertissement
- ⚠️ Bandeau orange
- 💡 Recommandation modèle léger

### 3. **Mobile Budget (< 4 GB)**
- ⚠️ Icône d'avertissement
- ⚠️ Bandeau orange
- 💡 Recommandation modèle léger

### 4. **Mobile Premium (6+ GB)**
- ✅ Bouton d'installation visible
- ✅ Aucun avertissement
- ✅ Peut utiliser modèles moyens

---

## 💡 Recommandations Modèles / Model Recommendations

### Pour < 4 GB RAM
```
✅ Phi-3.5 (3.8B)          ~2 GB
✅ Llama-3.2-1B            ~1 GB
✅ TinyLlama               ~600 MB
```

### Pour 4-8 GB RAM
```
✅ Phi-3 Medium            ~4 GB
✅ Llama-3.2-3B            ~3 GB
✅ Gemma-2B                ~2 GB
```

### Pour 8+ GB RAM
```
✅ Llama-3.1-8B            ~8 GB
✅ Mistral-7B              ~7 GB
✅ Tous les modèles / All models
```

---

## 🐛 Dépannage / Troubleshooting

### Le Bouton ne s'Affiche Jamais / Button Never Shows

**Cause** : `beforeinstallprompt` pas déclenché
**Cause**: `beforeinstallprompt` not triggered

**Solutions** :
1. Vérifiez les critères PWA
2. Utilisez HTTPS ou localhost
3. Testez sur Chrome/Edge

### L'Avertissement Apparaît Mais J'ai Assez de RAM / Warning Shows But I Have Enough RAM

**Cause** : L'API arrondit les valeurs
**Cause**: API rounds values

**Exemple** :
```
RAM réelle : 6 GB
Détecté    : 4 GB (arrondi par l'API)
```

**Solution** : Ignorer l'avertissement si vous savez avoir assez de RAM

---

## 📚 Ressources / Resources

### Documentation API
- [Device Memory API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory)
- [Device Memory - W3C](https://www.w3.org/TR/device-memory/)

### Limites PWA
- [PWA Install Criteria](https://web.dev/install-criteria/)
- [Add to Home Screen](https://web.dev/customize-install/)

---

**Cette fonctionnalité améliore l'expérience utilisateur en évitant les installations sur des appareils qui ne peuvent pas exécuter correctement les modèles d'IA.**

**This feature improves user experience by preventing installations on devices that cannot properly run AI models.**
