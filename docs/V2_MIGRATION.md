# ForkRight V2 migration and verification

V2 source is `contracts/forkright.py`. It was deployed at [`0x0991554D61416bD89C848aB6478baA611e6CcED6`](https://explorer-studio-dev.genlayer.com/address/0x0991554D61416bD89C848aB6478baA611e6CcED6). Studio Next RPC confirms `version: 2`, schema `continuity-covenant-v2`, and initial counters of zero. **No V2 write-path transaction has been verified yet.** The V1 address and transaction ledger must not be presented as V2 proof. V2 is a fresh deployment, not a state migration; existing covenants and claims remain on V1.

## Changes from V1

- Registration requires a commit-pinned, SHA-256-bound `.github/forkright/manifest.json` in the named repository. Validators independently fetch it and require exact equality of version, repository, covenant ID, maintainer address, steward address and maintenance-standard SHA-256.
- Claim evidence must use `.github/forkright/evidence/` inside the same repository. JSON must declare that repository. Hash or source failures remain `OPEN` for two retries, then close as `UNCERTAIN` on the third attempt. Any unassessed claim may be expired by anyone after seven days, releasing the covenant.
- Assessment outputs only a bounded verdict. The public reason is derived deterministically from it. The prompt explicitly distinguishes a quiet-but-not-abandoned repository from positive evidence of activity.
- Restoration requires a commit-pinned document under `.github/forkright/restoration/` in the same repository, with matching `repository` and `claim_id`, and validator agreement on `RESTORED`. A mere promise must not be accepted.
- The frontend checks `get_contract_version() == 2` before any write. Its example environment leaves the contract address unset.

## Manifest format

Commit this exact JSON object to `.github/forkright/manifest.json` in the repository before registration; use lowercase addresses and repository name. `maintenance_standard_sha256` is the SHA-256 of the normalized standard string submitted to the contract (trim and collapse internal whitespace).

```json
{
  "version": 2,
  "repository": "owner/repo",
  "covenant_id": "example-001",
  "maintainer": "0x0000000000000000000000000000000000000001",
  "steward": "0x0000000000000000000000000000000000000002",
  "maintenance_standard_sha256": "<64 lowercase hex characters>"
}
```

The URL must use `https://raw.githubusercontent.com/owner/repo/<40-character-commit>/.github/forkright/manifest.json`. Compute SHA-256 over the **exact bytes** served at that URL. The address calling `register_covenant` must equal `maintainer`.

## Deployment and live acceptance gate

1. Deployment is complete at the V2 address above using the user's deployment wallet; do not use the two testing wallets for deployment.
2. `get_contract_version()` confirmed `version: 2`; the frontend example and local environment now use the V2 address. Do not reuse the V1 address.
3. With two separate test wallets, verify registered manifest success, forged/mismatched manifest rollback, cross-repository evidence rollback, active/dismissed, temporary inactivity, abandonment/challenge, conflicting/404/digest failure, retry limit, seven-day expiry, verified restoration, rejected bare-promise restoration, wrong-role and early finalization, and post-window succession.
4. Record explorer transaction links and finalized readbacks. Until then V2 claims are **local-code only**, not live E2E.

## Remaining trust limits

The manifest proves a historical ability to commit to the repository, not current GitHub organization authorization. Repository files can still contain self-reported or misleading observations. V2 does not independently query authoritative GitHub release, advisory or issue APIs, and semantic model output may still be wrong. No GitHub account or package registry control changes hands. Do not use V2 for production succession without an external attestation/data-source design and a separate security review.
