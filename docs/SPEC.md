# Sublee: Product & Technical Specification

**Version:** 0.1 (hackathon MVP) · **Status:** draft for owner review · **Event:** NEAR HACKATHON, dev ends **2026-11-14 23:59 UTC**
**Tracks:** `privacy` (primary), `nfts`, `realworld` (fiat + stablecoin)

---

## 1. Premise

You have a diagnosis, a lab report or a scan result, and you want a second opinion. You don't want your medical history sitting on someone's server, training someone's model or leaking in a breach.

Sublee encrypts your case **in your browser**, to a key that exists only inside a hardware enclave (TEE) running the model on NEAR AI Cloud. Sublee's own server forwards ciphertext and never sees your data. The enclave proves what it is (attestation) and signs its answer.

The model's expertise comes from **specialist prompts sold as NFTs**. A cardiologist (or anyone with real expertise) writes a prompt that makes the model reason like a specialist, mints it, and earns a royalty every time someone consults it. The prompt is secret too: users can't read or copy it, and Sublee re-encrypts it straight to the enclave.

**Two-sided privacy:** the patient's data is hidden from Sublee and the prompt author, and the author's prompt is hidden from the patient.

Payment is in NEAR, USDC or a card.

---

## 2. Core loop

1. **Connect:** sign in with a NEAR wallet (testnet).
2. **Choose a specialist:** browse prompt NFTs (title, specialty, author, price, rating, uses).
3. **Pay:** pay per consult in NEAR or USDC (on-chain), or with a card (Stripe → credit on the contract).
4. **Describe the case:** symptoms (text), age/sex/meds/history (structured form), attachments (lab PDFs and images).
5. **Verify:** the app fetches a fresh attestation for the model, verifies it and shows a **Verified** panel.
6. **Encrypt & send:** the browser encrypts every message to the verified model key. The server adds the encrypted specialist prompt and forwards the request.
7. **Read the opinion:** a structured second opinion, decrypted in the browser.
8. **Keep it private:** history is stored only in the browser (IndexedDB, encrypted with a key derived from a wallet signature). Delete it anytime.

---

## 3. Actors

| Actor | Can |
|---|---|
| Patient | Pay, consult, rate, keep or delete local history |
| Prompt author | Write a prompt, mint it as an NFT, set its price, earn royalties |
| NFT owner | Receives royalties (the NFT can be sold or transferred; royalties follow the owner) |
| Sublee server | Proxy (holds the NEAR AI API key), seals prompts to the TEE, credits fiat payments, marks consults used |
| NEAR AI TEE | Runs the model, decrypts requests, encrypts responses to the client, signs responses |

---

## 4. Privacy model (the core of the pitch; must be true, not marketing)

### 4.1 What each party can see

| Data | Patient browser | Sublee server | Prompt author | NEAR AI gateway | Model TEE |
|---|---|---|---|---|---|
| Case text and attachments | ✅ | ❌ ciphertext | ❌ | ❌ ciphertext | ✅ |
| Second-opinion response | ✅ | ❌ ciphertext | ❌ | ❌ ciphertext | ✅ |
| Specialist prompt text | ❌ | ✅ (see 4.3) | ✅ (wrote it) | ❌ ciphertext | ✅ |
| That a consult happened (wallet, prompt id, time, price) | ✅ | ✅ | ✅ (on-chain) | ✅ (metadata) | — |

The last row is the honest limit: **payment metadata is public on-chain**. The README must say so. Mitigation (stretch): fiat consults use a server-side credit, so the patient's wallet isn't linked to a specific prompt on-chain.

### 4.2 Encryption (NEAR AI E2EE protocol v2, verified working 2026-11-09)

- Model key: `GET https://cloud-api.near.ai/v1/attestation/report?model=…&provider=near&signing_algo=ed25519&include_tls_fingerprint=false&nonce=<32B hex>`, header `x-no-aliasing: true`. No API key needed. Use `model_attestations[].signing_public_key` after verification.
- Cipher: Ed25519 → X25519 ECDH, HKDF-SHA256 (info `ed25519_encryption`), XChaCha20-Poly1305, with a fresh ephemeral key per message. Wire format is hex: `eph_pub(32) ‖ nonce(24) ‖ ct+tag`.
- Request headers: `X-Signing-Algo: ed25519`, `X-Client-Pub-Key`, `X-Model-Pub-Key`, `X-Encryption-Version: 2`, `x-no-aliasing: true`.
- The response `content` / `reasoning_content` comes back encrypted to the client key.
- Libraries: `@noble/curves`, `@noble/hashes`, `@noble/ciphers` (browser-safe, audited).
- E2EE-capable vision models (attestation confirmed): `z-ai/glm-5.3-flash` (**default**: cheap, vision, 1M context), `Qwen/Qwen3.8-27B`, `deepseek-ai/DeepSeek-V4.1-Flash-1017`, `Qwen/Qwen3-VL-30B-A3B-Instruct`. Model choice is a per-prompt NFT field, limited to this allowlist.

