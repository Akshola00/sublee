# Sublee: Design Specification

**Direction:** Sealed room, dark (owner's call, 2026-11-13; replaces "clinical calm" light) · **Platform:** responsive web, mobile-first (360–430px primary, up to 1040px desktop)
**Authoritative for everything a user sees.** `docs/SPEC.md` wins on what the system does.

---

## 0. Three rules that override convenience

1. **The crypto is the reason to trust Sublee, never the thing you look at.** The patient sees plain promises ("Encrypted in this browser"), each backed by a real check. Hex keys, quote statuses and the word "TEE" live in the folded **"Why you can trust this"** panel, never in the main path.
2. **Never show a green tick for something that didn't run.** A check that wasn't run, or failed, reads "Not verified" in neutral or red. This is a product rule (web/CLAUDE.md §0.7), not a style choice.
3. **Emergency beats everything.** If an opinion has `urgency = emergency`, a full-width red notice sits above all other content, before the summary.

## 1. Feel

A private room at night: dark, quiet and precise, with one mint accent that means "sealed" or "safe to go". The home page is alive (a case card that really encrypts as you watch, a scroll story that follows your case, pills that track where you are). The patient flow stays calm and still.

What it must not look like:
- Purple-to-blue AI gradients, sparkle icons, "✨ AI-powered", padlock spam.
- Stock-photo doctors or photo-real faces for fictional specialists (illustrated portraits only; an author may add their own photo).
- Dashboards full of numbers in the patient flow.

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

Source of truth: `web/src/app/globals.css` `:root`.

### Colour

| Token | Value | Use |
|---|---|---|
| `--bg` / `--bg-2` | `#070B0B` / `#0B1212` | Page, inset fields |
| `--surface` / `--surface-2` | `#0F1716` / `#142020` | Cards, raised controls |
| `--ink` / `--ink-2` / `--ink-3` | `#E9F2EF` / `#A5B6B1` / `#6F827C` | Text, secondary, captions |
| `--line` / `--line-2` | `#1F2D2B` / `#2B3D3A` | Hairlines, control borders |
| `--teal` (mint) | `#6FE3C1` | Primary action (dark text `#04211A` on it), links, ticks, "sealed" |
| `--amber` | `#F3C27A` | Urgency soon/urgent, example-answer banner |
| `--red` | `#FF8A80` | Emergency, failed checks, errors |

Mint is the only accent. Amber and red appear only for urgency, examples and failure. Glow is reserved for "verified/sealed" states and the primary button hover.

### Type

- **Instrument Sans** (`--font-sans`) for everything; headlines 600 with tight tracking.
- **Instrument Serif italic** (`--font-serif`) for one accent word per headline ("yours.", "sealed") and the opinion summary.
- **JetBrains Mono** (`--font-mono`) for section labels (`── how it works`), ciphertext and machine details.

### Shape and space

- Radius: cards 18px, inputs 12px, buttons and chips pill.
- Cards: subtle top-to-bottom surface gradient, 1px `--line`; hover lifts 3px with a mint glow.
- Max width 740px for flows, 1120px for the home page.

### Motion

Home page: headline lines rise in, sections reveal on scroll, the case card floats, tilts with the pointer and loops type → real encryption → sealed; the "where your case goes" track fills as you scroll. Flow pages: 150ms transitions and fades only. Everything respects `prefers-reduced-motion`.

### Logo

Two overlapping circles (your view and a second opinion); the lens where they meet is filled mint: the sealed space where your case is read. Wordmark "sublee" in lowercase Instrument Sans 600. Source: `web/src/components/Logo.tsx`, favicon `web/src/app/icon.svg`.

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
