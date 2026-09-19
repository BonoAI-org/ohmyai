import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
	testDir: 'e2e',
	timeout: 30000,
	// En CI, un échec isolé est souvent une bascule de timing : on réessaie.
	// On CI, an isolated failure is often a timing flake: retry it.
	retries: isCI ? 2 : 0,
	// Empêche un `test.only` oublié de faire passer une PR au vert.
	// Prevents a forgotten `test.only` from turning a PR green.
	forbidOnly: isCI,
	reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: 'http://localhost:4242',
		screenshot: 'only-on-failure'
	},
	webServer: {
		command: 'bun run dev',
		port: 4242,
		// En local on réutilise un serveur déjà lancé ; en CI il n'y en a jamais.
		// Locally we reuse a running server; on CI there is never one.
		reuseExistingServer: !isCI,
		// La première compilation de vite dev est lente sur un runner partagé.
		// Vite dev's cold compile is slow on a shared runner.
		timeout: 120_000
	},
	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' }
		}
	]
});
