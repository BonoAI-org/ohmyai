import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	timeout: 30000,
	retries: 0,
	use: {
		baseURL: 'http://localhost:4242',
		screenshot: 'only-on-failure'
	},
	webServer: {
		command: 'bun run dev',
		port: 4242,
		reuseExistingServer: true
	},
	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' }
		}
	]
});
