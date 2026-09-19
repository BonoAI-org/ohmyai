/**
 * Vérifications d'interface, à exécuter dans la page via Chrome DevTools.
 * Interface checks, run inside the page through Chrome DevTools.
 *
 * Ce fichier contient une unique expression de fonction : son contenu se passe
 * tel quel au paramètre `function` de l'outil `evaluate_script`. Un seul appel
 * suffit donc pour l'ensemble des contrôles, et le résultat est un objet JSON
 * listant ce qui passe et ce qui échoue.
 *
 * This file holds a single function expression: its content is passed verbatim
 * to the `function` parameter of the `evaluate_script` tool. One call therefore
 * covers every check, and the result is a JSON object listing what passes and
 * what fails.
 *
 * Voir e2e/README.md pour la marche à suivre complète.
 * See e2e/README.md for the full procedure.
 */
async () => {
	const results = { passed: [], failed: [] };
	const check = (name, condition, detail) => {
		if (condition) results.passed.push(name);
		else results.failed.push({ name, detail: detail ?? 'condition fausse' });
	};
	const q = (s) => document.querySelector(s);
	const qa = (s) => [...document.querySelectorAll(s)];
	const wait = (ms) => new Promise((r) => setTimeout(r, ms));
	const visible = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

	// L'internationalisation se charge de façon asynchrone.
	// Internationalization loads asynchronously.
	await wait(1500);
	const body = document.body.innerText;

	// --- Page principale ---
	check('titre « Oh my AI! » affiché', /Oh my AI!/.test(body));
	check('en-tête présent', visible(q('header')));
	check('zone de saisie présente', visible(q('textarea')));
	check(
		'bouton nouvelle conversation présent',
		qa('header button').some((b) => /New|Nouveau/i.test(b.innerText))
	);

	// --- Sélecteur de modèle ---
	const selector = q('.model-selector-container');
	check('conteneur du sélecteur de modèle présent', !!selector);
	if (selector) {
		const trigger = selector.querySelector('button');
		trigger.click();
		await wait(300);
		check('le menu de modèles s\'ouvre', trigger.getAttribute('aria-expanded') === 'true');
		check('le menu liste un modèle Qwen', /Qwen/.test(selector.innerText));

		// Un clic ailleurs doit refermer le menu.
		q('header').click();
		await wait(300);
		check(
			'le menu se ferme au clic extérieur',
			trigger.getAttribute('aria-expanded') === 'false' && selector.children.length === 1
		);
	}

	// --- Zone de chat ---
	const textarea = q('textarea');
	check('une seule zone de saisie', qa('textarea').length === 1, `${qa('textarea').length} trouvées`);
	if (textarea) {
		const native = Object.getOwnPropertyDescriptor(
			window.HTMLTextAreaElement.prototype,
			'value'
		).set;
		native.call(textarea, 'Bonjour le monde');
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		await wait(200);
		check('la zone de saisie accepte du texte', textarea.value === 'Bonjour le monde');
		native.call(textarea, '');
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
	}
	check(
		'bouton d\'envoi présent',
		qa('button[aria-label]').some((b) => /send|envoy/i.test(b.getAttribute('aria-label')))
	);
	check(
		'message d\'accueil affiché quand la conversation est vide',
		/Start a conversation|Démarrez une conversation|WebAssembly/.test(body)
	);

	// --- Panneau historique ---
	const historyBtn = qa('header button').find((b) =>
		/histori|history/i.test(b.innerText + b.title + (b.ariaLabel ?? ''))
	);
	check('bouton historique présent', !!historyBtn);
	if (historyBtn) {
		historyBtn.click();
		await wait(400);
		check(
			'le panneau historique s\'ouvre',
			qa('h2, h3').some((h) => /histori|history/i.test(h.innerText))
		);
		const close = qa('button').find((b) => /^(✕|×|Fermer|Close)$/.test(b.innerText.trim()));
		close?.click();
		await wait(300);
	}

	// --- Modale des paramètres ---
	const settingsBtn = qa('header button').find((b) =>
		/ettings|aramètre/i.test((b.getAttribute('aria-label') ?? '') + (b.title ?? ''))
	);
	check('bouton paramètres présent', !!settingsBtn);
	if (settingsBtn) {
		settingsBtn.click();
		await wait(400);
		check('la modale des paramètres s\'ouvre', visible(q('.fixed.inset-0')));
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		q('.fixed.inset-0')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await wait(300);
	}

	// --- Thème ---
	const root = q('div.h-screen');
	check('fond dégradé sur la racine', !!root && /from-slate/.test(root.className));

	// --- Internationalisation ---
	check('aucune clé i18n brute affichée', !/header\.new|chat\.typePlaceholder/.test(body));

	// --- Accessibilité ---
	check('des boutons portent aria-label ou title', qa('button[aria-label], button[title]').length > 0);
	const placeholder = q('textarea')?.getAttribute('placeholder');
	check('la zone de saisie a un placeholder', !!placeholder && placeholder.length > 0);

	results.total = results.passed.length + results.failed.length;
	results.ok = results.failed.length === 0;
	return results;
}
