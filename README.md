# HushHeron

> Verified feedback without revealing who said it.

HushHeron is a Next.js and Compact survey app for Midnight Preprod. Each survey has its own contract. Participants create their credential secret locally, a creator approves only its commitment, and a ZK circuit enforces eligibility, a valid 1–5 answer, and one response per credential. The contract records an answer commitment and verified count. The answer is encrypted in the browser for creator-side aggregation.

## Live Demo

Not deployed yet. The app runs locally with `npm run dev`; a public deployment needs a persistent `HUSHHERON_DATA_DIR` and a funded creator wallet.

## Contract Address

| Network | Address | Status |
| --- | --- | --- |
| Preprod | `ee0be044c2949437fe5d7b8c6e44e3f7f9769223a11f6819d8eaa824cc48ad10` | Deployed; transaction `89035d9763a70c69407dc842a10d93757e9289d685eb60730a5d751ad8455b31`, block 2762863 |
| Preview | Not deployed | Not verified |

The Preprod address above belongs to a survey deployed on September 29, 2026. Its explorer record is captured in [the deployment screenshot](public/deployedcontract.png). Each newly published survey receives its own contract address.

## What This Does

The creator writes one scale question, publishes a survey, shares its link, approves participant credential commitments, and reads verified counts and the aggregate in their browser. A participant requests approval, connects a compatible Midnight wallet, privately proves eligibility, and submits once. The success state appears only after the Midnight call finalizes and its encrypted answer syncs to the directory.

## Privacy Model

- **Public:** survey text, approved credential commitments, anonymous nullifiers, answer commitments, eligible and response counts, and contract status.
- **Private:** credential secret, Merkle path, answer, answer salt, creator authorization secret, and creator decryption key. Private circuit inputs are handled in the participant's browser and by the wallet's selected proving provider.
- **Proved without revealing:** the responder owns an approved credential, has not used it before, and selected a valid answer from 1 to 5.