**Must spike first:** confirm image content parts (`image_url` data URIs) are encrypted and accepted under E2EE. Fallback: client-side OCR / PDF text extraction (pdf.js), so only text is sent.

### 4.3 Secret prompts

- At mint time the browser seals the prompt text to the **Sublee prompt key** (X25519 sealed box, public key published by the server). Only the ciphertext goes on-chain in the token's `extra`.
- Per consult, the server unseals the prompt and immediately re-encrypts it as the system message to the same verified model key the client used. Plaintext lives in server memory only for that call.
- Honest limit: the Sublee server is trusted with prompt plaintext. Stretch (post-hackathon): run the unseal step in a TEE (OutLayer / Phala) so nobody holds prompt plaintext.
- Prompt injection defence: a fixed Sublee safety preamble (not medical advice, red-flag escalation, no prescribing) is always sent **before** the author prompt, and the response schema is fixed by Sublee.

### 4.4 Verification panel (judges will look for this)

Checks shown to the user, each pass/fail:
1. Nonce we generated appears in the attestation (freshness).
2. Signing key is bound to the TDX quote's report data.
3. Intel TDX quote verifies.
4. NVIDIA GPU attestation verifies.
5. The model key we encrypted to = the attested key.
6. Response signature verifies against the attested signing key (when available).

Exact verification steps follow `docs.near.ai/cloud/verification/*` and `near-examples/nearai-cloud-verification-example`. Run them in the browser where feasible, so the patient doesn't have to trust our server for this either.

### 4.5 Storage

- Server stores **no case data**: no logs of request or response bodies, ever. Enforced in code and stated in the README.
- Server DB holds only Stripe session → credit records and idempotency keys.
- Browser history is held in IndexedDB, encrypted with AES-GCM under a key derived (HKDF) from a deterministic NEP-413 wallet signature over a fixed message. Clear it with one button.

---

## 5. Smart contract (`contract/`, Rust, near-sdk)

One contract: NEP-171 NFT + NEP-177 metadata + NEP-199 royalties, plus a consult ledger. Testnet account e.g. `sublee.testnet`.

### 5.1 State

```
PromptToken (NFT, token_id)
  owner_id                 // receives per-use royalties
  creator_id
  metadata: title, description, media (icon), extra = JSON {
      specialty, model, price_yocto_near, price_usdc, sealed_prompt (hex),
      sample_output, version }
  uses: u64, rating_sum: u64, rating_count: u64, active: bool

Consult (consult_id: u64)
  patient_id, token_id, paid_with: Near | Usdc | Fiat, amount, created_at,
  status: Paid | Used | Refunded, rating: Option<u8>

balances: patient_id -> fiat credit (USD cents)   // credited by server after Stripe
```

### 5.2 Methods

| Method | Who | Effect |
|---|---|---|
| `mint_prompt(metadata, price…)` | anyone (payable, storage deposit) | Mints a prompt NFT to the caller |
| `update_prompt(token_id, price, active, sealed_prompt?)` | owner | Edit pricing/status; new prompt version |
| `pay_consult_near(token_id)` | patient, payable | Checks price, splits payment, creates Consult(Paid), emits event |
| `ft_on_transfer` (USDC) | USDC contract | msg = `{token_id}` → same split, Consult(Paid) |
| `pay_consult_credit(token_id)` | patient | Debits the fiat credit balance, creates Consult(Paid) |
| `credit_fiat(account, cents, stripe_session)` | server key only | Idempotent on `stripe_session` |
| `mark_used(consult_id)` | server key only | Paid → Used; increments `uses` |
| `refund(consult_id)` | server key only | Paid → Refunded (inference failed) |
| `rate(consult_id, 1..5)` | patient of a Used consult | Once per consult |
| views | anyone | `list_prompts`, `get_prompt`, `consults_for`, `balance_of`, NEP-171/177/199 views |

