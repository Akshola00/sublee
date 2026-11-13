# Sublee

**A private medical second opinion.** Your case is encrypted in your browser, to a key that exists only inside a hardware enclave running the AI model on NEAR AI Cloud. Sublee's server forwards ciphertext and can't read it. The specialists are secret prompts minted as NFTs; whoever owns the NFT earns 85% of every consult, and nobody (patients included) can read or copy the prompt.

Built for NEAR HACKATHON. Tracks: **privacy** (primary), **nfts**, **realworld**. Everything runs on **NEAR testnet**.

> Sublee gives second opinions, not diagnoses. The demo specialists and sample cases are fictional.

---

## Try it (about 3 minutes)

1. Open the app and **Sign in**: with your email (Privy makes you a NEAR testnet account and we add 0.3 test NEAR), or with any NEAR testnet wallet (HOT, Meteor, MyNearWallet, Intear).
2. Pick a specialist, e.g. *General practice second look*.
3. **Pay** with NEAR, testnet USDC, or card credit. Card payments run in Stripe test mode (card `4242 4242 4242 4242`). When Stripe isn't configured, the card option offers free test credit instead, and says so.
4. Click a **sample case** (e.g. *Tired, odd blood test*), or write your own. You can attach a PDF lab report: its text is read on your device and encrypted with the case. The file itself is never uploaded.
5. **Encrypt and send.** Watch the checks run: the enclave proves it's genuine before anything leaves your browser.
6. Read the opinion, rate it (on-chain), and **Save to this device**. Your history is encrypted with a key your wallet creates. Open it later under **History**.

**Authors:** go to **For experts**, write a prompt, set prices, and **Seal and mint**. The prompt is sealed in the browser before minting. Manage prices, pausing and USDC earnings under **My specialists**.

## What's private, and from whom

| Data | Your browser | Sublee server | Prompt author | NEAR AI gateway | Model enclave |
|---|---|---|---|---|---|
| Your case and attachments | yes | ciphertext only | no | ciphertext only | yes |
| The opinion | yes | ciphertext only | no | ciphertext only | yes |
| The specialist prompt | no | yes, in memory for one call | yes | ciphertext only | yes |
| That a consult happened (wallet, specialist, price) | yes | yes | yes | yes | — |

**Honest limits:**
- **Payments are public.** Payment metadata is on-chain, so anyone can see that your wallet paid for a consult with a given specialist. Your case and the answer are not on-chain.
- **The server sees prompts.** It holds prompt plaintext in memory for the length of one call. Moving that unseal step into a TEE is future work.
- **Attachments are text only.** Images aren't sent yet; photos are refused with a message.

## How it works

```
browser ──(1) fetch attestation report + fresh nonce──────────────▶ NEAR AI Cloud
browser ──(2) verify: key bound to Intel TDX quote, nonce, GPU ───▶ /api/attest (Intel DCAP + NVIDIA NRAS chains)
browser ──(3) encrypt case to the attested enclave key (E2EE v2)
browser ──(4) NEP-413 wallet signature over consultId + sha256(ciphertext)
        ──────────────────────────────────────────────────────────▶ /api/consult
/api/consult: verify signature → read consult on-chain (Paid, yours) → claim (atomic lock)
             → unseal prompt → re-encrypt safety rules + prompt to the same enclave key
             → forward to NEAR AI → stream ciphertext back → mark_used (pays out) or refund
browser ──(5) decrypt stream, verify the enclave's response signature + response hash
```

- **Encryption:** NEAR AI Cloud E2EE v2: Ed25519 → X25519 ECDH, HKDF-SHA256, XChaCha20-Poly1305, with a fresh ephemeral key per message (`@noble/*`).
- **Attestation checks:**
  - The model key sits in the TDX quote's `report_data`.
  - Our nonce is in the quote and in the GPU evidence.
  - Intel DCAP verifies the quote (`@phala/dcap-qvl-node`).
  - NVIDIA NRAS verifies the GPU.
  - After the answer: the enclave's ed25519 signature over `sha256(request):sha256(response)`.
  - A check that didn't run is shown as not verified, never as passed.
