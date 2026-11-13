# Sublee demo video: brief and script (Gate 1)

Pronunciation: **Sublee** = "SUB-lee" (rhymes with "bubbly" without the b).

## Brief

- **What:** private medical second opinions. Your case is encrypted in your browser to an AI model running inside sealed hardware on NEAR AI Cloud. Specialists are secret prompts minted as NFTs; owners earn 85% of every consult.
- **For:** anyone with a diagnosis, symptom or test result who wants a second look without handing their health data to another company.
- **The one problem:** asking an AI about your health means giving your most private data to whoever runs it.
- **Proven (testnet, today):** pay → escrow → 5 of 5 enclave checks (Intel + NVIDIA) → encrypted request reaches NEAR AI → automatic refund when the model can't answer (consult #7). Mint with a sealed prompt. Email sign-in (Privy). Encrypted local history. 28 contract tests, 14 web tests.
- **Not proven, so the video doesn't claim it:** a real AI answer end to end, and the enclave's signature on it (NEAR AI account has no spending limit yet). The video shows the refund and the clearly labelled example answer, and says so.

## Shape (about 2 min 40 s)

1. Cold open: the largest health data breach in US history (≈15 s)
2. Why the obvious fix fails: "just use an AI chatbot" (≈12 s)
3. Title drop on "Sublee" (≈8 s)
4. The site: real scroll of the home page, with its live encryption card and "follow your case" story (≈20 s)
5. Demo in 4 chapters over real app screenshots (≈75 s): 01 Sign in · 02 Pay, held · 03 Sealed and checked · 04 The honest ending
6. For experts: secret prompt NFTs (≈15 s)
7. Proof: contract, tests, what's verified and what isn't (≈15 s)
8. Close (≈8 s)

## Narration

| id | line | source |
|---|---|---|
| l01 | In February twenty twenty four, one ransomware attack on Change Healthcare exposed the medical records of about a hundred and ninety million people. | HHS OCR breach portal: 192.7M (Change Healthcare, July 2025 filing) |
| l02 | The largest health data breach in American history. | HHS OCR breach portal; HIPAA Journal |
| l03 | Your health data is only as safe as the people holding it. | |
| l04 | So when you ask an AI chatbot about a scary test result, you're handing that same data to one more company. | |
| l05 | What if nobody could read it? Not even us. | README "What's private" table |
| l06 | This is Sublee. | |
| l07 | Private medical second opinions, sealed in hardware. | |
| l08 | Your case is encrypted on your device, before it leaves the page. | `lib/crypto/e2ee.ts`, network check in web/CLAUDE.md §3 |
| l09 | It's only opened inside a secure enclave running the AI model on NEAR AI Cloud. | README "How it works" |
| l10 | Our server only ever sees scrambled text. | `api/consult` forwards ciphertext; README table |
| l11 | Chapter one. Sign in. | |
| l12 | Use any NEAR wallet, or just your email. | SignInDialog, verified by owner 2026-11-13 |
| l13 | With email, Sublee creates a NEAR testnet account for you and adds a little test NEAR to try it. | `api/fund`, verified 2026-11-13 |
| l14 | Chapter two. Pay, and it's held. | |
| l15 | Pick a specialist and pay in NEAR, in USDC, or with card credit. | contract `pay_consult_near`, `ft_transfer_call`, `credit_fiat` |
| l16 | The money sits in escrow on chain, and is only released when you get your answer. | contract escrow states, 28 tests |
| l17 | Chapter three. Sealed and checked. | |
| l18 | Before anything leaves your browser, Sublee checks the hardware is genuine. | `lib/attestation.ts` |
| l19 | Intel confirms the machine. NVIDIA confirms the AI chip. Both answer a fresh challenge made just for you. | e2e-consult run, consult #7: 5/5 checks |
| l20 | Only then is your case encrypted to a key that exists inside the enclave. | web/CLAUDE.md §0.3 |
| l21 | Chapter four. The honest ending. | |
| l22 | Today, our NEAR AI account can't spend credits yet, so the model can't answer. | e2e run: HTTP 402, "No spending limit configured" |
| l23 | So Sublee refunds you automatically, on chain. | consult #7 status Refunded |
| l24 | And it shows an example answer, clearly marked as written in advance. Never faked as real. | ConsultFlow example banner |
| l25 | For experts, a specialist is a secret prompt, minted as an NFT. | contract NEP-171/177/181 |
| l26 | The prompt is sealed in the browser before minting. Patients can't read it, and neither can copycats. | `lib/crypto/seal.ts` |
| l27 | Whoever owns the NFT earns eighty five percent of every consult. | contract 85/15 split |
| l28 | Everything runs on NEAR testnet today. | contract sublee.testnet |
| l29 | Twenty eight contract tests. Live enclave checks. Payments that refund themselves when something fails. | cargo test (28), consult #7 |
| l30 | Your history stays on your device, encrypted with a key only your wallet can make. | `lib/history.ts` |
| l31 | Sublee. A second opinion that stays yours. | |

About 390 words: roughly 2 min 30 s of voice at 155 words a minute, plus pauses.

## Visual idea (to confirm at Gate 2 with three stills)

Taken from Sublee's world, a sealed room:
- **A. Redaction:** black bars sweep across text as it's sealed; the background is a field of drifting case text that redacts itself.
- **B. Frosted glass:** the background is fogged glass; the mint lens from the logo clears a window where the product shows.
- **C. Ciphertext rain:** hex characters fall and resolve into words only inside the lens; the logo's two circles become the transitions.

Kinetic type in the style of prompt-motion.com: one idea per frame, words rising in, product UI moving with a camera and a cursor.
