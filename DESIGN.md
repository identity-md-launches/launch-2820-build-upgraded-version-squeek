# Squeek Tales design system

## Overview

Squeek Tales is a cozy reading and choice game for Squeekchain visitors. Its visual idea is a small illustrated woodland storybook: warm paper, forest-green actions, round lettering, and an original hamster scene. The chapter and branch picker carry the hierarchy; network and deployment details remain secondary but explicit.

The implementation is a single page in `src/App.tsx`, with shared styles in `src/styles.css`. The default view reads live settled rounds. Local preview is visibly labeled and uses separate browser storage. The disabled voting state is part of the delivered interface, because a real voting contract has not yet been deployed.

## Colors

`src/styles.css:1` defines hexadecimal primitives and semantic aliases. Components use the semantic roles; illustration colors remain within their SVG artwork.

| Role/token | Value | Use |
| --- | --- | --- |
| `--color-bg-page` | `#f8f7f1` | Warm page background. |
| `--color-bg-surface` | `#fffefa` | Vote panel, wallet rows, dialogs. |
| `--color-bg-muted` | `#f0f0e7` | Neutral surface role. |
| `--color-text-primary` | `#303e30` | Headings and primary text. |
| `--color-text-secondary` | `#656d5d` | Supporting prose and labels. |
| `--color-border` | `#e1e4d8` | Structural dividers and neutral surfaces. |
| `--color-control-border` | `#858f7b` | Unselected radio boundary, distinct from dividers. |
| `--color-accent-solid` | `#3d653f` | Primary action and selected state. |
| `--color-accent-hover` / `--color-focus` | `#315234` | Action hover and keyboard focus perimeter. |
| `--color-accent-soft` | `#e9efdf` | Tonal icon backgrounds and hover surfaces. |
| `--color-selected-border` | `#668b62` | Selected branch outline. |
| `--color-warning-bg` / `--color-warning-text` | `#fbf0de` / `#80562c` | Local-preview notices and deployment guidance. |
| `--color-error-bg` / `--color-error-text` | `#f9e8e1` / `#a1362d` | Recoverable errors and unavailable feeds. |

The scene caption uses an opaque `#f9f8ed` surface above the illustration. The modal backdrop uses `#24342470` with a 4px blur. There is deliberately one light theme; no dark theme or unused alternate palette is implied.

Measured rendered pairs: primary text/page 10.53:1, secondary text/surface 5.34:1, primary-button text/fill 6.64:1, and scene-caption text/its opaque fill 10.59:1. The repaired radio boundary measures 3.35:1 against its panel. Measurement scope and probe exclusions are in `artifacts/validation.md`.

## Typography

Fonts are imported locally in `src/main.tsx`. Nunito 800 supplies headings and brand; Nunito 600 supplies the lighter brand word. DM Sans 400 supplies prose and DM Sans 600 supplies controls and emphasis. Both families fall back to `sans-serif`. Four local faces are loaded; the system uses three weights total: 400, 600, 800. Files are bundled by Vite from the Fontsource dependencies.

Six size tokens are declared:

| Token | Default size | Role |
| --- | --- | --- |
| `--text-small` | 14px | Supporting text, nav, metadata, compact choices. |
| `--text-body` | 16px | Body and primary controls. |
| `--text-section` | 20px | Lower section titles; mobile game headings. |
| `--text-title` | 24px | Chapter and vote headings; round values. |
| `--text-heading` | 32px | Mobile display and boot states. |
| `--text-display` | 48px | Desktop page headline. |

The root is 16px; sizes use rems and enlarge with text settings. Headings use balanced wrapping, weight 800, and tight line-height: h1 1.12 with −0.045em tracking, h2 1.25 with −0.025em, h3 1.4. Body line-height is 1.5, chapter text 1.75 (1.65 on mobile). Prose uses pretty wrapping and capped measures. Changing numbers use tabular numerals. Full addresses and transaction hashes wrap anywhere; shortened wallet labels expose the full address in the wallet dialog. No critical value is clipped with ellipsis.

## Layout

The page and header share a 1240px maximum outer width and 30px horizontal padding. The desktop content grid uses a 1.66:1 story/sidebar split with a 30px gap. The lower explainer and leaderboard follow that same split. Whitespace and tonal surfaces group content; dividers separate major regions.

Spacing is concentrated around 8, 12, 16, 20, 24, 30, and 32px, with smaller optical gaps for icons and metadata. It is not a strict spacing-token framework. Primary buttons are at least 48px tall. The wallet control is at least 44px; modal wallet rows are at least 52px. Some secondary controls use 40px targets with surrounding space.

Implemented breakpoints in `src/styles.css`:

