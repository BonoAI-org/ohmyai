# Vérifications d'interface / Interface checks

Ce projet n'utilise pas Playwright. Les parcours d'interface sont vérifiés dans
un vrai Chrome, piloté par Claude Code via le serveur MCP `chrome-devtools`.

This project does not use Playwright. Interface journeys are verified in a real
Chrome, driven by Claude Code through the `chrome-devtools` MCP server.

## Ce que cela change

La vérification bout en bout n'est plus une étape d'intégration continue : elle
n'est pas automatisée sur les pull requests. La CI conserve le build, la
vérification de types et les tests unitaires. Les contrôles décrits ici sont
lancés à la demande, avant une fusion ou après une modification d'interface.

End-to-end verification is no longer a continuous integration step: it is not
automated on pull requests. CI keeps the build, the type check and the unit
tests. The checks described here are run on demand, before a merge or after an
interface change.

## Marche à suivre

1. Démarrer le serveur de développement.

   ```sh
   bun run dev
   ```

2. Ouvrir la page dans Chrome, en arrière-plan.

   `new_page` avec l'URL `http://localhost:4242`.

3. Lancer les contrôles principaux.

   `evaluate_script` en passant le contenu de `checks/page-checks.js` comme
   paramètre `function`. Le fichier est une expression de fonction unique, donc
   il se passe tel quel. Le résultat liste `passed`, `failed` et un booléen
   `ok`.

4. Lancer le contrôle responsive, deux fois.

   Utiliser `emulate` avec le paramètre `viewport`, et non `resize_page` : ce
   dernier laisse `window.innerWidth` inchangé, les requêtes média ne basculent
   donc pas et le contrôle passerait à tort.
   Use `emulate` with the `viewport` parameter, not `resize_page`: the latter
   leaves `window.innerWidth` untouched, so media queries do not switch and the
   check would pass for the wrong reason.

   - `emulate` avec `viewport: "375x812x2,mobile,touch"`, puis `evaluate_script`
     avec le contenu de `checks/responsive-checks.js` : `ok` vrai, deux boutons
     visibles.
   - `emulate` avec `viewport: "1280x800x1"`, puis rejouer le même script :
     `ok` vrai, deux boutons masqués.

5. Lire la console.

   `list_console_messages` ne doit rapporter aucune erreur applicative. En
   développement, l'échec d'enregistrement du service worker est attendu, il est
   désactivé par la configuration.

## Couverture

Les contrôles reprennent les assertions de l'ancienne suite : titre, en-tête,
zone de saisie unique avec placeholder, bouton de nouvelle conversation,
ouverture et fermeture au clic extérieur du sélecteur de modèle, saisie de
texte, bouton d'envoi, message d'accueil, panneau d'historique, modale des
paramètres, fond dégradé, absence de clé d'internationalisation brute,
attributs d'accessibilité sur les boutons, et comportement responsive.

## Capture d'écran de la vitrine

`scripts/take-screenshot.js` pilotait Playwright pour produire
`static/screenshot-desktop.png`. La même capture se fait désormais avec Chrome
DevTools, sans dépendance :

1. `bun run dev`, puis `new_page` sur `http://localhost:4242`.
2. `emulate` avec `viewport: "1024x560x1"`.
3. `evaluate_script` pour forcer le thème clair « paper » :
   `() => { localStorage.setItem('colorTheme', 'paper'); localStorage.setItem('isDark', 'false'); location.reload(); }`
4. Attendre le rechargement, puis `take_screenshot` en enregistrant dans
   `static/screenshot-desktop.png`.
