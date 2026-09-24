import { describe, expect, it } from 'bun:test';
import { createDownloadTracker, formatBytes } from './downloadProgress.js';

describe('createDownloadTracker', () => {
	it("reste indéterminé tant qu'aucune taille n'est connue", () => {
		const t = createDownloadTracker();
		expect(t.update({ status: 'download', file: 'a.onnx' }).percent).toBeNull();
	});

	it("rend le pourcentage d'un fichier unique", () => {
		const t = createDownloadTracker();
		const s = t.update({ status: 'progress', file: 'a', loaded: 250, total: 1000 });
		expect(s.percent).toBe(25);
		expect(s.file).toBe('a');
		expect(s.loadedBytes).toBe(250);
		expect(s.totalBytes).toBe(1000);
	});

	it('additionne les fichiers au lieu de repartir de zéro à chacun', () => {
		const t = createDownloadTracker();
		t.update({ status: 'progress', file: 'a', loaded: 500, total: 1000 });
		// Le second fichier ne remet pas le compteur à zéro : 500 sur 2000.
		const s = t.update({ status: 'progress', file: 'b', loaded: 0, total: 1000 });
		expect(s.percent).toBe(25);
		expect(s.file).toBe('b');
	});

	it('ne prétend jamais 100 pour cent tant que le suivi dure', () => {
		const t = createDownloadTracker();
		// Un premier fichier complet figerait une barre à cliquet à 100 %,
		// alors que les fichiers suivants arrivent encore.
		t.update({ status: 'progress', file: 'a', loaded: 1000, total: 1000 });
		expect(t.snapshot().percent).toBe(99);
		expect(t.update({ status: 'progress', file: 'b', loaded: 0, total: 1000 }).percent).toBe(50);
	});

	it('compte un fichier terminé pour sa taille entière', () => {
		const t = createDownloadTracker();
		t.update({ status: 'progress', file: 'a', loaded: 10, total: 1000 });
		t.update({ status: 'progress', file: 'b', loaded: 0, total: 1000 });
		expect(t.update({ status: 'done', file: 'a' }).percent).toBe(50);
	});

	it('ignore un chargé supérieur au total', () => {
		const t = createDownloadTracker();
		t.update({ status: 'progress', file: 'a', loaded: 5000, total: 1000 });
		t.update({ status: 'progress', file: 'b', loaded: 0, total: 1000 });
		expect(t.snapshot().percent).toBe(50);
	});

	it('tolère un événement vide', () => {
		const t = createDownloadTracker();
		expect(t.update(null).percent).toBeNull();
		expect(t.update(undefined).file).toBe('');
	});

	it('repart à zéro après reset', () => {
		const t = createDownloadTracker();
		t.update({ status: 'progress', file: 'a', loaded: 500, total: 1000 });
		t.reset();
		expect(t.snapshot()).toEqual({ percent: null, file: '', loadedBytes: 0, totalBytes: 0 });
	});
});

describe('formatBytes', () => {
	it('met en forme les unités binaires', () => {
		expect(formatBytes(0)).toBe('0 o');
		expect(formatBytes(512)).toBe('512 o');
		expect(formatBytes(1536)).toBe('1.5 Ko');
		expect(formatBytes(1024 * 1024 * 20)).toBe('20 Mo');
		expect(formatBytes(1024 ** 3 * 2.6)).toBe('2.6 Go');
	});

	it('rend 0 o pour une valeur absurde', () => {
		expect(formatBytes(-5)).toBe('0 o');
		expect(formatBytes(NaN)).toBe('0 o');
	});
});
