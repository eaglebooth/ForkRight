# ForkRight

ForkRight is a GenLayer continuity covenant for open-source projects. A maintainer defines objective inactivity, security-response and challenge windows before a crisis. If a claim is later raised, independent validators inspect immutable GitHub evidence and classify repository continuity as `ACTIVE`, `TEMPORARILY_INACTIVE`, `ABANDONED`, or `UNCERTAIN`. Deterministic contract rules—not the model—decide whether succession may open.

**V1 Studio Next deployment (historical, not V2):** [`0x091586bff987a691d4DD91d6A1A7F1C49A399202`](https://explorer-studio-dev.genlayer.com/address/0x091586bff987a691d4DD91d6A1A7F1C49A399202)

**Live verification:** [Studio Next happy-path and failure-path transaction ledger](docs/LIVE_E2E_EVIDENCE.md)

**V2 Studio Next deployment:** [`0x0991554D61416bD89C848aB6478baA611e6CcED6`](https://explorer-studio-dev.genlayer.com/address/0x0991554D61416bD89C848aB6478baA611e6CcED6). RPC readback confirms `version: 2` and `schema: continuity-covenant-v2`; live workflow tests are still pending. The linked transaction ledger proves V1 only. Read the [V1 adversarial audit](docs/ADVERSARIAL_AUDIT.md) and [V2 migration notes](docs/V2_MIGRATION.md) before relying on the protocol.

## Why GenLayer

Commit timestamps alone cannot distinguish a quiet but maintained library from an abandoned one. ForkRight evaluates the meaning of releases, maintainer responses and unresolved security notices while binding every decision to pinned, content-addressed GitHub evidence.

## Roles and lifecycle

1. The deployer creates the contract and remains protocol administrator.
2. A maintainer commits a V2 manifest inside the named repository and registers a covenant with its pinned URL and SHA-256.
3. A reporter opens a claim with three commit-pinned raw-GitHub evidence documents from that same repository.
4. Validators independently refetch the evidence and return a bounded verdict.
5. `ACTIVE` dismisses the claim; `UNCERTAIN` fails closed; `ABANDONED` opens a challenge window.
6. In V2, the maintainer submits commit-pinned restoration evidence from the same repository; validators must agree on `RESTORED` before the claim closes.
7. After the challenge window, the nominated steward finalizes succession.

No GitHub account, package namespace or private key is transferred. V2 records a canonical on-chain successor and a bounded community mandate only. Repository-hosted evidence remains an assertion by repository contributors; it is not independent proof of every GitHub event.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
python -m pytest -q
```

The user deployed `contracts/forkright.py` to Studio Next at the V2 address above. Verify `get_contract_version()` returns `2` before transacting. The frontend blocks writes to the deployed V1 contract.
