/**
 * Vérification responsive, à exécuter deux fois : une fois en largeur mobile,
 * une fois en largeur bureau, en changeant de viewport entre les deux avec
 * l'outil `emulate`. Ne pas utiliser `resize_page`, qui laisse
 * `window.innerWidth` inchangé : les requêtes média ne basculent pas et le
 * contrôle passerait à tort.
 * Responsive check, to run twice: once at mobile width, once at desktop width,
 * switching viewport in between with the `emulate` tool. Do not use
 * `resize_page`, which leaves `window.innerWidth` untouched: media queries do
 * not switch and the check would pass for the wrong reason.
 *
 * Les deux boutons de l'en-tête portant `lg:hidden` doivent être visibles sous
 * 1024 px et masqués au-delà.
 * The two header buttons carrying `lg:hidden` must be visible below 1024 px and
 * hidden above.
 *
 * Voir e2e/README.md pour la marche à suivre.
 * See e2e/README.md for the procedure.
 */
() => {
	const buttons = [...document.querySelectorAll('header button.lg\\:hidden')];
	const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
	return {
		largeur: window.innerWidth,
		nombreDeBoutons: buttons.length,
		visibles: buttons.filter(visible).length,
		attendu: window.innerWidth < 1024 ? 'tous visibles' : 'tous masqués',
		ok:
			buttons.length === 2 &&
			(window.innerWidth < 1024
				? buttons.every(visible)
				: buttons.every((b) => !visible(b)))
	};
}
