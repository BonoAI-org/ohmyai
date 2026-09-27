# Refonte UX de Oh my AI! : brief d'implémentation

Brief destiné à Claude Code, à lancer à la racine du repo `BonoAI-org/ohmyai`.
Les maquettes de référence sont dans `maquettes/` (HTML statique, styles inline : les valeurs exactes de couleurs, rayons, tailles et espacements se lisent directement dans le markup).

## Règles de travail

- Stack existante : SvelteKit + Svelte 5, TailwindCSS, Vite, Dexie. Ne pas changer de framework.
- Utiliser Bun (`bun install`, `bun run dev`), jamais npm ni node.
- Demander avant de lancer un build.
- Aucun tiret cadratin dans le code, les libellés ou les commits.
- Travailler sur une branche `refonte-ux`, jamais directement sur `main`.
- Avancer phase par phase, un commit par phase, et s'arrêter après chaque phase pour validation.
- Toutes les chaînes passent par le système i18n existant (FR et EN). Plus aucun libellé bilingue du type « Paramètres / Settings ».

## Maquettes

| Fichier | Contenu |
|---|---|
| `maquettes/Main.html` | Synthèse de l'audit, cinq priorités |
| `maquettes/Constats.html` | Les 16 constats et leur correctif |
| `maquettes/Avant-Desktop.html` | Écran actuel annoté |
| `maquettes/Apres-Accueil.html` | Premier lancement, modèle non installé |
| `maquettes/Apres-Conversation.html` | Conversation en cours, historique en panneau |
| `maquettes/Mobile.html` | Avant / après en 375 px |
| `maquettes/Systeme.html` | Palette, typographie, composants |

## Carte du code

| Sujet | Fichiers |
|---|---|
| Jetons, thèmes, polices | `src/app.css` (Tailwind v4 : bloc `@theme`, thème `paper` ligne 70), `src/lib/stores/theme.svelte.js`, `src/app.html` |
| En-tête | `src/lib/components/AppHeader.svelte`, `LanguageSelector.svelte`, `ModelSelector.svelte` |
| Historique en panneau | `src/lib/components/ConversationHistory.svelte`, `src/routes/+layout.svelte`, `src/routes/+page.svelte` |
| Premier lancement, états vides | `src/lib/components/StatusPanels.svelte`, `MessageList.svelte` |
| Installation PWA, pied de page | `src/lib/stores/installPrompt.svelte.js`, `src/lib/pwa.js`, `AppFooter.svelte` |
| Sélecteur de modèles | `ModelSelector.svelte`, `ManageModelsModal.svelte` |
| Composer, réponses | `ChatComposer.svelte`, `ChatMessage.svelte`, `KnowledgeBase.svelte` |
| Réglages | `SettingsModal.svelte`, `Settings.svelte`, `MCPConfigModal.svelte` |
| Libellés | `src/lib/i18n/locales/fr.json` et `en.json` (voir `docs/I18N.md`) |

## Phase 1 : fondations visuelles

Créer un thème par défaut (appelé `atelier`) à côté des thèmes existants, via des variables CSS exposées à Tailwind.

| Jeton | Valeur | Usage |
|---|---|---|
| `--bg` | `#F6F2EA` | fond de page |
| `--bg-raised` | `#FBF8F2` | fond d'application |
| `--surface` | `#FFFFFF` | cartes, champs |
| `--border` | `#E0D8C8` | bordures de contrôles |
| `--border-soft` | `#EDE6D8` | séparateurs |
| `--ink` | `#14120D` | texte principal |
| `--ink-2` | `#454034` | texte secondaire |
| `--ink-3` | `#6B6355` | légendes (jamais plus clair) |
| `--accent` | `#0F5C4A` | action principale, état « local / chargé » |
| `--accent-soft` | `#E5EFE9` | fond de badge accent |
| `--warn` | `#A34B0C` / texte `#7A3A08` | coût, avertissement |
| `--warn-soft` | `#FBEFE0` (bordure `#F0DCBE`) | fond d'alerte |
| `--danger` | `#9B2C20` | erreur, suppression |
| `--danger-soft` | `#F8E9E6` | fond d'erreur |

Typographie (Google Fonts, un seul `<link>` dans `app.html`) :
- Titres : Bricolage Grotesque 800, interlettrage négatif (-0.02em à -0.03em).
- Texte : IBM Plex Sans 400 / 500 / 600.
- Données (poids, vitesse, noms de modèles) : IBM Plex Mono 400 / 500.
- Retirer Nunito s'il n'est plus utilisé.