- **Secret prompts:** an X25519 sealed box to Sublee's prompt key, stored on-chain in the NFT. Sublee's fixed safety preamble and answer format always come before the author's prompt.
- **Local history:** IndexedDB, with AES-GCM under HKDF(NEP-413 signature of a fixed message). Delete one entry or all of them.

## NEAR features used

- **NFTs (NEP-171/177/181)** for specialists; royalties follow the current owner.
- **Escrowed consult ledger:** `Paid → Claimed → Used` or `→ Refunded`. The 85/15 split is released only when an answer is delivered.
- **Payment in NEAR, in USDC** (`ft_transfer_call`, NEP-141), **or card credit** (`credit_fiat`, idempotent on the Stripe session id).
- **Function-call access key:** the server's key can call only `claim`, `mark_used`, `refund` and `credit_fiat`. It can't move funds.
- **Email sign-in via Privy** (`@peerfolio/privy-near-connect`): an embedded key controls a NEAR implicit account, signing in a same-site popup.
- **NEP-413 signed messages** authorise each consult and each cancellation, and derive the history key.
- **NEAR AI Cloud** private inference with attestation.

Contract: [`sublee.testnet`](https://testnet.nearblocks.io/address/sublee.testnet) · source in [`contract/`](contract/) (Rust, near-sdk 5.29.1, 28 tests).

## Status (be precise, judges)

| Works on testnet, verified | Not verified yet |
|---|---|
| Mint (sealed prompt), pay NEAR, escrow, claim, refund, cancel | A full AI answer end to end: blocked on NEAR AI Cloud credits at the time of writing |
| Attestation 5/5 checks against live NEAR AI enclaves | Response-signature check (needs a real answer) |
| Encrypted request reaches NEAR AI; on failure the consult is refunded automatically | Stripe Checkout with a live test key (the code path is built; the test-credit stand-in is verified) |
| Test card credit → pay from credit | Wallet popups in every supported wallet |
| Encrypted local history, PDF text extraction (browser checks) | |

**When NEAR AI is out of credits,** the enclave still passes every check, but it can't answer. The patient is refunded, and can view an **example answer written in advance**. The example is shown under a banner saying it is not generated, not about their case, not signed and not saved.

## Run it locally

```bash
# contract (optional: it's already deployed)
cd contract && cargo test && cargo near build non-reproducible-wasm

# web
cd web && pnpm install
cp ../.env.example ../.env   # fill in values; web/.env.local -> ../.env
pnpm dev                     # http://localhost:3000
pnpm exec vitest run         # crypto, units, webhook signature tests
```

| Env var | What |
|---|---|
| `NEARAI_API_KEY` | NEAR AI Cloud key (server only) |
| `PROMPT_SEAL_SECRET` | X25519 secret for prompt sealing |
| `CONTRACT_ID`, `NEAR_NETWORK` | `sublee.testnet`, `testnet` |
| `SERVER_ACCOUNT_ID`, `SERVER_PRIVATE_KEY` | function-call key for the server account |
| `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_PRIVY_CLIENT_ID` | Privy app (public ids) for email sign-in; without them only NEAR wallets are offered |
| `FUNDER_ACCOUNT_ID`, `FUNDER_PRIVATE_KEY` | testnet account that tops up new email accounts with 0.3 NEAR |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | optional; `sk_test_…` only. Without them, card credit uses testnet test credit |

Scripts in `web/scripts/` (run with `npx tsx`):
- `seed.ts`: mint the demo specialists.
- `e2e-consult.mts`: pay, attest, encrypt, consult and settle, headless.
- `e2e-mint.mts`: mint a specialist the same way the Create page does.
- `e2e-cancel.mts`: refund unused consults.

## Repo

- `contract/`: Rust contract.
- `web/`: Next.js 16 app and route handlers.
- `spike/`: the throwaway proof of E2EE and attestation.
- `docs/SPEC.md`: product and technical spec.
- `docs/DESIGN.md`: visual spec.

The server never logs request or response bodies.
