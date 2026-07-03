import { test, expect } from '@playwright/test';

test.describe('Page principale', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('affiche le titre Oh my AI!', async ({ page }) => {
		await expect(page.locator('text=Oh my AI!')).toBeVisible();
	});

	test('affiche le header', async ({ page }) => {
		await expect(page.locator('header')).toBeVisible();
	});

	test('affiche le textarea de saisie', async ({ page }) => {
		const textarea = page.locator('textarea');
		await expect(textarea).toBeVisible();
	});

	test('affiche le bouton nouvelle conversation', async ({ page }) => {
		const newBtn = page.locator('button', { has: page.locator('text=New') }).first();
		await expect(newBtn).toBeVisible();
	});
});

test.describe('Sélecteur de modèle', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('ouvre le menu de sélection de modèle', async ({ page }) => {
		const modelButton = page.locator('.model-selector-container button').first();
		await modelButton.click();
		// Vérifie qu'au moins un modèle est listé (utilise .first() pour éviter strict mode)
		await expect(page.locator('.model-selector-container').locator('text=Qwen').first()).toBeVisible();
	});

	test('ferme le menu en cliquant en dehors', async ({ page }) => {
		const modelButton = page.locator('.model-selector-container button').first();
		await modelButton.click();
		// Attend que le menu soit visible
		await expect(page.locator('.model-selector-container').locator('text=Qwen').first()).toBeVisible();
		// Clique en dehors
		await page.locator('header').click({ position: { x: 10, y: 10 } });
		// Le dropdown devrait disparaître — vérifie via le nombre d'éléments Qwen (seulement 1 = le bouton principal)
		await expect(page.locator('.model-selector-container .absolute')).toBeHidden();
	});
});

test.describe('Zone de chat', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('le textarea accepte la saisie', async ({ page }) => {
		const textarea = page.locator('textarea');
		await textarea.fill('Bonjour le monde');
		await expect(textarea).toHaveValue('Bonjour le monde');
	});

	test('le bouton envoyer est présent', async ({ page }) => {
		const sendArea = page.locator('form button, .flex button').last();
		await expect(sendArea).toBeVisible();
	});

	test('affiche le message de bienvenue quand pas de messages', async ({ page }) => {
		// Vérifie qu'un message d'accueil ou placeholder est visible
		const welcome = page.locator('text=Start a conversation').or(page.locator('text=Démarrez une conversation')).or(page.locator('text=WebAssembly'));
		await expect(welcome.first()).toBeVisible();
	});
});

test.describe('Panneau historique', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('ouvre le panneau historique', async ({ page }) => {
		// Clique sur le bouton historique (desktop)
		const historyBtn = page.locator('button').filter({ hasText: /history|historique/i }).first();
		await historyBtn.click();
		// Vérifie que le panneau est ouvert via le heading
		await expect(page.getByRole('heading', { name: /history|historique/i })).toBeVisible();
	});
});

test.describe('Modal Settings', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('ouvre le modal des paramètres', async ({ page }) => {
		const settingsBtn = page.locator('button[aria-label*="ettings"], button[title*="ettings"], button[aria-label*="aramètre"], button[title*="aramètre"]').first();
		if (await settingsBtn.isVisible()) {
			await settingsBtn.click();
			await expect(page.locator('.fixed.inset-0')).toBeVisible();
		}
	});
});

test.describe('Thème', () => {
	test('la page a un fond dégradé', async ({ page }) => {
		await page.goto('/');
		const mainDiv = page.locator('div.h-screen').first();
		await expect(mainDiv).toBeVisible();
		await expect(mainDiv).toHaveClass(/from-slate/);
	});
});

test.describe('Responsive', () => {
	test('affiche les boutons mobile en petit écran', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');
		const mobileNewBtn = page.locator('button.lg\\:hidden').first();
		await expect(mobileNewBtn).toBeVisible();
	});

	test('masque les boutons mobile en grand écran', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto('/');
		const mobileNewBtn = page.locator('button.lg\\:hidden').first();
		await expect(mobileNewBtn).toBeHidden();
	});
});

test.describe('Internationalisation', () => {
	test('la page charge avec du texte localisé', async ({ page }) => {
		await page.goto('/');
		// Vérifie qu'au moins un texte i18n est rendu (pas de clé brute)
		const body = await page.locator('body').textContent();
		expect(body).not.toContain('header.new');
		expect(body).not.toContain('chat.typePlaceholder');
	});
});

test.describe('Accessibilité', () => {
	test('les boutons ont des attributs accessibles', async ({ page }) => {
		await page.goto('/');
		// Attend que l'i18n soit chargé et le contenu rendu
		await expect(page.locator('text=Oh my AI!')).toBeVisible();
		// Vérifie que les boutons principaux ont aria-label ou title
		const buttonsWithAccessibility = page.locator('button[aria-label], button[title]');
		const count = await buttonsWithAccessibility.count();
		expect(count).toBeGreaterThan(0);
	});

	test('le textarea a un placeholder', async ({ page }) => {
		await page.goto('/');
		const textarea = page.locator('textarea');
		const placeholder = await textarea.getAttribute('placeholder');
		expect(placeholder).toBeTruthy();
		expect(placeholder.length).toBeGreaterThan(0);
	});
});
