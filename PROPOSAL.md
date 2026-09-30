# Product Proposal: Anonymous Feedback / Survey

Selected idea from the organizer's Level 3 list: **Anonymous Feedback / Survey**.

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

The Compact contract and wallet flow target Preprod. Before wider hosting or Mainnet, the directory needs durable storage and abuse controls, the creator key needs stronger custody, and the full flow needs broader multi-participant and anonymity testing. The [Preprod `submitAnswer` transaction](https://preprod.midnightexplorer.com/transactions/0x08c4c9a5ef7a67a80c20edab12b860b12f279b5b602856f83cbfc754df48db59) demonstrates one live circuit call; it does not establish Mainnet readiness.

## Approval

No Rise In submission receipt or organizer decision has been provided. Submission and approval remain pending; add the receipt and decision link here when available.
