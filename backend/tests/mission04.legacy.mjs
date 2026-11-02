import './mission03.setup.mjs';
import {describe,it,before,beforeEach,afterEach,after} from 'node:test';
Object.assign(globalThis,{describe,it,before,beforeEach,afterEach,after});
await import('./venteCarbone.test.js');
await import('./venteCarboneFrontendContract.test.js');