Rayons : 9 px contrôles, 12 px boutons, 14 à 16 px cartes. Cibles : 44 px minimum partout.

Corriger aussi le thème `paper` : il remappe toute l'échelle de couleurs Tailwind (purple, slate…) sur des gris, ce qui rend le bouton vert de téléchargement plus saillant que l'action principale.

Critère d'acceptation : l'app se charge avec `atelier` par défaut, les autres thèmes restent sélectionnables, contraste texte ≥ 4.5:1.

## Phase 2 : en-tête

Référence : `Apres-Conversation.html` (desktop), `Mobile.html` (droite).

- Une seule rangée de 56 px, trois zones : identité (bouton panneau + logo) ; contexte (titre de conversation, puce modèle avec état et poids, jauge de contexte) ; actions (« Nouvelle conversation » en bouton plein, réglages en icône avec `aria-label`).
- L'historique quitte l'en-tête pour un panneau latéral de 248 px (recherche, groupes « Aujourd'hui » / « 7 derniers jours », entrées « Base de connaissances » et « Modèles installés » en bas).
- La langue et la base de connaissances sortent de l'en-tête.
- Supprimer le bouton vert de téléchargement isolé et la pastille avatar.
- Mobile : 56 px, bouton menu à gauche, nom + modèle au centre, « Nouvelle conversation » à droite, tous en 44 px.

Critère : en-tête = 56 px en 1280 px et en 375 px (actuellement 137 et 181).

## Phase 3 : premier lancement

Référence : `Apres-Accueil.html`.

- Tant qu'aucun modèle n'est installé, afficher un seul écran d'accueil. Ne jamais afficher « Commencez une conversation » en même temps que « Téléchargement requis ».
- Colonne gauche : badge « Aucun serveur, aucun compte », titre « Une IA qui tourne entièrement sur votre machine. », paragraphe, trois preuves (hors ligne, rien ne sort de l'appareil, code ouvert avec lien GitHub).
- Carte droite « Votre appareil » : diagnostic réel (WebGPU dispo ou non, mémoire rapportée par le navigateur), alerte lisible si WebGPU absent avec la conséquence et un lien d'aide, modèle recommandé selon ce diagnostic avec poids, durée estimée et mention « stocké hors ligne », bouton plein « Télécharger et démarrer », bouton secondaire « Comparer les N modèles ».
- Le libellé « Télécharger quand même » disparaît : l'action secondaire dit ce qu'elle coûte.
- Pied de page dans le flux : « Construit par BonoAI · Code source » + bouton « Installer l'application ». Le bandeau d'installation ne flotte plus par-dessus le pied de page et reste fermé une fois refusé.

Durée estimée : calcul simple à partir du poids (hypothèse de débit documentée dans le code), affichée avec « ≈ ».

## Phase 4 : sélecteur de modèles

- Trier par compatibilité avec la machine détectée (déjà installé, adapté, lent, incompatible).
- Poids et état en badges (voir `Systeme.html`), plus noyés dans la description.
- Recherche dès que la liste dépasse dix entrées. Supprimer « Voir plus (22 autres) ».

## Phase 5 : composer et réponses

Référence : `Apres-Conversation.html`.

- Placeholder « Écrivez, ou déposez un document ».
- Rangée d'outils nommés : « Image », « Base de connaissances · N documents » (état actif en accent), envoi en 44 px accent.
- Ligne d'aide sous le composer : raccourcis clavier à gauche, « Tout se passe sur cet appareil » à droite.
- Sous chaque réponse : puce des sources RAG utilisées et vitesse réelle en tok/s.
- État vide (modèle prêt, aucune conversation) : titre + trois suggestions cliquables (voir `Mobile.html` droite).

## Phase 6 : réglages

- Trois sections : Apparence, Modèles et accès (jeton Hugging Face, cache, modèles installés), Avancé (profil, règles globales, génération, serveurs MCP).
- Échap ferme la modale, clic sur le fond aussi, le focus revient au bouton d'origine (bug actuel : Échap ne ferme pas).

## Phase 7 : vérification

- Tester en 1280 × 720 et 375 × 812 : pas de défilement horizontal, en-tête 56 px, aucune cible < 44 px.
- Navigation clavier complète, `aria-label` sur tous les boutons icône.
- Comparer visuellement chaque écran à sa maquette.
