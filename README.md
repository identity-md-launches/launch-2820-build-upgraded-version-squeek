# Squeek Tales

A small, illustrated story game built with React, TypeScript, Vite, wagmi, and viem. Follow Pip through six woodland locations, read chapters derived from settled Squeekchain rounds, preview either branch, or play a continuing local adventure.

**Delivery status:** the static site, live settlement reader, voting implementation, compiled contract, and deployment flow are delivered. **The voting contract has not been deployed to Sepolia:** no deployer wallet or signing credential was supplied. `public/config.json` contains documented `null` deployment fields. The UI explains this and disables on-chain voting; local story play works. No live data, address, transaction, leaderboard entry, or deployment result was fabricated.

The production export is in `dist/`, with relative asset URLs for gateway subpaths and static hosting. It is ready for the assignment platform’s `*.imd.site` publication step. A public hosting URL was not assigned or verified during this work; no publishing CLI was run.

## Install, run, and rebuild

Use Node.js 22.12 or newer and npm. Dependencies are described in `package.json` and pinned in `package-lock.json`.

```sh
npm ci
npm run dev
```

For a production preview:

```sh
npm run typecheck
npm run build
npm run preview -- --host 127.0.0.1
```

Open the URL printed by Vite. Serve the files over HTTP; opening `index.html` with a `file:` URL does not support the configuration fetch. `npm run build` compiles the Solidity contract, writes its public artifact and separate ABI/bytecode deliverables, and rebuilds `dist/`. Deploy the **contents of `dist/`**, including its configuration and contract artifact. No server, environment file, private credential, or rewrite rule is needed by the site.

During this assignment, dependency installation and compilation used a temporary build directory outside the delivered repository. Source, package manifest, lockfile, and the resulting export are retained here; dependency trees and package caches are not.

## Play

- Select either path and use **Preview this path** to read a possible outcome.
- **Play a local preview** opens a continuing branching game. **Continue the story** advances a chapter; **Start again** resets it. Its progress belongs only to this browser.
- **Past chapters** shows recent certified settlements, with links to their Ethereum transactions.
- **Connect** opens browser wallets discovered through EIP-6963 and Coinbase Wallet. Mobile browsers offer MetaMask, Coinbase Wallet, Rabby, and Phantom app links, followed by Coinbase Smart Wallet. There is no relay or project ID.

