# Validation and design review

## Delivery status

**Useful implementation delivered; live deployment remains incomplete.** The site is playable as a local branching story and reads actual official Squeekchain settlements. The Sepolia voting contract and wallet flow are implemented, compiled, and tested on an ephemeral local EVM. No deployer wallet or signing credential was supplied, so no Sepolia voting deployment or vote was sent. The configuration keeps those deployment fields `null`; the UI disables that action and provides a browser-wallet deployment path.

The platform publication step can consume `dist/`. A final `*.imd.site` domain was not available to verify during this work. WebKit was installed but could not launch because a required browser runtime dependency was unavailable. These gaps are explicit in the README and the interface. No live data, address, transaction, leaderboard entry, or deployment result was fabricated.

## Scope and assumptions

Reviewed the production export under `/preview/`, including the default story, recent chapters, local preview, wallet picker, connected/wrong-chain states, transaction feedback, leaderboard, and deployment disclosure. The visual idea is a warm woodland storybook with an original hamster illustration and a compact branch picker.

The game’s own settlement mapping is `choice = work % 2`, using exact integer arithmetic: even work selects the light path; odd work selects the river. Votes record preferences and do not affect official measured work. Six authored locations repeat. Local play is labeled and separate from live state.

Current deployment identity is discovered from the official API. The older address in the contract-reference prose is not used. API schema version 1 and the currently published SqueekCore ABI are supported. The integration check independently read the core’s state, configuration, and latest certified `roundPage` through Sepolia RPC at the API safe block; they matched. Timestamped protocol evidence is in `integration.json`.

## Requirement coverage

| Requirement | Result and evidence |
| --- | --- |
| Usable responsive website and primary interactions | Implemented; Chromium browser validation and manual browser inspection. |
| `dist/index.html`, relative assets, source and lockfile | Delivered; static export is served successfully under `/preview/`. |
| Production build and TypeScript check | Passed, exit 0 after final source corrections. |
| Useful interaction validation | Ten Chromium export checks and seven isolated wallet/EVM checks passed. |
| Better Interface applied and reviewed in six domains | Covered below; confirmed findings fixed. |
| Product and action on first 390px screen | Yes. At 390 × 844 the main action ends at about 781px. `mobile.png` records it. |
| Title, favicon, description, `og:title`, `og:image` | Present; taste share check passed. Local 1200 × 630 PNG supplied. |
| Root `DESIGN.md` and installation/rebuild README | Delivered and describes the final source. |
| Deployed Sepolia voting contract | **Not deployed.** Missing supplied deployer wallet/signing authorization; compiled source, ABI, bytecode, and wallet-signed deployment UI delivered. |
| Real wallet transaction voting and hash/status | Implemented. Validated with real transactions on an ephemeral local EVM and a test-only EIP-6963 wallet. Real Sepolia signing remains unperformed. |
| Official settled round drives actual path | Implemented; actual API and safe-block RPC results matched. Missing events are not interpreted as zero. |
| Current chapter, hamster art, round status, leaderboard | Implemented. Leaderboard is contract-backed and truthfully unavailable until deployment; no seeded voters. |
| `*.imd.site` hosting | After platform publication; no live domain was claimed or independently checked. |

## Better Interface coverage

| Domain | Status | Checked states and evidence | Limits |
| --- | --- | --- | --- |
| Accessibility | Checked | Native links/buttons/radios/fieldset; associated names; one main and h1; native dialog focus containment, Escape and focus restoration; visible focus styles; reduced-motion and forced-color source guards. Chromium keyboard preview flow passed; default axe A/AA scan reported zero violations. Radio boundary contrast was repaired. | No screen-reader session, physical device test, or native browser zoom. Forced-colors rendering was source-reviewed, not manually rendered. |
| Layout | Checked | Production views at 320, 390, 700, 960, 1440px; no horizontal overflow. Default mobile product/action on first screen; header reflow at doubled CSS text size; modal bottom sheet and full-page desktop screenshot inspected. | WebKit unavailable; RTL and localization are not product variants and were not tested. |
| Writing | Checked | Actions name their effects. Local preview, undeployed voting, unavailable API, wrong chain, wallet rejection and pending receipts say what is known and provide next actions. Gas fee and preference-vs-settlement rule are explicit. Probe found no duplicate lines or content caps. | Vendor wallet/passkey screens and native app text are outside this static UI. |
| Typography | Checked | Two bundled families; three weights; six declared size roles, five observed per viewport. Fonts loaded in Chromium. Heading hierarchy and complete long hash/address wrapping reviewed. Countdown has tabular numerals. | No full international-script coverage or physical iOS font-rendering test. |
| Colors | Checked | Rendered text pairs measured; probe text contrast passed. Solid caption background measured separately because the probe excludes image contexts. Radio outline changed from 1.87:1 to 3.35:1 against its panel. | Probe skips two image-context boxes; the caption’s actual opaque pair was manually computed. Wallet provider-supplied marks are not recolored or contrast-certified. |
| UI | Checked | Rest, selected, disabled, preview, empty, unavailable, pending, rejection, confirmed and retry states inspected/tested as applicable. Flat surfaces, one primary choice action, consistent icons, 150ms named-property transitions, and reduced motion. | No browser Animations-panel slow-motion replay; cancelled/replaced/reverted-receipt UI branches were not all induced. |

## Findings and corrections

### Layout: wallet control overflow with enlarged text — fixed

