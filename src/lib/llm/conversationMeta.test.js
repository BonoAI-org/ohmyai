import { test, expect, describe } from 'bun:test';
import {
	UNTITLED_CONVERSATION,
	generateConversationId,
	generateConversationTitle,
	mergeCustomModels
} from './conversationMeta.js';

describe('generateConversationId', () => {
	test('produit un identifiant préfixé et unique', () => {
		const a = generateConversationId();
		const b = generateConversationId();
		expect(a).toMatch(/^conv_\d+_[a-z0-9]+$/);
		expect(a).not.toBe(b);
	});
});

describe('generateConversationTitle', () => {
	test('replie sur un titre par défaut sans message', () => {
		expect(generateConversationTitle([])).toBe(UNTITLED_CONVERSATION);
		expect(generateConversationTitle(undefined)).toBe(UNTITLED_CONVERSATION);
	});

	test('replie quand aucun message utilisateur n\'existe', () => {
		expect(generateConversationTitle([{ role: 'assistant', content: 'salut' }])).toBe(
			UNTITLED_CONVERSATION
		);
	});

	test('reprend un message court tel quel', () => {
		expect(
			generateConversationTitle([
				{ role: 'system', content: 'règles' },
				{ role: 'user', content: 'Explique les closures' }
			])
		).toBe('Explique les closures');
	});

	test('tronque à 50 caractères et suffixe', () => {
		const long = 'a'.repeat(80);
		const title = generateConversationTitle([{ role: 'user', content: long }]);
		expect(title).toBe('a'.repeat(50) + '...');
	});

	test('un message de 50 caractères exactement n\'est pas suffixé', () => {
		const exact = 'b'.repeat(50);
		expect(generateConversationTitle([{ role: 'user', content: exact }])).toBe(exact);
	});

	test('replie sur le titre par défaut pour un contenu multimodal', () => {
		// Un message porteur d'images a un contenu non textuel.
		const title = generateConversationTitle([
			{ role: 'user', content: [{ type: 'text', text: 'décris' }] }
		]);
		expect(title).toBe(UNTITLED_CONVERSATION);
	});

	test('prend le premier message utilisateur, pas le dernier', () => {
		const title = generateConversationTitle([
			{ role: 'user', content: 'premier' },
			{ role: 'assistant', content: 'réponse' },
			{ role: 'user', content: 'second' }
		]);
		expect(title).toBe('premier');
	});
});

describe('mergeCustomModels', () => {
	const existing = [{ id: 'a' }, { id: 'b' }];

	test('sans modèles entrants, garde les existants', () => {
		expect(mergeCustomModels(existing, undefined, true)).toEqual(existing);
	});

	test('en remplacement, adopte les modèles entrants', () => {
		expect(mergeCustomModels(existing, [{ id: 'c' }], false)).toEqual([{ id: 'c' }]);
	});

	test('en fusion, n\'ajoute que les nouveaux identifiants', () => {
		expect(mergeCustomModels(existing, [{ id: 'b' }, { id: 'c' }], true)).toEqual([
			{ id: 'a' },
			{ id: 'b' },
			{ id: 'c' }
		]);
	});

	test('en fusion, un doublon ne remplace pas la version locale', () => {
		const out = mergeCustomModels([{ id: 'a', name: 'local' }], [{ id: 'a', name: 'importé' }], true);
		expect(out).toEqual([{ id: 'a', name: 'local' }]);
	});
});
