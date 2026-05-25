# Sorting Hat

Public demo: https://sorting-hat-ak1.pages.dev/

This repo is only for the Sorting Hat routing-mark prototypes. Sorting Hat is a separate project from onboarding. The root route is the layered mark composer; the click-drag routing instrument remains available at `/gesture.html`, and the restored three-control routing mark is available at `/demo-one.html`.

The mark composer/routing-mark lineage is Sorting Hat `0.5` context. The three-control surface is kept here only as Sorting Hat routing-mark design history, not as onboarding.

## Run

```powershell
npm start
```

Then open `http://localhost:4173`.

Root and `http://localhost:4173/mark-composer.html` load the layered Sorting Hat mark composer. Use `http://localhost:4173/gesture.html` for the click-drag routing instrument and `http://localhost:4173/demo-one.html` for the restored three-control routing mark.

## Verify

```powershell
npm run verify
```

This drives the click-drag routing instrument and the root mark composer in headless Edge, then checks that both produce Sorting Hat routing-mark payloads.

## Deploy

```powershell
npm run deploy
```

This project deploys only to the Cloudflare Pages project `sorting-hat`, which serves `https://sorting-hat-ak1.pages.dev/`.

## Project Boundary

- `Sorting-hat`: cohort routing-mark identity. GitHub: `Mikeishiring/Sorting-hat`. Cloudflare Pages: `sorting-hat` / `https://sorting-hat-ak1.pages.dev/`.
- `Radial-controls`: canonical onboarding product, formerly Onboarding V1. GitHub: `Mikeishiring/Radial-controls`. Cloudflare Pages: `radial-controls` / `https://radial-controls.pages.dev/`.
- `Shape-onboarding`: retired Onboarding V2 archive. GitHub: `Mikeishiring/Shape-onboarding`. Cloudflare Pages: `shape-onboarding` / `https://shape-onboarding.pages.dev/`, redirected to Onboarding V1.
- Do not add onboarding questions or profile PR export code to this repo unless the product direction changes intentionally.

Related origin note: `radial-dial` is a reusable React marking-menu/radial-dials component, not one of the three deployed products above.
