import { describe, expect, it } from 'bun:test';
import fr from './locales/fr.json';
import en from './locales/en.json';
import de from './locales/de.json';

/**
 * Aplatit un fichier de traduction en paires clé pointée → texte.
 * Flattens a translation file into dotted key → text pairs.
 * @param {Record<string, any>} tree
 * @param {string} [prefix]
 * @returns {Record<string, string>}
 */
function flatten(tree, prefix = '') {
	return Object.entries(tree).reduce((acc, [key, value]) => {
		const path = prefix ? `${prefix}.${key}` : key;
		return typeof value === 'object' && value !== null
			? { ...acc, ...flatten(value, path) }
			: { ...acc, [path]: value };
	}, {});
}

/** Variables `{nom}` d'un texte, triées / A text's `{name}` variables, sorted. */
const variables = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const reference = flatten(fr);
const locales = { en: flatten(en), de: flatten(de) };

describe('traductions', () => {
	for (const [code, flat] of Object.entries(locales)) {
		it(`${code} a exactement les clés du français`, () => {
			expect(Object.keys(flat).sort()).toEqual(Object.keys(reference).sort());
		});

		it(`${code} garde les variables de chaque message`, () => {
			for (const [key, text] of Object.entries(reference)) {
				expect({ key, vars: variables(flat[key]) }).toEqual({ key, vars: variables(text) });
			}
		});
	}
});
