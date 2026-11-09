# Sublee: Design Specification

**Direction:** Clinical calm (owner's pick, 2026-11-09) · **Platform:** responsive web, mobile-first (360–430px primary, up to 1040px desktop)
**Authoritative for everything a user sees.** `docs/SPEC.md` wins on what the system does.

---

## 0. Three rules that override convenience

1. **The crypto is the reason to trust Sublee, never the thing you look at.** The patient sees plain promises ("Encrypted in this browser"), each backed by a real check. Hex keys, quote statuses and the word "TEE" live in the folded **"Why you can trust this"** panel, never in the main path.
2. **Never show a green tick for something that didn't run.** A check that wasn't run, or failed, reads "Not verified" in neutral or red. This is a product rule (web/CLAUDE.md §0.7), not a style choice.
3. **Emergency beats everything.** If an opinion has `urgency = emergency`, a full-width red notice sits above all other content, before the summary.

## 1. Feel

A quiet, well-run clinic, not a crypto app. The page stays still, the type is unhurried, there's lots of white space, and colour is used for meaning. Think "a doctor's letter on good paper, delivered by a calm app".

What it must not look like:
- Dark mode by default, neon, gradients, glowing "secure" shields, padlock spam.
- Purple-to-blue AI gradients, sparkle icons, "✨ AI-powered".
- Dashboards full of numbers in the patient flow.
- Stock-photo doctors, stethoscope clip-art.

## 2. Vocabulary (patient-facing; code names on the right)

| Patient sees | Never say | Code / spec |
|---|---|---|
| Specialist | prompt, NFT (in patient flow) | prompt NFT |
| Consult | session, request, job | consult |
| Second opinion | diagnosis, AI answer | opinion |
| Encrypted in this browser | E2EE, ciphertext | client-side encryption |
| Secure enclave / sealed hardware | TEE, TDX, H200 (outside the trust panel) | TEE |
| Proof checked | attestation verified | attestation |
| Held until you get your answer | escrow | escrow |
| Card credit | fiat balance | fiat_balances |
| Author / Owner (on specialist page, small) | creator_id | creator_id / owner_id |

On the **author side** (Create, My specialists), "NFT" is fine and is a selling point: "Mint your specialist as an NFT. You earn 85% of every consult."

## 3. Voice

Second person, calm, short sentences. No exclamation marks. No hype ("revolutionary", "unlock"). State things plainly and kindly.
- Good: "Your case is encrypted before it leaves this page." / "This isn't a diagnosis. Take it to a clinician."
- Bad: "🔒 Military-grade encryption!" / "Our AI doctor will diagnose you."

Errors say what happened and what happens next, with money first: "The specialist couldn't answer. Your 0.25 NEAR has been returned."

## 4. Tokens

### Colour

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F4FAF8` | Page background (mint-tinted white) |
| `--surface` | `#FFFFFF` | Cards |
| `--ink` | `#0E2A24` | Primary text |
| `--ink-2` | `#4D635D` | Secondary text |
| `--ink-3` | `#7D918B` | Captions, metadata |
| `--line` | `#DCE9E4` | Hairlines, card borders |
| `--teal` | `#0F6E56` | Primary action, links, ticks |
| `--teal-2` | `#E1F5EE` | Teal tint backgrounds, selected states |
| `--teal-ink` | `#085041` | Text on teal tint |
| `--amber` / `--amber-2` | `#854F0B` / `#FAEEDA` | Urgency "soon"/"urgent" |
| `--red` / `--red-2` | `#A32D2D` / `#FCEBEB` | Emergency, failed checks, errors |

Teal is the only accent. Amber and red appear **only** for urgency and failure.

### Type

- Headlines: **Fraunces** (serif, opsz), weight 500, `--font-serif`. Used for h1/h2 and the opinion summary.
- Everything else: **Inter**, 400/500/600, `--font-sans`. Mono (`ui-monospace`) only inside the trust panel.
- Scale: h1 34/40 (28/34 mobile), h2 24/30, h3 17/24 sans 600, body 16/26, small 14/22, caption 12.5/18.

### Shape and space

- Radius: cards 16px, inputs 12px, buttons pill (999px), chips 999px.
- Card: white, 1px `--line`, no shadow; padding 20px (16px mobile).
- Spacing: 4px base; section gaps 32/48px.
- Max content width 720px for flows, 1040px for the specialist grid.

### Motion

Small and functional only: 150ms colour/opacity transitions, check items fading in as they pass, a gentle pulse on the "thinking" indicator. No page transitions, no bouncing.

## 5. Components

- **Button:** primary = teal fill, white text, pill. Secondary = white with `--line` border. Only one primary per view.
- **Specialist card:** a two-letter monogram in a teal-tint circle (specialty initials), title, one-line description, then a row of: rating, consults, "from $1.00". Whole card is the link.
- **Stepper:** 4 steps (Pay · Your case · Verify & send · Opinion), shown as a thin row of labelled dots at the top of the consult flow; done steps get a teal tick.
- **Trust list:** plain-language checks with a teal tick / red cross. Each row has a small "browser" or "server" tag saying where it was checked. The folded **"Why you can trust this"** panel holds the technical details (key, model, quote status).
- **Urgency pill:** routine = teal tint, soon = amber tint, urgent = amber, emergency = red solid.
- **Opinion:** reads like a letter. Serif summary paragraph, then sections with sans h3s: "What it could be" (likelihood chips), "Get help quickly if", "Ask your doctor", "Tests that could help", "Meanwhile". Actions at the end: Copy for my doctor, Rate.

## 6. Screens

1. **Landing:** serif headline "A second opinion that stays yours.", one sentence, primary CTA "Find a specialist". "How it works" in 3 steps (Choose a specialist · Describe your case, encrypted on your device · Get a second opinion from sealed hardware). Then the specialist grid.
2. **Specialist:** monogram, title, description, author line (small), stats, a price card with method buttons, then the stepper.
3. **Consult flow:** one step visible at a time; the sample-case chips are shown on the case step ("Try a sample case").
4. **Author pages (D4):** Create (write, test, price, mint) and My specialists (uses, rating, earnings).

## 7. Accessibility

Contrast is at least AA (all ink tokens on `--bg`/`--surface` pass). Visible focus ring: 2px teal outline, 2px offset. Ticks and crosses always have a text label. Tap targets are at least 44px. Respect `prefers-reduced-motion`.
