# Sublee Contract — CLAUDE.md

Rust NEAR contract: NEP-171 prompt NFTs + NEP-177 metadata + NEP-199 royalties + a pay-per-consult ledger. Read `../docs/SPEC.md` §5 for intent. **This file wins on conflict.**

## 0. Non-negotiables

1. **All money is integers.** NEAR in yoctoNEAR (`u128` / `NearToken`), USDC in its 6-decimal base units, fiat in USD cents. No floats anywhere.
2. **Never trust attached deposit implicitly.** Check `attached_deposit >= price` and refund any excess in the same call.
3. **Server-only methods** (`credit_fiat`, `mark_used`, `refund`) assert `predecessor == server_account_id`. The server signs with a function-call access key limited to exactly those methods.
4. **Idempotency:** `credit_fiat` is keyed on the Stripe session id; a repeat is a no-op, never a double credit.
5. **State transitions are one-way:** Consult `Paid → Used` or `Paid → Refunded`. Anything else panics.
6. **The contract never sees plaintext prompts.** `sealed_prompt` is opaque hex, with a length cap (≤ 16 KB) to bound storage.
7. **Storage is paid by the caller.** Minting needs a deposit covering storage; refund the unused part.
8. Emit NEP-297 events (`nft_mint`, plus custom `consult_paid`, `consult_used`, `consult_refunded`, `consult_rated`) for the indexer-free UI.

## 1. Stack

| Concern | Choice |
|---|---|
| SDK | `near-sdk` 5.x (latest stable, pin exact), `near-contract-standards` for NEP-171/177/199 |
| Build | `cargo-near` (`cargo near build non-reproducible-wasm` for dev) |
| Tests | Unit tests in-crate + `near-workspaces` sandbox integration tests (with a mock FT for USDC) |
| Network | testnet. Contract account `sublee.testnet` (or similar), server account `sublee-server.testnet` |
| USDC | testnet USDC contract (verify the current id in NEAR docs); a mock FT in tests |

## 2. Layout

```
src/
  lib.rs        # Contract struct, init, NFT standard impl wiring
  prompts.rs    # mint_prompt, update_prompt, list/get views
  consults.rs   # pay_consult_near, ft_on_transfer, pay_consult_credit, mark_used, refund, rate
  fiat.rs       # credit_fiat, balance_of
  payout.rs     # split math (85/15) — pure fns, unit tested
  events.rs     # NEP-297 event structs
tests/
  integration.rs
scripts/        # deploy.sh, seed.sh (mint demo prompts), using near-cli-rs
```

## 3. Done means

- `cargo test` (unit) and the integration suite pass, covering: correct split, excess refund, underpay panics, non-server panics on server methods, idempotent `credit_fiat`, one rating per used consult, double-`mark_used` panics.
- Deployed to testnet, and `scripts/seed.sh` mints the demo prompts.
- The ABI/method list is copied into `web/src/lib/contract.ts`.
