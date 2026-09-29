# Product Proposal

## What is the product, and who uses it?

HushHeron is an anonymous feedback and survey app for teams, communities, and researchers. A creator publishes one focused question and approves participant commitments. Approved participants answer on a private 1–5 scale. The creator sees verified totals and a browser-computed aggregate.

## Why Midnight specifically?

Midnight lets the participant prove membership in the approved credential tree and prove their credential was used only once without disclosing which credential they hold. The contract stores a nullifier, a response commitment, and counts. It does not store the answer or participant secret.

## Data Model

| Data Point | Type | Disclosed To |
| --- | --- | --- |
| Survey title and question | Public app directory | Everyone |
| Approved credential commitment | Public ledger | Everyone |
| Credential secret and Merkle path | Private witness | Participant and their chosen proving setup |
| Answer and random salt | Private circuit input | Participant and their chosen proving setup |
| One-use nullifier | Public ledger | Everyone, without the credential link |
| Answer commitment | Public ledger | Everyone, without plaintext |
| Encrypted answer | App directory | Ciphertext visible to everyone |
| Decryption key | Creator browser only | Creator |
| Verified count | Public ledger | Everyone |
| Answer distribution | Creator browser aggregate | Creator |

## Mainnet Feasibility

The Compact contract and wallet flow target current Preprod APIs. Before Mainnet, the directory needs authenticated, durable storage and abuse controls; the creator key needs stronger custody; and the app needs real wallet, proof, settlement, and anonymity testing with several participants. No Mainnet readiness or organizer approval is claimed here.

## Approval

Pending submission to Rise In. The creator must submit this proposal and record the decision.