The app polls the official [Squeekchain core API](https://api.squeekchain.com/v1/core) every 15 seconds. It validates schema version 1, Ethereum Sepolia, the core identity, and the round configuration. It uses only complete, safe `BatchSettled` / `RoundRecorded` batches. A missing active event is never treated as zero work. If the event window is incomplete, the app attempts a certified `roundPage` RPC read at the API’s safe block.

Each certified round becomes a chapter. The game maps **even settled work to choice 0, the light path**, and **odd work to choice 1, the river path**. This is Squeek Tales’ deterministic story rule, not an official Squeekchain branch or voting system. Player votes are preferences and do not change the wheel’s measured result. Six locations repeat with two authored outcomes each. The round countdown never creates a settlement.

Unknown results remain unknown. Unavailable, changed, delayed, or mismatched data disables live voting and offers retry or local play. A settlement older than 30 minutes, a response not refreshed for 60 seconds, or a future source timestamp beyond a two-minute tolerance is treated as delayed.

## Enable on-chain voting

The [contract source](contracts/SqueekTalesVoting.sol) is nonpayable and has no owner or upgrade mechanism. Its constructor binds to an actual SqueekCore contract, reads the official genesis and 600-second duration, and requires Ethereum Sepolia. `vote(roundId, choice)` accepts one choice, 0 or 1, per wallet in the currently open round and rejects paused cores, late/future rounds, and duplicate votes. Storage and `VoteCast` record round, choice, voter, and block timestamp.

The compiled artifact is `public/contracts/SqueekTalesVoting.json`. Separate deliverables are `artifacts/SqueekTalesVoting.abi.json` and `artifacts/SqueekTalesVoting.bytecode.txt`. Compiler: Solidity 0.8.38, optimizer 200 runs, Paris EVM target.

To deploy using your own browser wallet:

1. Open the site over HTTP or HTTPS. Connect a wallet that holds Sepolia test ETH and switch to Ethereum Sepolia through the wallet menu.
2. Expand **For the story keeper: enable on-chain voting** near the footer. The real core address is discovered from the official API. Review that address against the current official deployment and the included integration evidence.
3. Select the deployment consent checkbox and choose **Deploy voting contract**. Review and authorize the actual deployment transaction in your wallet. The site does not receive a private key. Wait for two confirmations.
4. Choose **Download config.json**. Replace `public/config.json` with that downloaded file. It contains the actual voting address, actual deployment block, and expected core address from the confirmed deployment.
5. Run `npm run typecheck` and `npm run build`, then publish the new `dist/`. This rebuild makes the configuration shared by all visitors; a browser-local deployment alone does not activate it for everyone.

Startup configuration:

| Field | Purpose |
| --- | --- |
| `chainId` | Ethereum Sepolia, 11155111. |
| `apiUrl` | Official Squeekchain core endpoint. |
| `rpcUrl` | Public Sepolia RPC; the wallet configuration also has a public fallback. |
| `votingAddress` | `null` until an actual voting deployment is confirmed. |
| `votingDeploymentBlock` | `null` until its actual receipt supplies this block. |
| `expectedCore` | `null` for read-only identity discovery; set to the deployed voting contract’s real core when activating voting. |

Do not insert an example or zero address. Once configured, the app checks deployed code, the voting contract’s core and clock, the official feed identity, and the current chain round. It simulates a vote before requesting a wallet signature. The UI shows the full transaction hash, a Sepolia Etherscan link, pending state, two-confirmation receipt status, failure/retry, and duplicate-vote state. A successful receipt is called a confirmed vote only if its matching `VoteCast` event is present. The last transaction survives a reload.

The leaderboard reads contract storage every 20 seconds and after confirmation. It shows the top five wallets, sorted by vote count then address. To bound public RPC work, it reads at most the first 500 registered voters; if exceeded, that ranking scope is shown. No seeded players or browser-local scores appear as shared on-chain activity.

## Checks and actual results

```sh
npm run typecheck
npm run build
npm test
npx playwright install chromium webkit
npm run test:browser
npm run test:wallet
npm run check:integration
node scripts/check-export.mjs
```

The first three commands passed. The eight unit/contract tests cover exact round boundaries, unknown feeds, incomplete batches, safe-block filtering, work parity, actual local EVM receipts, duplicate/late/invalid votes, pausing, and voter pagination.

Chromium passed ten production-export checks, including relative subpath assets, the 390px first screen, branch previews, modal keyboard focus return, wallet-picker failure, persisted/reset local play, history links, responsive widths, 200% CSS text enlargement, feed recovery, and mobile wallet rows. The default-page axe scan reported zero A/AA violations; this does not establish full accessibility compliance. Seven additional wallet checks passed with a test-only EIP-6963 provider and ephemeral local EVM: rejection, unknown-network fallback, real local transactions, confirmation/event matching, account changes, actual contract leaderboard reads, and reload persistence. These are **not Sepolia deployments or signed Sepolia votes**.

The pinned design probe passed **16/16** checks after corrections. At 390 × 844, the primary action ends at approximately 781px. Source review and rendered review covered all six Better Interface domains. The live integration check matched the official API to Sepolia RPC at the same safe block. See [validation details](artifacts/validation.md), [integration evidence](artifacts/integration.json), and [design tokens and components](DESIGN.md).

WebKit was downloaded but could not launch because a required browser runtime dependency was unavailable. Safari/WebKit interaction checks remain unperformed. No physical wallet-app handoff, Coinbase passkey signing, native browser zoom, screen-reader session, real Sepolia vote/deployment, or final public domain verification was performed. Replaced/cancelled/reverted receipt UI branches are implemented and source-reviewed, but were not all induced in the browser wallet test.

The build reports a dependency’s `node:worker_threads` browser-externalization warning; Chromium showed no associated runtime or resource errors in the tested flows. The local EVM test runner used its JavaScript fallback for an unavailable optional native acceleration module; the tests completed successfully.

## Assets and attribution

`public/forest.svg` and `public/favicon.svg` are original vector illustrations. `public/share.png` is a locally generated 1200 × 630 share image; regenerate it with `node scripts/generate-share.mjs` after installing Chromium. Nunito and DM Sans are bundled locally through Fontsource. UI icons use Lucide. Wallet marks come from RainbowKit’s wallet asset sources and remain their owners’ marks.

Design guidance was adapted from Jakub Krehel’s Better Interface (MIT, commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`). Documentation guidance was adapted from Paul Bakaus’s Impeccable (Apache-2.0, commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). Notices and license texts are retained in `licenses/`. SqueekCore ABI data comes from the official [contract reference](https://docs.squeekchain.com/developers/core/) and [published ABI](https://docs.squeekchain.com/assets/abi/SqueekCore.json). Current addresses come from the live API, not the older address printed on that documentation page.
