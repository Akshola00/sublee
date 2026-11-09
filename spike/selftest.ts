import { generateClientKeys, encryptTo, decryptWith } from './e2ee.ts';
const k = generateClientKeys();
const ct = encryptTo(k.publicHex, 'hello enclave 🩺');
console.log('roundtrip:', decryptWith(k.secret, ct) === 'hello enclave 🩺');
const bad = ct.slice(0, -2) + (ct.endsWith('0') ? '1' : '0');
try { decryptWith(k.secret, bad); console.log('tamper: NOT detected'); } catch { console.log('tamper: detected'); }
