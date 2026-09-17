# ForkRight live Studio Next evidence

Verified against [`0x091586bff987a691d4DD91d6A1A7F1C49A399202`](https://explorer-studio-dev.genlayer.com/address/0x091586bff987a691d4DD91d6A1A7F1C49A399202) on Studio Next, chain `61997`.

- Maintainer: `0xeb57bc7125fa60d7482CE12058397369AB3581f8`
- Steward/reporter: `0x2da5393d7BBb9A037dc3abB56DbbC5C150fc843f`
- Commit-pinned evidence: [`a9b4f615`](https://github.com/eaglebooth/ForkRight/tree/a9b4f6153ee072933c0fdb0610bc89b14bb62fff/evidence)

Private keys are not stored in the repository or evidence ledger.

## Active-maintenance path

| Step | Transaction | Final result |
| --- | --- | --- |
| Reject maintainer as its own steward | [`0x1433…dadb`](https://explorer-studio-dev.genlayer.com/tx/0x14330a84751c94553a4888c8250a3dad5eb254f53220b4acb09c1484dd5cdadb) | Rollback `INVALID_COVENANT` |
| Register covenant | [`0xfcc8…c24d`](https://explorer-studio-dev.genlayer.com/tx/0xfcc8ae465d5bd4adcce11847ba800503c9fb2f69897f9b38b2c9965f04f5c24d) | Finalized |
| Reject duplicate covenant | [`0xc95c…d9c4`](https://explorer-studio-dev.genlayer.com/tx/0xc95cb3b5c2328825b04f55db4833784f148178aa7f49443d0d91b5b3df17d9c4) | Rollback `INVALID_OR_DUPLICATE_COVENANT` |
| Open active-evidence claim | [`0xd315…9e82`](https://explorer-studio-dev.genlayer.com/tx/0xd315aa324f1cea915225dcfea6fb431f4a5c126e8f28e6e3c586ab06ff4b9e82) | Finalized |
| Independent validator assessment | [`0xf81b…1de5`](https://explorer-studio-dev.genlayer.com/tx/0xf81be8704e1bccc681b115d49ed1a7e62e49184496484b16cafa264ccdbf1de5) | Verdict `ACTIVE`; claim `DISMISSED` |

## Abandonment and succession path

| Step | Transaction | Final result |
| --- | --- | --- |
| Register covenant | [`0x733f…3764`](https://explorer-studio-dev.genlayer.com/tx/0x733f142c47c66c4fd32d19931d66b773f1fffb469eaf58ca1867a35d29013764) | Finalized |
| Open abandonment claim | [`0x72e7…ccd0`](https://explorer-studio-dev.genlayer.com/tx/0x72e7242041eba428f4af8c3f375fdab1eb7b60fb56ae4562a88376a6718cccd0) | Finalized |
| Independent validator assessment | [`0xe45d…6248`](https://explorer-studio-dev.genlayer.com/tx/0xe45d6a2dd5c5d39ad87819f06ecf00a28ff2c3def7de8f2f849665cd25016248) | Verdict `ABANDONED`; challenge opened |
| Reject non-maintainer restoration | [`0x9b49…a6cb`](https://explorer-studio-dev.genlayer.com/tx/0x9b49047f015e314b1f0702269fca3b0746cb742c5e949d6cfaf280b64703a6cb) | Rollback `MAINTAINER_ONLY` |
| Steward finalizes after the 60-second window elapsed | [`0xd6c4…eeb8`](https://explorer-studio-dev.genlayer.com/tx/0xd6c47000dd06433abbeedc7b3b56e12dd3d00d9711fdc0bdc9ec484c8569eeb8) | `SUCCESSOR_RECOGNIZED` |

The finalization was submitted near the boundary and executed after the 60-second deadline. This is valid contract behavior because eligibility is checked at execution time. A separate 600-second covenant below proves the early-finalization rejection without this timing race.

## Challenge and restoration path

| Step | Transaction | Final result |
| --- | --- | --- |
| Register 600-second covenant | [`0xfedc…5276`](https://explorer-studio-dev.genlayer.com/tx/0xfedc7b03477ee008496c456d510bb3c03cec7996ed53fb964a430f2334c45276) | Finalized |
| Open abandonment claim | [`0x4f97…68b3`](https://explorer-studio-dev.genlayer.com/tx/0x4f97e6da408afcc75f5a3366477f57ad53b593dd540b5fe823956933326a68b3) | Finalized |
| Independent validator assessment | [`0x9185…67d7`](https://explorer-studio-dev.genlayer.com/tx/0x9185ec972edd148cb37e366a1aad168565108b573f43385284c71551d80167d7) | Verdict `ABANDONED`; challenge opened |
| Reject steward restoration | [`0x5d46…83b2`](https://explorer-studio-dev.genlayer.com/tx/0x5d4602b7378c8f9f003c3c99f12f7485ef229f18ed9f218751cbff4e7d4e83b2) | Rollback `MAINTAINER_ONLY` |
| Reject succession before deadline | [`0xbed4…ef6f`](https://explorer-studio-dev.genlayer.com/tx/0xbed40e668d2259c728f686d30e356712a2d89a54cbe78caabca9f9d5d409ef6f) | Rollback `SUCCESSION_NOT_READY` |
| Maintainer restores continuity | [`0xdb44…cc83`](https://explorer-studio-dev.genlayer.com/tx/0xdb44b8f4cc3d695d1768dd37af4a27b73b2390384349d2c09f1067adcb88cc83) | Claim `RESTORED`; covenant revision incremented |

## Final readback

```json
{
  "claims": "3",
  "covenants": "3",
  "successions": "1"
}
```

The restored claim retains its original semantic verdict `ABANDONED` as history while its deterministic lifecycle status becomes `RESTORED`. Its evidence digest is `78982a05b6c7169c08c7889aea58152b3b55829231c46dd51ff02aaf87b139be`.
