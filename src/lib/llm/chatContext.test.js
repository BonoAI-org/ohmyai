import { test, expect, describe } from 'bun:test';
import {
	DEFAULT_SYSTEM_PROMPT,
	toOpenAIMessages,
	buildSystemContent,
	formatUserProfile,
	appendNoThink,
	filterRagHits,
	dedupeRagSources,
	buildChatContext
} from './chatContext.js';

describe('toOpenAIMessages', () => {
	test('laisse un message texte inchangé', () => {
		expect(toOpenAIMessages([{ role: 'user', content: 'salut' }])).toEqual([
			{ role: 'user', content: 'salut' }
		]);
	});

	test('convertit un message avec images en parties', () => {
		const out = toOpenAIMessages([
			{ role: 'user', content: 'décris', images: ['data:a', 'data:b'] }
		]);
		expect(out[0].content).toEqual([
			{ type: 'text', text: 'décris' },
			{ type: 'image_url', image_url: { url: 'data:a' } },
			{ type: 'image_url', image_url: { url: 'data:b' } }
		]);
	});

	test('omet la partie texte quand le message est vide', () => {
		const out = toOpenAIMessages([{ role: 'user', content: '', images: ['data:a'] }]);
		expect(out[0].content).toEqual([{ type: 'image_url', image_url: { url: 'data:a' } }]);
	});
});

describe('buildSystemContent', () => {
	test('utilise le prompt de repli si vide ou absent', () => {
		expect(buildSystemContent('')).toBe(DEFAULT_SYSTEM_PROMPT);
		expect(buildSystemContent('   ')).toBe(DEFAULT_SYSTEM_PROMPT);
		expect(buildSystemContent(null)).toBe(DEFAULT_SYSTEM_PROMPT);
		expect(buildSystemContent(undefined)).toBe(DEFAULT_SYSTEM_PROMPT);
	});

	test('préfère les règles de l\'utilisateur, détourées', () => {
		expect(buildSystemContent('  mes règles  ')).toBe('mes règles');
	});
});

describe('formatUserProfile', () => {
	test('renvoie une chaîne vide sans profil', () => {
		expect(formatUserProfile()).toBe('');
		expect(formatUserProfile({ name: '', role: '' })).toBe('');
	});

	test('liste uniquement les champs renseignés, dans l\'ordre', () => {
		const out = formatUserProfile({ name: 'PL', language: 'fr', role: '' });
		expect(out).toBe('\n\n[User Profile]\nName: PL\nPreferred language: fr');
	});
});

describe('appendNoThink', () => {
	test('ajoute le marqueur au dernier message utilisateur en texte', () => {
		const msgs = [
			{ role: 'user', content: 'premier' },
			{ role: 'assistant', content: 'réponse' },
			{ role: 'user', content: 'second' }
		];
		appendNoThink(msgs);
		expect(msgs[0].content).toBe('premier');
		expect(msgs[2].content).toBe('second /no_think');
	});

	test('ajoute le marqueur dans la partie texte d\'un message multimodal', () => {
		const msgs = [
			{
				role: 'user',
				content: [
					{ type: 'text', text: 'décris' },
					{ type: 'image_url', image_url: { url: 'data:a' } }
				]
			}
		];
		appendNoThink(msgs);
		expect(msgs[0].content[0].text).toBe('décris /no_think');
	});

	test('ne fait rien sans message utilisateur', () => {
		const msgs = [{ role: 'system', content: 'règles' }];
		appendNoThink(msgs);
		expect(msgs[0].content).toBe('règles');
	});
});

describe('filterRagHits', () => {
	test('écarte les résultats sous la moitié du meilleur score', () => {
		const hits = [{ score: 1 }, { score: 0.6 }, { score: 0.4 }, { score: 0.5 }];
		expect(filterRagHits(hits)).toEqual([{ score: 1 }, { score: 0.6 }, { score: 0.5 }]);
	});

	test('conserve un résultat unique quel que soit son score', () => {
		expect(filterRagHits([{ score: 0.01 }])).toEqual([{ score: 0.01 }]);
	});

	test('tolère une liste vide ou absente', () => {
		expect(filterRagHits([])).toEqual([]);
		expect(filterRagHits(undefined)).toEqual([]);
	});
});

describe('dedupeRagSources', () => {
	test('garde le meilleur score par source', () => {
		const out = dedupeRagSources([
			{ source: 'a.pdf', score: 0.4 },
			{ source: 'b.md', score: 0.9 },
			{ source: 'a.pdf', score: 0.8 }
		]);
		expect(out).toEqual([
			{ source: 'a.pdf', score: 0.8 },
			{ source: 'b.md', score: 0.9 }
		]);
	});
});

describe('buildChatContext', () => {
	const messages = [{ role: 'user', content: 'question' }];

	test('place le message système en tête', () => {
		const { chatMessages } = buildChatContext(messages);
		expect(chatMessages[0]).toEqual({ role: 'system', content: DEFAULT_SYSTEM_PROMPT });
		expect(chatMessages[1]).toEqual({ role: 'user', content: 'question' });
	});

	test('respecte l\'ordre règles, profil, base de connaissances', () => {
		const { chatMessages } = buildChatContext(messages, {
			systemPrompt: 'RÈGLES',
			userProfile: { name: 'PL' },
			ragHits: [{ content: 'extrait', source: 'a.md', score: 1 }]
		});
		const content = chatMessages[0].content;
		expect(content.indexOf('RÈGLES')).toBe(0);
		expect(content.indexOf('[User Profile]')).toBeGreaterThan(content.indexOf('RÈGLES'));
		expect(content.indexOf('[Knowledge Base]')).toBeGreaterThan(content.indexOf('[User Profile]'));
	});

	test('n\'ajoute le marqueur de raisonnement que sur demande', () => {
		expect(buildChatContext(messages).chatMessages[1].content).toBe('question');
		expect(buildChatContext(messages, { noThink: true }).chatMessages[1].content).toBe(
			'question /no_think'
		);
	});

	test('renvoie les sources dédupliquées et filtrées', () => {
		const { ragSources } = buildChatContext(messages, {
			ragHits: [
				{ content: 'x', source: 'a.md', score: 1 },
				{ content: 'y', source: 'a.md', score: 0.9 },
				{ content: 'z', source: 'bruit.md', score: 0.1 }
			]
		});
		expect(ragSources).toEqual([{ source: 'a.md', score: 1 }]);
	});

	test('sans résultat documentaire, aucune source et aucun bloc', () => {
		const { chatMessages, ragSources } = buildChatContext(messages, { ragHits: [] });
		expect(ragSources).toEqual([]);
		expect(chatMessages[0].content).not.toContain('[Knowledge Base]');
	});

	test('ne mute pas les messages d\'entrée', () => {
		const input = [{ role: 'user', content: 'question' }];
		buildChatContext(input, { noThink: true });
		expect(input[0].content).toBe('question');
	});
});
