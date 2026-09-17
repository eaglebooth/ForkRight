# ForkRight V1 adversarial audit

Scope: deployed Studio Next V1 at `0x091586bff987a691d4DD91d6A1A7F1C49A399202`, source in `contracts/forkright.py`, frontend and live validator behavior.

## Verdict

V1 is a working semantic-state prototype with meaningful live consensus evidence. It is **not production-safe for authoritative repository succession**. The following findings require a new contract deployment; they cannot be fixed by the frontend or documentation.

## Critical findings

### A-01 — Repository identity is not authenticated

Any address can register a covenant whose `repository` string names any GitHub repository. The contract does not verify that the sender controls or is endorsed by that repository. A malicious user can create a visually plausible but unauthorized covenant.

Required V2 control: a commit-pinned repository manifest containing the covenant address, maintainer address and steward address, fetched and validated by GenLayer before covenant activation; alternatively a GitHub App attestation bound to the same fields.

### A-02 — Evidence URLs are not bound to the covenant repository

`_pinned_github_url` proves only that a URL is raw GitHub content at a 40-character commit. It does not require the URL owner/repository to equal `Covenant.repository`. A reporter can host fabricated evidence in a repository they control and use it against an unrelated covenant.

Required V2 control: parse and canonicalize `owner/repo`; enforce an exact match with the covenant repository for every evidence URL. Bind repository, commit and paths into the assessment digest.

## High findings

### A-03 — Restoration is an unverified free-text veto

During the challenge window the maintainer can call `restore_continuity` with any 30–600 character note. No pinned corrective evidence is fetched and no validator checks whether maintenance was actually restored. This allows a nominal maintainer to block legitimate succession indefinitely by restoring and waiting for another claim.

Required V2 control: restoration evidence bundle, content hashes, independent validator re-fetch, and a bounded `RESTORED | NOT_RESTORED | UNCERTAIN` verdict. Increment revision only after `RESTORED` consensus.

### A-04 — Evidence documents are assertions, not authoritative GitHub observations

The current JSON fixtures demonstrate semantic behavior but do not prove real GitHub release, advisory, issue or maintainer-response state. Content addressing prevents post-submission mutation; it does not make the content true.

Required V2 control: fetch fixed GitHub API/raw repository resources whose identity and schema are contract-bound, or require signed attestations from an audited adapter.

## Medium findings

### A-05 — `TEMPORARILY_INACTIVE` is semantically ambiguous

Live validators classified 60 days of quiet activity, below a 120-day threshold, as `ACTIVE` rather than `TEMPORARILY_INACTIVE`. The reason correctly stated that abandonment criteria were not met, but the state taxonomy and prompt do not force a consistent distinction.

Required V2 control: make mutually exclusive decision rules explicit. Example: recent meaningful maintenance/response → `ACTIVE`; inactivity below threshold with no positive maintenance proof → `TEMPORARILY_INACTIVE`; all abandonment clauses satisfied → `ABANDONED`; otherwise → `UNCERTAIN`.

### A-06 — Source failure cannot be retried

A temporary 404 or digest failure stores `UNCERTAIN`, restores the covenant to `HEALTHY`, and makes the claim permanently non-assessable. This fails closed for safety but harms liveness and forces a new claim ID and more state.

Required V2 control: bounded retry tickets tied to the same immutable evidence bundle, attempt counter and expiry.

### A-07 — Validator reason is not consensus-bound

Validators compare verdict and evidence digest, but not normalized `reason`. A misleading leader reason can be stored even where validators agree only on the consequential verdict.

Required V2 control: derive the public reason deterministically from agreed reason codes, or include a bounded reason code in validator equality.

## Low / operational findings

- No reporter bond, per-address quota or active-claim limit; transaction fees are the only spam resistance.
- Global IDs can be front-run. Namespace covenant/claim IDs by creator or derive IDs from canonical payloads.
- The contract recognizes an on-chain successor only. It cannot transfer GitHub accounts, package namespaces, private keys or legal ownership.
- Genuine multi-validator disagreement was not intentionally induced. Commit-pinned evidence removes normal data drift; manufacturing a mutable source would invalidate the evidence model itself.

## Controls verified live

- Content digest mismatch and HTTP 404 fail closed.
- Conflicting evidence returns `UNCERTAIN`.
- The tested prompt-injection fixture finalized `ACTIVE/DISMISSED`; no succession opened. This is not a general guarantee against prompt injection.
- Duplicate covenant/claim, missing IDs, invalid URL, reassessment, wrong maintainer/steward and early finalization are rejected.
- Active evidence dismisses a claim; abandonment opens a challenge; restoration and post-deadline succession transitions work.
