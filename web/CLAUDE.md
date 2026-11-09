# Sublee Web — CLAUDE.md

@AGENTS.md (Next.js 16.4.3: read `node_modules/next/dist/docs/` before writing route handlers or config; APIs differ from older Next.)

Next.js app (UI + route handlers). Read `../docs/SPEC.md` §4, §6–8 for intent and `../docs/DESIGN.md` for anything visual. **This file wins on conflict with the spec; DESIGN.md wins on anything a user sees.**

## 0. Non-negotiables

1. **Plaintext case data exists only in the browser.** Encryption happens client-side before any `fetch`. Route handlers receive ciphertext only. If a feature would need the server to read case data, stop and raise it.
2. **No body logging.** Route handlers never `console.log` request or response bodies, never forward them to error trackers, and return generic errors that don't echo input.
3. **Encrypt only to a verified key.** The client encrypts only to a `signing_public_key` from an attestation report whose checks passed with a nonce it generated in that session. No verification, no send.
4. **The prompt plaintext lives only in server memory**, for the duration of one `/api/consult` call. It is never returned to the client or logged.
5. **The chain is the ledger.** The server never trusts a client claim that a consult is paid; it reads contract state.
6. **Secrets are server-only.** Nothing secret goes in `NEXT_PUBLIC_*`. The API key and server NEAR key never reach the bundle.
7. **Honest UI.** A check that didn't run shows "not verified", never a green tick.

## 1. Stack (pin exact versions at install)

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router, latest stable), TypeScript `strict` |
| Package manager | pnpm |
| Styling | decided in DESIGN.md with the owner (until then: plain CSS modules, no UI kit) |
| Wallet | `@near-wallet-selector/*` (MyNearWallet, Meteor, HOT, Intear), testnet |
| Chain reads/writes | `near-api-js` (or `@near-js/*`); server signs with a function-call key |
| Crypto | `@noble/curves`, `@noble/hashes`, `@noble/ciphers` |
| Local history | IndexedDB (`idb`), AES-GCM key from HKDF over a NEP-413 signature |
| PDFs | `pdfjs-dist` (render pages to images or extract text client-side) |
| Payments | `stripe` (server) test mode, Checkout Sessions + webhook |
| Validation | Zod on every route handler input |
| Tests | Vitest for `lib/crypto` and `lib/attestation` (round-trip encrypt/decrypt, tamper fails) |
| Hosting | Vercel (owner's account) |

## 2. Layout

```
src/
  app/                   # routes per SPEC §8
    api/consult/route.ts
    api/prompt-key/route.ts
    api/stripe/checkout/route.ts
    api/stripe/webhook/route.ts
  lib/
    crypto/e2ee.ts       # NEAR AI E2EE v2 encrypt/decrypt (client + server use)
    crypto/seal.ts       # prompt sealed box (server unseal, browser seal)
    attestation.ts       # fetch + verify report, returns {checks[], modelPubKey}
    nearai.ts            # server: forward to cloud-api.near.ai with E2EE headers
    contract.ts          # typed contract calls/views
    wallet.ts            # wallet selector + NEP-413 signing
    history.ts           # encrypted IndexedDB
    schema.ts            # opinion response Zod schema
  components/
```

## 3. Done means (per feature)

Verified by running it: the flow works in the browser on testnet with real E2EE, and a network-tab check shows no plaintext case data in any request leaving the browser except the encrypted payload.
