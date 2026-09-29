import { test, expect, describe } from 'bun:test';

/**
 * Garde-fou de la refonte : les composants migrent des échelles `slate` et
 * `purple` vers les jetons sémantiques. Un thème qui ne redéfinit pas ces
 * jetons ne repeint plus que la part de l'interface restée sur les anciennes
 * classes, et le sélecteur de thème paraît cassé sans qu'aucun test n'en
 * parle. C'était le cas de tous les thèmes sauf `atelier`.
 *
 * Guard rail for the redesign: a theme that does not redefine the semantic
 * tokens only repaints the part of the UI still on the old classes, and the
 * theme picker looks broken with no test saying so.
 */

const css = await Bun.file(new URL('../../app.css', import.meta.url)).text();
const settings = await Bun.file(
	new URL('../components/Settings.svelte', import.meta.url)
).text();

/** Les thèmes proposés dans les réglages, source de vérité de la liste. */
function proposedThemes() {
	const block = settings.match(/const colorThemes = \[([\s\S]*?)\n\t\];/);
	if (!block) throw new Error('liste colorThemes introuvable dans Settings.svelte');
	return [...block[1].matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
}

/** Les déclarations portées par un sélecteur `:root[data-theme="..."]`. */
function declarationsFor(theme) {
	const selector = `:root[data-theme="${theme}"]`;
	let out = '';
	let from = 0;
	for (;;) {
		const at = css.indexOf(selector, from);
		if (at === -1) return out;
		const open = css.indexOf('{', at);
		const close = css.indexOf('}', open);
		out += css.slice(open + 1, close);
		from = close;
	}
}

// Jetons dont dépend l'essentiel de l'interface convertie : fonds, encres,
// bordures et accent. `atelier` en est exempt, ce sont ses valeurs que porte
// le bloc `@theme static`.
const REQUIRED = [
	'--color-bg',
	'--color-bg-raised',
	'--color-surface',
	'--color-border',
	'--color-border-soft',
	'--color-ink',
	'--color-ink-2',
	'--color-ink-3',
	'--color-accent',
	'--color-accent-hover',
	'--color-accent-soft'
];

describe('jetons sémantiques des thèmes', () => {
	test('les réglages proposent bien atelier et les thèmes historiques', () => {
		const themes = proposedThemes();
		expect(themes).toContain('atelier');
		expect(themes.length).toBeGreaterThan(1);
	});

	for (const theme of proposedThemes().filter((t) => t !== 'atelier')) {
		test(`le thème ${theme} redéfinit les jetons sémantiques`, () => {
			const declarations = declarationsFor(theme);
			expect(declarations).not.toBe('');
			const manquants = REQUIRED.filter((token) => !declarations.includes(`${token}:`));
			expect(manquants).toEqual([]);
		});
	}
});
