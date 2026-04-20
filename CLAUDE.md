# KarmaMap - Project Context

## Product
AI Fortune + Career Strategy web app targeting Singapore & SEA market

## Tech Stack
React, Firebase Hosting, Gemini API (gemini-2.0-flash)

## Target Users
Singapore & SEA (Chinese, Indian, Malay, Western, Korean users)
5 languages: EN/KO/ZH/MS/IN

## Theme System
Each language = different visual theme:
- KO = K-Mystic (black + gold)
- ZH = Red Luxury (deep red + gold)
- MS = Emerald Modern (green + gold)
- IN = Orange Vedic (orange + teal)
- EN = Dark Cosmic (black + white)

## Form (3 Steps)
- Step 1: Date of birth, birth time (optional), birth city
- Step 2: Current job/industry, years of experience, current goal (이직/창업/승진/연봉협상/사업확장)
- Step 3: Multi-select fortune systems (사주팔자/Numerology/Western Astrology/Vedic Jyotish/紫微斗數)

## Fortune Systems
Cross-analysis of selected systems via Gemini API
Result: 2026 fortune score + Q1-Q4 breakdown + Career Peak Years TOP5 + AI Chat

## Monetization
- 100% Free (Google AdSense revenue)
- Referral system: user shares unique link → friend completes reading → sharer gets PDF via email
- Viral shareable card (Spotify Wrapped style)

## Key Files
- `src/App.js` — main component (single-file React app, all logic + UI here)
- Firebase project: `karmamap-dd922`
- `.firebaserc`, `firebase.json`, `firestore.rules` in project root

## Architecture Notes
- Single-component React app (no React Router, no Redux)
- All styles are inline CSS-in-JS strings injected via `<style>` tag
- Theme object is derived from `THEMES[LANG_CONFIG[lang].theme]` and re-computed on language switch
- `T` object holds all copy strings keyed by lang code — always add keys to all 5 langs
- `buildPrompt()` and `handleGenerate()` accept optional `(formOverride, langOverride)` for referral auto-generation
- AdSense slots: 3 `div.ad-placeholder` elements (landing, result top, result bottom) — replace inner `<ins>` comment to activate
- Referral URL format: `?ref=BASE64_JSON` where JSON = `{ form, lang }`
- PDF delivery: currently `mailto:` fallback — swap `handleSendPdfEmail` body for real email API (SendGrid / EmailJS)
- SNS Share Card: drawn on `<canvas>` (1080×1080 px) via `generateShareCard()` — Canvas API only, no html2canvas dependency
- Print CSS isolates `#karmamap-result` div for browser PDF save

## Gemini API
- Model: `gemini-2.0-flash`
- Key stored in `GEMINI_API_KEY` constant (move to env var before production)
- Two call sites: `handleGenerate` (report) and `handleChat` (follow-up Q&A)