- **Severity:** high for the affected enlarged-text state.
- **Source:** `src/styles.css:280`, mobile `.header-inner`.
- **Before:** at 390px with root text doubled to 32px, the wallet control’s right edge measured 435.92px. The header could not reflow.
- **Correction:** enable `flex-wrap: wrap` on the mobile header. Normal-size alignment is retained; enlarged text can place wallet controls on another row.
- **Recheck:** Chromium’s responsive/enlarged-text check passed after the change; manual evaluation returned no horizontal overflow.

### Colors/accessibility: unselected radio boundary too pale — fixed

- **Severity:** medium.
- **Source:** `src/styles.css:146`, `.radio-mark`; semantic token at `src/styles.css:24`.
- **Before:** `#b7c0ad` against the `#fffefa` vote-panel surface measured **1.865:1**. The boundary was hard to perceive.
- **Correction:** introduce the control-border role `#858f7b`, preserving the softer divider color for noninteractive structure.
- **Recheck:** actual computed radio color is `rgb(133, 143, 123)` on `rgb(255, 254, 250)`, **3.350:1**. Final taste checks and Chromium accessibility scan passed.

The mobile arrangement also intentionally puts the branch picker before the long chapter text visually. This was a design decision made before the first rendered review; no unmeasured “before” screenshot is claimed.

## Actual checks

All build/test dependencies and browser binaries were installed outside the delivered repository. The same source was copied to the temporary build directory, checked there with the ordinary package scripts, and its complete export copied back to `dist/`.

| Command/check | Final result |
| --- | --- |
| `npm run typecheck` | Exit 0. |
| `npm run build` | Exit 0; Solidity 0.8.38, 3,420-byte contract creation bytecode, then Vite production export. |
| `npm test` | Exit 0; 8 passed, 0 failed. Includes actual local EVM deployment/receipts and contract invariants. |
| `npm run test:browser` | Exit 0 for implemented Chromium checks: 10 passed. WebKit launch recorded separately as unavailable, not passed. |
| `npm run test:wallet` | Exit 0; 7 passed using a test-only EIP-6963 wallet, synthetic API/config, and ephemeral EVM chain ID 11155111. No real Sepolia signing. |
| `npm run check:integration` | Exit 0; API HTTP 200. Core code, chain ID, safe-block frontier, clock, and latest round work matched RPC. |
| Pinned `taste.mjs --out test/scratch/taste` | Exit 0; 16/16 checks passed after final source corrections. Playwright was explicitly resolved from the temporary dependency installation. |
| `node scripts/check-export.mjs` | Exit 0; named outputs, relative entry assets, share/screenshot PNG dimensions, evidence JSON, source/export configuration, ABI/bytecode consistency, and the 8 MiB whole-bundle limit checked. Exact final byte counts are in `export-check.json`. |
| Manual assigned-browser inspection | Actual export visited; 390px and 1440px screenshots inspected, branch preview used, keyboard radio navigation and its visible focus ring inspected, snapshot examined, zero console warnings/errors and no failed resources observed in the inspected session. |

Chromium export checks cover actual live loading, subpath-relative local assets/fonts, first-screen action position, branch preview and keyboard focus return, a recoverable no-extension error, persisted and reset local play, chapter settlement links, five responsive widths, 200% CSS text enlargement, axe, unavailable/empty feed recovery, and all four mobile app links/marks. Feed-error fixtures are synthetic and isolated to tests; they are not shipped as production data. The captured fixture in `tests/fixtures/core.json` is an actual API response used only by tests.

Wallet checks cover EIP-6963 naming, hiding duplicate generic injection, rejected connection recovery, wrong-network gating, unknown-network add/switch behavior, rejected signature without recording a vote, actual locally mined votes with two confirmations and matching event checks, disabled duplicate voting, account changes, contract-backed leaderboard rows, and persisted confirmation after reload. The local chain includes a compiled read-batch helper for wagmi’s multicall reads. Its generated accounts and transactions are never configured into the delivered site.

The probe measured 25 first-screen prose words at 390px and 81 at 1440px, two font families, three weights, no horizontal scroll/text overlaps/clipping, and no border-plus-shadow or nested-card surfaces. Fourteen measured mobile controls met the 24px-or-spacing rule; eight are below the optional 44px comfort size. Two image-context text boxes were excluded by its contrast detector, so its pass is not an assertion about arbitrary image backgrounds.

Measured color pairs from the rendered export:

| Foreground / background | Ratio |
| --- | ---: |
| Primary text `#303e30` / page `#f8f7f1` | 10.534:1 |
| Secondary text `#656d5d` / surface `#fffefa` | 5.337:1 |
| Primary button text `#fffefa` / fill `#3d653f` | 6.645:1 |
| Scene caption text `#303e30` / opaque fill `#f9f8ed` | 10.594:1 |
| Unselected radio border `#858f7b` / surface `#fffefa` | 3.350:1 |

## Evidence and remaining limitations

`mobile.png` and `desktop.png` show the real read-only live export. `taste.json`, `browser-checks.json`, `wallet-checks.json`, and `integration.json` retain structured results. Ephemeral wallet-test screenshots are intentionally not presented as evidence of a real Sepolia deployment.

The known runtime limitations are the absent funded Sepolia deployment, unavailable WebKit execution, untested native wallet-app/passkey handoff, no physical device/screen-reader/native-zoom session, and no final public-domain verification. The optional native EVM acceleration module was unavailable, but its JavaScript fallback completed the tests. Vite emitted a dependency browser-externalization warning; no corresponding errors occurred in tested Chromium flows. The source implements replaced/cancelled/reverted receipt handling, but those individual browser branches are not all validated.

No required output was silently dropped. The compiled artifacts and honest disabled state preserve the deployment gap. Bundle budgets and exclusions are in `BUNDLE.md`; the final path/asset/bytecode/size check is recorded in `export-check.json`.
