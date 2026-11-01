# Submission path budget

The root `.gitignore` is created to exclude dependency/cache directories at every depth and keep the required export and validation artifacts eligible for delivery. This is its explicit path budget; the overall assignment limit remains **8,388,608 bytes**. The actual tree is measured by `node scripts/check-export.mjs` after packaging.

| Delivered paths | Maximum budget | Required contents |
| --- | ---: | --- |
| `dist/**` | 2,500,000 bytes | Complete static runtime, local fonts, illustration, metadata, configuration, and voting deployment artifact. |
| `public/**` | 500,000 bytes | Source runtime assets, original SVGs, share PNG, wallet marks, configuration, compiled contract artifact. |
| `artifacts/**` | 1,500,000 bytes | ABI, bytecode, two rendered screenshots, design/interaction/integration evidence, validation documentation. |
| `src/**`, `contracts/**`, `scripts/**`, `tests/**` | 1,000,000 bytes | Complete implementation, reproducible checks, and one clearly identified captured API fixture. |
| `licenses/**` | 100,000 bytes | Font, wallet-asset, and design-guidance licenses. |
| Root package files, frontend configuration, `.gitignore`, and Markdown documentation | 500,000 bytes | Lockfile, manifest, install/rebuild instructions, final implemented design system, and this budget. |
| **Planned total** | **6,100,000 bytes** | Below the whole-bundle limit; unused space is not a reason to include caches. |

`test/scratch/`, `.playwright-mcp/`, dependency directories, package-manager caches, source-map dumps, downloaded browser binaries, and archives are excluded from delivery. Dependency installation and browser downloads used temporary paths outside this repository. No submodule or symlink is required. The source and every required runtime asset remain complete.
