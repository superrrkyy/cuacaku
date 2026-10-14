# Phase 2.1 — Weather hero and atmosphere

## Scope

This change refines the `WeatherHero` and `WeatherBackground` components already present in the checkout. It does not add Phase 2.2+ features or remove existing dashboard features. The earlier `PHASE2.md` describes the inherited implementation; this document describes only this change.

Before implementation, the app, weather helpers, existing components, selected-weather hook, Tailwind config, CSS, and existing tests were inspected. The API layer, validation, hooks, WMO mappings, forecasts, search, storage, and favorite behavior remain unchanged.

## Component contracts

- `WeatherHero({ place, data, favorite, onFavorite })` remains a presentation component. It displays city, optional region/country, Celsius temperature, condition, the existing accessible SVG icon, feels-like, and explicitly labelled daily high/low. Existing summary metrics, favorite action, and location-local update time remain intact. Each instance has a unique heading ID.
- `WeatherBackground({ state })` now receives a `WeatherVisualState`, not raw WMO codes. `App` normalizes current weather using the existing `weatherVisualState()` helper in `weather.ts`. The pre-data clear-night appearance is preserved. `memo` avoids rendering the background for unrelated app updates.
- Unknown WMO codes still normalize to cloudy with the existing “Tidak diketahui” label in presentation tests. The API validator intentionally rejects unknown WMO codes; its behavior was not weakened to exercise the fallback.

## Visual treatment

The hero uses a navy/indigo translucent surface, a restrained highlight, subtle borders and shadow, mint accents, larger temperature typography, and generous spacing. High/low now follow feels-like in reading order, with visible labels rather than arrows alone. Long location names wrap; the favorite button retains its touch target. Wide negative temperatures can wrap the icon to avoid overlap.

| State | Treatment |
| --- | --- |
| clear-day | Navy gradient, warm ambient glow with slow breathing |
| clear-night | Dark indigo gradient, sparse static stars and moonlit glow |
| cloudy | Slate/navy gradient, slow soft cloud layers |
| rain | Cool navy gradient, sparse CSS rain particles |
| storm | Dark indigo gradient, slow cloud movement and a soft 24-second glow cycle |
| snow | Cool slate gradient, sparse slowly falling CSS snow particles |
| fog | Muted navy gradient, two slow translucent layers |

All treatments use one decorative DOM element with at most two pseudo-elements. Animation changes only transforms/opacity; no frame loops, timers, canvas, WebGL, particle arrays, remote assets, or runtime dependencies were added. The hero uses translucent fills rather than a continuously blurred moving background.

The existing reduced-motion rule disables all new animations while preserving static gradients and weather information. Decorative layers are hidden from assistive technology and cannot intercept clicks. The shared weather icon retains its condition and day/night accessible label. High/low values have explicit Celsius labels, and keyboard focus remains visible.

## Validation executed

- `npm run typecheck`: passed.
- `npm test`: **239 tests passed in 10 files**, including 14 new presentation tests.
- `npm run build`: passed. Output: **181.21 kB JavaScript / 58.28 kB gzip**, **31.36 kB CSS / 7.50 kB gzip**.
- `npm run test:browser`: **24 Chromium tests passed**, using deterministic intercepted API responses.
- `git diff --check`: passed.
- `npm audit --omit=dev`: zero vulnerabilities.

Browser checks cover **320, 375, 390, 768, 1024, 1280, and 1440px**, normal and long location names, negative temperatures, page/hero containment, visible favorite focus, existing touch targets, all seven atmospheres, reduced-motion computed styles, static-background preservation, and stable loaded hero/icon geometry. Axe checks found no violations for the selected WCAG A/AA rules at those widths and across all seven hero states. Screenshots were reviewed at mobile, tablet, and desktop widths; generated screenshots remain under ignored `test-results/`.

The existing reveal animation must finish before measuring loaded geometry: Playwright's mocked JavaScript clock does not advance the CSS document timeline. A tighter temperature-content containment assertion exposed narrow-screen negative-temperature overlap, which was fixed before the final full suite passed.

## Reproduction and limitations

Use `npm ci`, then the scripts above. Browser tests normally require `npx playwright install --with-deps chromium`. This restricted sandbox used a temporary npm-distributed Chromium binary with `CHROMIUM_PATH=/tmp/chromium LD_LIBRARY_PATH=/tmp/al2023/lib`; neither that package nor browser binaries are added to the project dependencies or Git.

Live Open-Meteo requests, Safari/Firefox, real-device performance, and screen-reader user testing were not verified. Layout checks cover the loaded hero and atmospheric motion after the inherited entrance animation, not page-wide CLS during network loading/refresh. No Lighthouse or runtime performance benchmark is claimed. Dependency installation reported seven inherited development-toolchain advisories (five high, two moderate); dependency upgrades remain outside this scoped UI change.
