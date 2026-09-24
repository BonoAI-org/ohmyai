import { describe, expect, it } from 'bun:test';
import { ASSUMED_THROUGHPUT_MB_PER_S, estimateMinutes } from './downloadEstimate.js';

describe('estimateMinutes', () => {
	it('convertit un poids en minutes au débit retenu', () => {
		// 2,6 Go à 10 Mo/s font 266 s, soit 4 min après arrondi.
		expect(estimateMinutes(2.6)).toBe(4);
		expect(estimateMinutes(5.5)).toBe(9);
	});

	it('ne descend jamais sous la minute', () => {
		expect(estimateMinutes(0.05)).toBe(1);
	});

	it('rend null pour un poids inconnu ou absurde', () => {
		expect(estimateMinutes(null)).toBeNull();
		expect(estimateMinutes(0)).toBeNull();
		expect(estimateMinutes(-3)).toBeNull();
		expect(estimateMinutes(NaN)).toBeNull();
	});

	it('accepte un autre débit', () => {
		expect(estimateMinutes(1, 1024)).toBe(1);
		expect(estimateMinutes(2.6, 5)).toBe(9);
	});

	it('expose une hypothèse de débit documentée', () => {
		expect(ASSUMED_THROUGHPUT_MB_PER_S).toBeGreaterThan(0);
	});
});