- **1200px:** 1.5:1 grid, 24px gap, reduced panel padding, and removal of the decorative intro note.
- **960px:** desktop nav disappears; the display becomes 32px; the two-column split approaches 1.1:1; the illustrated scene crops to retain the hamster; instructional steps become rows.
- **700px:** one visual column, 20px page margins, wrapping header, 175px scene, and compact branch rows. `display: contents` lets the visual order become chapter metadata, illustration, branch picker, chapter prose, round status. The semantic article still provides the complete chapter before the complementary controls. The primary action remains on the first 390 × 844 screen. Secondary branch descriptions are hidden visually on mobile; each radio keeps its branch title. Dialogs become bottom sheets with safe-area padding.
- **370px:** 16px margins, smaller brand image, 165px scene, and hidden optional location text.

Rendered checks covered 320, 390, 700, 960, and 1440px and 200% CSS text enlargement in Chromium. No horizontal overflow was observed after the header fix. Native browser zoom and WebKit reflow were not verified.

## Elevation & Depth

The page is mostly flat. The vote panel uses an off-white fill without a border or shadow. The scene is a single rounded image. Choice borders indicate controls and selection. Major dividers communicate structure. Only the modal uses elevation: `0 20px 90px #1e2b2d30`, with no border and a translucent backdrop. No surface combines a border and a shadow.

## Shapes

Story illustration and vote panel use 16px desktop radii, reduced to 13px on mobile. Choices and primary/secondary buttons use 10px. Wallet controls and wallet rows use 9px. Dialogs use 20px, with only the upper corners rounded for mobile bottom sheets. Status dots and radio marks are circular. Art clipping applies to the illustration, not to text or critical values.

## Components

| Component/source | Usage and states |
| --- | --- |
| `Modal`, `src/components/Modal.tsx` | Native modal dialog. Title, close button, backdrop dismissal, Escape, browser focus containment, return to previous focus, and body scroll lock. Desktop centered dialog; mobile bottom sheet. |
| `WalletControl`, `src/components/Wallet.tsx` | One connect control. Discovered EIP-6963 wallets retain their names/icons; generic browser wallet is hidden when a named extension exists. Mobile app links and Coinbase Smart Wallet share the sheet. Pending/rejected connections, full connected address, disconnect, wrong-chain switch, and Etherscan link. |
| `VotePanel`, `src/components/VotePanel.tsx` | Labeled native radio group and one primary action. Empty selection, selected, disabled/not-deployed, preview dialog, simulation, signature request, pending hash, confirmed event, duplicate vote, rejection, and receipt failure states. Local mode changes the main action to Continue the story. |
| `Setup`, `src/components/Setup.tsx` | Native disclosure near the footer. Real deployment prerequisites, explicit consent, wallet-signed deployment, receipt hash, and downloadable actual config. Not an onboarding requirement for readers. |
| Story stage, `src/App.tsx` | Chapter metadata, `forest.svg`, latest verified outcome, work units, and settlement evidence link. Unknown states are explicit. |
| Round panel, `src/App.tsx` | Current round, tabular countdown, elapsed progress, and settled frontier. Status uses text as well as a dot. The countdown does not advance a chapter. |
| Leaderboard, `src/App.tsx` / `src/lib/hooks.ts` | Contract-backed ranked rows or truthful unavailable/loading/not-deployed/empty states. Five displayed ranks; first-500 scope disclosed if applicable. |
| `.primary`, `.secondary`, `.text-button`, `.icon-button` | Shared action styles in `src/styles.css`. Primary fill has one main-action role. Hover is pointer-gated; active uses scale(.96); focus-visible has a 2px perimeter with 4px offset; disabled is visible and inert. |

Interaction transitions name only color, border-color, background-color, or transform and run 150ms. There are no decorative looping animations. Pending icons may rotate; reduced-motion disables all animation/transitions and smooth scrolling. Forced-colors keeps a system `Highlight` focus outline.

Original SVG illustrations live in `public/forest.svg` and `public/favicon.svg`. The share image is generated by `scripts/generate-share.mjs`. Use Lucide for UI icons and preserve the supplied official wallet marks; do not replace wallet marks with initials.

## Do’s and Don’ts

- Start a new region with the existing page shell, type roles, and grid alignment. Use space before adding more boxes.
- Reuse the primary style for the consequential action and secondary/text styles for alternatives.
- Keep live chain state, wallet state, deployment gaps, and local preview state visibly distinct. Never seed pretend players or turn absent data into a zero result.
- Preserve full, reachable transaction hashes and addresses. Use the control-border role for radio boundaries, not the low-contrast divider role.
- Keep a new critical action within the mobile layout and test it at 390px, 320px, and enlarged text. Extend existing native controls and dialogs rather than adding a parallel interaction system.
- Retain the two fonts, six declared size roles, restrained forest palette, and original illustration direction when extending the story.

Design guidance attribution and license texts are in `README.md` and `licenses/design-guidance.txt`.
