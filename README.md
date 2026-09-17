# ForkRight

ForkRight is a GenLayer continuity covenant for open-source projects. A maintainer defines objective inactivity, security-response and challenge windows before a crisis. If a claim is later raised, independent validators inspect immutable GitHub evidence and classify repository continuity as `ACTIVE`, `TEMPORARILY_INACTIVE`, `ABANDONED`, or `UNCERTAIN`. Deterministic contract rules—not the model—decide whether succession may open.

**Studio Next deployment:** [`0x091586bff987a691d4DD91d6A1A7F1C49A399202`](https://explorer-studio-dev.genlayer.com/address/0x091586bff987a691d4DD91d6A1A7F1C49A399202)

**Live verification:** [Studio Next happy-path and failure-path transaction ledger](docs/LIVE_E2E_EVIDENCE.md)

**Security status:** V1 is an experimental prototype. Read the [adversarial audit and required V2 controls](docs/ADVERSARIAL_AUDIT.md) before relying on it for real repository governance.

## Why GenLayer

Commit timestamps alone cannot distinguish a quiet but maintained library from an abandoned one. ForkRight evaluates the meaning of releases, maintainer responses and unresolved security notices while binding every decision to pinned, content-addressed GitHub evidence.

## Roles and lifecycle

1. The deployer creates the contract and remains protocol administrator.
2. A maintainer registers a repository covenant and nominates a community steward.
3. A reporter opens a claim with three pinned raw-GitHub evidence documents.
4. Validators independently refetch the evidence and return a bounded verdict.
5. `ACTIVE` dismisses the claim; `UNCERTAIN` fails closed; `ABANDONED` opens a challenge window.
6. In V1, the maintainer can mark continuity restored during the challenge window using a free-text note. This is not independently verified; see the security audit.
7. After the challenge window, the nominated steward finalizes succession.

No GitHub account, package namespace or private key is transferred. V1 records a canonical on-chain successor and a bounded community mandate only.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
python -m pytest -q
```

Deploy `contracts/forkright.py` to Studio Next with no constructor arguments, then set `NEXT_PUBLIC_CONTRACT_ADDRESS`.