**Split:** 85% to the NFT's current owner, 15% to the Sublee treasury (constants in config). Fiat: the owner accrues a credit claimable in USDC (stretch; for MVP, show it as an accrued balance).

**Server key:** a function-call access key on a separate `server` account that can call only `credit_fiat`, `mark_used` and `refund`. This is the "function-call key" NEAR feature, so name it in the README.

---

## 6. Server (Next.js route handlers inside `web/`)

| Route | Does |
|---|---|
| `GET /api/prompt-key` | Returns the Sublee prompt sealing public key |
| `POST /api/consult` | Body: `{consult_id, model_pub_key, client_pub_key, encrypted_messages, nep413_signature}`. Verifies the signature is from the consult's patient, checks Consult is Paid on-chain, unseals the prompt, re-encrypts preamble + prompt to `model_pub_key`, forwards to NEAR AI with E2EE headers, streams the encrypted response back, calls `mark_used` (or `refund` on upstream failure). **Never logs bodies.** |
| `POST /api/stripe/checkout` | Creates a Checkout Session (test mode) for N consult credits |
| `POST /api/stripe/webhook` | On `checkout.session.completed` → `credit_fiat` (idempotent) |

Secrets live in env only: `NEARAI_API_KEY`, `PROMPT_SEAL_SECRET`, `SERVER_ACCOUNT_ID`, `SERVER_PRIVATE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CONTRACT_ID`.

---

## 7. Response format (fixed by Sublee)

The model returns JSON (via structured outputs if the model supports it under E2EE, else prompt-enforced plus validation):

```
{ summary, likely_explanations: [{condition, likelihood: low|medium|high, reasoning}],
  red_flags: [string], urgency: routine|soon|urgent|emergency,
  questions_for_your_doctor: [string], suggested_tests: [string],
  what_this_does_not_cover: string }
```

Always rendered with: "This is not a diagnosis. Talk to a licensed clinician." If `urgency = emergency`, show a full-screen banner with an instruction to seek emergency care, before anything else.

---

## 8. Screens (flow only; visuals come in the design spec, with owner input)

1. **Landing:** the privacy promise in one line, how it works (3 steps), CTA.
2. **Specialists:** a grid of prompt NFTs with filter by specialty, price, rating.
3. **Specialist detail:** description, sample output, author, uses, rating, model, price in NEAR / USDC / card.
4. **Pay:** method picker → wallet tx or Stripe Checkout → back with `consult_id`.
5. **Case intake:** structured form + free text + attachments (drag, drop, camera).
6. **Verify & send:** live verification checklist, then "Encrypted to enclave ✓", then streaming.
7. **Opinion:** structured result, urgency banner, "copy for your doctor", rate it.
8. **History:** local-only list, delete all.
9. **Create (author):** write prompt → test it on a sample case (paid at cost) → set price → mint.
10. **My prompts (author):** uses, rating, earnings.

Seeded demo content: 4–6 prompt NFTs (general practice, cardiology, dermatology (vision), lab-report interpreter, paediatrics, pharmacology interactions) and **fictional sample cases** judges can load with one click.

---

## 9. Out of scope for MVP (say so in the README)

Real clinicians, HIPAA/GDPR certification, mainnet, NEAR Intents any-chain payment (stretch), TEE-held prompt unsealing (stretch), multi-turn follow-up chat (stretch, cheap to add if time allows), voice intake via Whisper (stretch).

---

## 10. Build order (5 days)

| Day | Target (verify by) |
|---|---|
| **D1 · Mon 9–Tue 10** | Spike: Node script that verifies attestation → E2EE completion with text + image → decrypt (prints opinion). Scaffold `contract/` and `web/`. Contract core + tests. |
| **D2 · Tue 10** | Contract on testnet with seeded prompts. Web: wallet connect, specialists list from chain, pay with NEAR → consult id. `/api/consult` end-to-end with real E2EE. |
| **D3 · Wed 11** | Intake + verify panel + opinion rendering + local encrypted history. USDC payment. Design spec agreed with owner. |
| **D4 · Thu 12** | Stripe flow, author create/mint flow, ratings, apply design across all screens. Deploy to Vercel. |
| **D5 · Fri 13** | Polish, README for human and AI judges ("do X → see Y"), demo video script, buffer. **Sat 14:** submission (owner confirms the payload). |
