# Sorting Hat

Public demo: https://sorting-hat-ak1.pages.dev/

This repo is only for the Sorting Hat routing-mark prototypes. The root route is the click-drag routing instrument: a participant holds the center, drags through a small set of passes, and produces a compact routing mark that can describe current state, contribution shape, and preferred interaction style.

The older three-control radial weighting prototype is preserved at `/demo-one.html` for comparison, but onboarding does not live here.

## Run

```powershell
npm start
```

Then open `http://localhost:4173`.

Root and `http://localhost:4173/gesture.html` load the Sorting Hat routing instrument. Use `http://localhost:4173/demo-one.html` for the older radial weighting prototype.

## Verify

```powershell
npm run verify
```

This drives the root routing instrument in headless Edge and checks that it produces a Sorting Hat routing mark payload.

## Deploy

```powershell
npm run deploy
```

This project deploys only to the Cloudflare Pages project `sorting-hat`, which serves `https://sorting-hat-ak1.pages.dev/`.

## Project Boundary

- `Shape-onboarding` is the GitHub and Cloudflare project for hidden-shape onboarding.
- `Sorting-hat` is the GitHub and Cloudflare project for routing-mark experiments.
- Do not add onboarding questions or profile PR export code to this repo unless the product direction changes intentionally.
