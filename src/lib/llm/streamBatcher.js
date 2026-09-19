/**
 * Regroupement des jetons reçus en streaming.
 * Batching of streamed tokens.
 *
 * Réécrire le tableau réactif des messages à chaque jeton met une pression
 * énorme sur le ramasse-miettes en mobile, au point que le navigateur peut
 * recharger l'onglet. On accumule donc les fragments et on ne pousse qu'une
 * fois par trame d'affichage.
 *
 * Rewriting the reactive messages array on every token puts enormous pressure
 * on the garbage collector on mobile, to the point where the browser may
 * reload the tab. So we accumulate fragments and push only once per frame.
 */

/**
 * @param {(content: string) => void} onFlush - Reçoit le texte accumulé.
 * @param {(cb: () => void) => void} [schedule] - Planificateur, injectable
 *   pour les tests (passer `fn => fn()` pour un comportement synchrone).
 * @returns {{ push: (delta: string) => void, flush: () => void, discard: () => void }}
 */
export function createStreamBatcher(onFlush, schedule = requestAnimationFrame) {
	let pending = '';
	let scheduled = false;

	function flush() {
		scheduled = false;
		if (!pending) return;
		const content = pending;
		pending = '';
		onFlush(content);
	}

	return {
		/**
		 * Accumule un fragment et planifie une poussée.
		 * Accumulates a fragment and schedules a push.
		 */
		push(delta) {
			if (!delta) return;
			pending += delta;
			if (!scheduled) {
				scheduled = true;
				schedule(flush);
			}
		},

		/**
		 * Pousse immédiatement ce qui reste. À appeler en fin de génération.
		 * Pushes whatever remains immediately. Call at the end of generation.
		 */
		flush,

		/**
		 * Jette ce qui est en attente sans le pousser. Sert quand le modèle
		 * finit par un appel d'outil : le texte partiel accumulé ne doit pas
		 * apparaître dans la réponse.
		 * Drops what is pending without pushing it. Used when the model ends
		 * with a tool call: the accumulated partial text must not show up in
		 * the answer.
		 */
		discard() {
			pending = '';
			scheduled = false;
		}
	};
}
