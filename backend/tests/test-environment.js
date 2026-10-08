// Live integration tests mutate fixtures: never run them against the developer's .env database.
const live = process.env.RUN_LIVE_INTEGRATION === "1";
if (live && (!process.env.INTEGRATION_TEST_DATABASE_URL || !process.env.INTEGRATION_TEST_EMAIL || !process.env.INTEGRATION_TEST_PASSWORD)) {
    throw new Error("Live integration requires a dedicated seeded INTEGRATION_TEST_DATABASE_URL, INTEGRATION_TEST_EMAIL and INTEGRATION_TEST_PASSWORD.");
}
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = live ? process.env.INTEGRATION_TEST_DATABASE_URL : "postgresql://test:test@127.0.0.1:1/prorecup_test";
process.env.JWT_SECRET = "prorecup-local-test-secret-not-for-production-2026";
process.env.SKIP_DATABASE_STARTUP_CHECK = "1";
process.env.RESEND_API_KEY = "";

export const liveIntegrationEnabled = live;