The creator's browser decrypts individual ciphertexts to calculate the aggregate, so the creator key holder can technically inspect individual answers. The app stores no wallet-to-answer field or request timestamps, but transaction timing, wallet fee activity, IP addresses in infrastructure logs, and small anonymity sets can still weaken anonymity. Use a locally controlled proof server in the wallet when strict witness privacy matters: [Midnight's proof-server guide](https://docs.midnight.network/guides/run-proof-server) states that the proving service sees private inputs. The wallet's proving modality controls whether proving stays local.

The demo directory accepts multiple encrypted candidates for a public answer commitment. The creator view counts only a ciphertext that decrypts to a valid answer and salt matching the on-chain commitment, so an invalid upload cannot claim that commitment first. The unauthenticated directory still needs rate limits and durable storage before public use. Creator and participant secrets currently reside in browser localStorage, which is accessible to same-origin scripts; stronger key custody is needed before production. The in-memory Midnight private-state provider also loses the generated maintenance signing key on browser refresh, so contract upgrades require a durable encrypted provider.

The contract enforces one answer **per approved credential**, not one per human by itself. A creator must authenticate each requester through a separate trusted channel, match the approval code, and approve only one code per person. Approving anonymous requests indiscriminately would not establish real-world eligibility.

## Privacy Claim

An ordinary ledger observer sees that an approved credential produced a valid one-use response and sees its answer commitment, but cannot read the answer or derive the credential secret from the nullifier. The app directory sees only ciphertext for an answer. This is a code-level privacy claim, backed by local generated-contract tests; no live-wallet anonymity audit has been performed.

## Tech Stack

Next.js, React, TypeScript, Tailwind CSS, Midnight.js 4.1.1, DApp Connector API 4.0.1, Compact compiler 0.31.1, Compact runtime 0.16.0, and a Node JSON directory for local or single-instance hosting. Versions match the [Midnight compatibility matrix](https://docs.midnight.network/relnotes/support-matrix).

## Prerequisites

- Node.js 22 and npm 10+
- Compact devtools and compiler 0.31.1; on Windows, use WSL for compilation
- Lace or another Connector API 4.x wallet on Preprod, with faucet tNIGHT registered to accrue DUST
- A wallet-controlled proof server, preferably local for private witnesses
- A writable persistent directory for hosted survey metadata and encrypted answers

## Setup & Run Locally

1. Clone this repository and run `npm ci`.
2. In WSL, run `compact update 0.31.1`, then `npm run compact` from the repository path. On Windows PowerShell, the `compact` command can resolve to the Windows file-compression utility, so compile inside WSL.
3. Run `npm run dev`. The predev script copies compiled keys and ZKIR into `public/managed/`.
4. Open `http://localhost:3000`, connect a funded Preprod wallet, and create a survey.
5. Use another browser profile or device for a participant credential. Request approval, send the approval code to the creator through a trusted channel, approve that exact code from the creator view, then answer and submit.

For a persistent single-instance demo host, build the included container with `docker build -t hushheron .` and run it with a durable volume: `docker run -p 3000:3000 -v hushheron-data:/data hushheron`. Configure HTTPS and a public hostname at the host. Do not run multiple replicas against this JSON directory. Once the public URL is live, place it in the Live Demo section above. The container build has not been verified here because the base-image pull did not finish; the local Node production build and server were verified.

For local proof-server setup, follow the [official guide](https://docs.midnight.network/guides/run-proof-server) using `midnightntwrk/proof-server:8.1.0`; point the wallet's proving setup at that local service. The wallet extension controls transaction authorization and fee payment.

## Run Tests

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The three Compact tests execute the compiler-generated contract module. They cover eligibility, replay protection, answer bounds, creator authorization, closure, and public ledger state. They do **not** prove that a Preprod transaction finalized.

## CI/CD

`.github/workflows/ci.yml` installs Node 22 and Compact 0.31.1, recompiles, runs tests, typechecking, linting, and a production build on pushes to `main` and pull requests. A CI badge and passing-run link can be added after the repository is published and its first run succeeds; no green status is claimed before then.

## Product Proposal

See [PROPOSAL.md](PROPOSAL.md). Organizer approval is pending.

## Initial Idea

Anonymous feedback is most useful when people can trust both sides: participants need their words separated from identity, and creators need confidence that responses came from eligible people only once. HushHeron uses a private credential with a public approval commitment, a one-use nullifier, and an encrypted answer to provide that balance for small teams and communities.

## Demo Video

Pending recording. In one minute: show the Preprod address, connect Lace, publish/share a survey, approve a commitment, submit from a different wallet while the proof runs, show “Anonymous response verified.”, then show the response count and creator-side aggregate. Show the passing test output and CI run separately. Avoid displaying private keys or individual decrypted answers.

## Screenshots

[Compact compile](public/successcompile.png), [three generated-contract tests passing](public/3test.png), and [Preprod contract deployment](public/deployedcontract.png) are captured from actual commands and the explorer. A passing CI run screenshot is still pending.

## Current Level 1–3 status

| Requirement | Status | Evidence or blocker |
| --- | --- | --- |
| Compact contract compiles, managed artifacts generated | Verified locally | `contracts/hushheron.compact`, `managed/hushheron/` |
| Three tests pass | Verified locally | `npm test` |
| Next.js build | Verified locally | `npm run build` |
| Wallet connect and circuit call | Implemented, live verification pending | Needs a funded Preprod wallet and proof setup |
| Preprod deployment and address | Verified | Address, transaction, block, and explorer screenshot above |
| Live demo and video | Pending | Deployment and recording |
| CI passing run | Pending | Workflow exists; repository is not published |
| Idea approval | Pending | Rise In submission |
| 10+ meaningful commits | Verified locally | Focused conventional commits in Git history |

## Hosting note

The included directory writes JSON to `HUSHHERON_DATA_DIR` with a single-process mutation queue. Use a persistent disk and one Node process for a demo deployment. Serverless ephemeral storage or multiple replicas can lose or race survey metadata; migrate this directory to a durable database before wider use. Responses are encrypted client-side, and the directory does not store wallet addresses or answer plaintext.

## Attribution

The in-memory browser private-state provider is adapted from the [Midnight leaderboard example](https://github.com/midnightntwrk/midnight-leaderboard). Contract and SDK integration follow [Midnight's generated-contract](https://docs.midnight.network/guides/compact-javascript-runtime) and [deployment](https://docs.midnight.network/guides/deploy-and-operate) guides.
