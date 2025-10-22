# Génération des Icônes / Icons Generation

Ce guide explique comment régénérer toutes les icônes de l'application à partir du logo SVG.

This guide explains how to regenerate all application icons from the SVG logo.

## 📋 Prérequis / Prerequisites

- Bun installé / Bun installed
- Le logo source se trouve dans `src/lib/assets/logo.svg`
- The source logo is located in `src/lib/assets/logo.svg`

## 🚀 Processus / Process

### Étape 1 : Convertir le SVG en PNG source / Step 1: Convert SVG to source PNG

Cette étape convertit le logo SVG en une image PNG de 1024x1024px qui servira de source pour générer toutes les autres icônes.

This step converts the SVG logo to a 1024x1024px PNG image that will serve as the source for generating all other icons.

```bash
bun run svg-to-png
```

Cela crée / This creates: `static/icon-source.png`

### Étape 2 : Générer toutes les icônes / Step 2: Generate all icons

Cette étape génère automatiquement toutes les icônes nécessaires pour la PWA dans différentes tailles.

This step automatically generates all necessary PWA icons in different sizes.

```bash
bun run generate:icons
```

## 📦 Icônes générées / Generated Icons

Le script génère automatiquement :

The script automatically generates:

### Icônes PWA standard / Standard PWA Icons
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

### Icônes Maskable (pour Android adaptatif / for Adaptive Android)
- `icon-maskable-192x192.png`
- `icon-maskable-512x512.png`

### Icônes spéciales / Special Icons
- `favicon.png` (32x32px)
- `apple-touch-icon.png` (180x180px)

## 🎨 Personnalisation / Customization

### Modifier le logo / Modify the logo

1. Modifiez le fichier / Edit the file: `src/lib/assets/logo.svg`
2. Exécutez les deux étapes ci-dessus / Run both steps above
3. Validez les nouveaux fichiers / Commit the new files

### Changer les couleurs de fond / Change background colors

Les couleurs sont définies dans les scripts :

Colors are defined in the scripts:

- **`scripts/svg-to-png.js`** : Couleur de fond pour la conversion SVG → PNG
  - `{ r: 15, g: 23, b: 42, alpha: 1 }` = Bleu foncé (#0f172a)

- **`scripts/generate-icons.js`** :
  - Icônes normales / Normal icons: `{ r: 15, g: 23, b: 42, alpha: 1 }` = `background_color` du manifest
  - Icônes maskable: `{ r: 124, g: 58, b: 237, alpha: 1 }` = Violet (#7c3aed) = `theme_color` du manifest

## 📝 Notes importantes / Important Notes

### Ratio d'aspect / Aspect Ratio
Le logo SVG actuel a un ratio horizontal (environ 4:1). Lors de la conversion en icônes carrées, le script :
- Centre le logo / Centers the logo
- Ajoute un fond de couleur / Adds a colored background
- Pour les icônes maskable, ajoute 10% de padding pour respecter les safe zones Android

The current SVG logo has a horizontal ratio (approximately 4:1). When converting to square icons, the script:
- Centers the logo
- Adds a colored background
- For maskable icons, adds 10% padding to respect Android safe zones

### Mise à jour du manifest / Manifest Update
Les icônes sont référencées dans `static/manifest.json`. Si vous changez les tailles ou ajoutez de nouvelles icônes, pensez à mettre à jour le manifest.

Icons are referenced in `static/manifest.json`. If you change sizes or add new icons, remember to update the manifest.

### Favicon SVG
Le favicon SVG (`src/lib/assets/favicon.svg`) est également utilisé dans l'application et doit être maintenu en sync avec le logo principal.

The SVG favicon (`src/lib/assets/favicon.svg`) is also used in the application and should be kept in sync with the main logo.

## 🔧 Dépannage / Troubleshooting

### Erreur : "Source image not found"
Assurez-vous d'avoir exécuté `bun run svg-to-png` en premier.

Make sure you ran `bun run svg-to-png` first.

### Problème de qualité d'image / Image quality issues
- Vérifiez que `icon-source.png` fait bien 1024x1024px
- Le format PNG avec fond opaque est recommandé pour de meilleures performances

- Check that `icon-source.png` is actually 1024x1024px
- PNG format with opaque background is recommended for better performance

### Les icônes ne s'affichent pas correctement / Icons don't display correctly
1. Videz le cache du navigateur / Clear browser cache
2. Désinstallez et réinstallez la PWA / Uninstall and reinstall the PWA
3. Vérifiez les chemins dans `static/manifest.json` / Check paths in `static/manifest.json`
