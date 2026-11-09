# Sublee

Private medical second opinions: the browser E2E-encrypts the case to a NEAR AI Cloud TEE, and specialist prompts are secret NFTs that earn their owners royalties. NEAR HACKATHON, dev ends **2026-11-14 23:59 UTC**.

Two independent packages. No workspace, no shared node_modules, no hoisting. Each installs and builds on its own.

- `contract/`: Rust near-sdk contract (prompt NFTs + consult ledger). See `contract/CLAUDE.md`.
- `web/`: Next.js app plus route handlers (proxy, Stripe). See `web/CLAUDE.md`.
- `spike/`: throwaway Node scripts proving NEAR AI E2EE + attestation. Never imported by `web/`.
- `docs/SPEC.md`: product + technical spec, shared by both packages. A package's CLAUDE.md wins on conflict.
- `docs/DESIGN.md`: visual/UX spec (written with the owner; authoritative for everything a user sees).

## Rules for every package

1. **Never log, persist or send plaintext case data server-side.** That includes request bodies, responses, errors that echo input, and analytics. This is the product, not a style choice.
2. **Secrets live in `.env*` only**, never in git. `.env.example` lists names with no values.
3. **Testnet only.** Never deploy to mainnet, sign mainnet transactions or spend real funds.
4. Work in one package at a time. If a task needs changes in two, say so first.
5. Never make the repo public, push, post on X or submit to the hackathon without the owner's explicit yes.
6. Commits: conventional style (`feat(web): …`), **no AI attribution lines of any kind**.
7. Pin dependency versions exactly. Check docs for current APIs instead of assuming them (NEAR SDKs change fast).

## Owner preferences

- Owner decides UI look, flow and features. Propose, don't impose, on anything user-visible.
- Hackathon velocity: working and visible beats clean, but no faked privacy claims. If something isn't actually encrypted or verified, the UI and README must not say it is.
- Rust teach mode is **off** for this repo (owner's call, 2026-11-09).
