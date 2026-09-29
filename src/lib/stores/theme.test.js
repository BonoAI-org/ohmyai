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

/** Les déclarations portées par un sélecteur donné, quel qu'il soit. */
function declarationsForSelector(selector) {
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

// Les jetons d'état, employés par les panneaux de téléchargement et les
// messages d'erreur, retournent eux aussi en sombre.
const REQUIRED_DARK = [
	...REQUIRED,
	'--color-warn',
	'--color-warn-ink',
	'--color-warn-soft',
	'--color-warn-border',
	'--color-danger',
	'--color-danger-soft',
	'--color-danger-border'
];

describe('mode sombre', () => {
	test('les jetons sémantiques ont des valeurs sombres', () => {
		const declarations = declarationsForSelector(':root.dark');
		expect(declarations).not.toBe('');
		const manquants = REQUIRED_DARK.filter((token) => !declarations.includes(`${token}:`));
		expect(manquants).toEqual([]);
	});

	test('les thèmes clairs sont les mêmes dans le store et dans app.html', async () => {
		const store = await Bun.file(new URL('./theme.svelte.js', import.meta.url)).text();
		const html = await Bun.file(new URL('../../app.html', import.meta.url)).text();

		const liste = store.match(/LIGHT_ONLY_THEMES = \[([^\]]*)\]/);
		if (!liste) throw new Error('LIGHT_ONLY_THEMES introuvable');
		const declares = [...liste[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();

		// Le script anti-clignotement les écarte un par un, avant le rendu.
		const ecartes = [...html.matchAll(/theme !== "([^"]+)"/g)].map((m) => m[1]).sort();

		expect(ecartes).toEqual(declares);
	});

	test('aucun fond fort ne garde un texte blanc, qui deviendrait illisible', async () => {
		// `bg-accent`, `bg-danger` et `bg-ink` s'éclaircissent en sombre : le
		// texte posé dessus doit suivre le jeton inverse, pas rester blanc.
		const composants = new Bun.Glob('*.svelte').scanSync({
			cwd: new URL('../components/', import.meta.url).pathname
		});
		const fautifs = [];
		for (const nom of composants) {
			const source = await Bun.file(
				new URL(`../components/${nom}`, import.meta.url)
			).text();
			for (const ligne of source.split('\n')) {
				if (/bg-(accent|danger|ink)\b/.test(ligne) && /\btext-white\b/.test(ligne)) {
					fautifs.push(`${nom} : ${ligne.trim().slice(0, 60)}`);
				}
			}
		}
		expect(fautifs).toEqual([]);
	});
});
