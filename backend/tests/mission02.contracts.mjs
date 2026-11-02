// Reuse dependency-free Mocha-style regression contracts with the native Node runner.
import { describe, it } from 'node:test';
globalThis.describe = describe;
globalThis.it = it;
await import('./peseeRules.test.js');
await import('./peseeFrontendContract.test.js');
await import('./qrTracabiliteFrontendContract.test.js');
await import('./backendEncoding.test.js');
