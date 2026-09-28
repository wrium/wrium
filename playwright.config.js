import { defineConfig, devices } from '@playwright/test';

/**
 * Runs against a Vite dev server serving the project as-is, so fixtures
 * import straight from src/wrium.js - real browser, current source, no
 * build step in between. A separate check against the built dist/ output
 * belongs in the release process, not this suite.
 */
export default defineConfig({
    testDir: './e2e/tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:5183',
        trace: 'retain-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        // Vite serves the project root, but there's no root index.html (each
        // fixture is its own entry point), so `/` 404s and Playwright's
        // readiness probe needs a URL that actually resolves.
        command: './node_modules/.bin/vite --port 5183 --strictPort',
        url: 'http://localhost:5183/e2e/fixtures/login-form/index.html',
        reuseExistingServer: !process.env.CI,
    },
});
