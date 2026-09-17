# ForkRight V2 live Studio Next evidence

Contract: [`0x0991554D61416bD89C848aB6478baA611e6CcED6`](https://explorer-studio-dev.genlayer.com/address/0x0991554D61416bD89C848aB6478baA611e6CcED6), Studio Next chain `61997`.

The inputs are explicitly synthetic fixtures committed at [`f54bbaf`](https://github.com/eaglebooth/ForkRight/tree/f54bbaf7dc0565730006aa700eba221075bf3161/.github/forkright) and [`98d3670`](https://github.com/eaglebooth/ForkRight/tree/98d3670720bd44ce00cbb5f8902feaf25ffd22b2/.github/forkright). They test state transitions and must not be represented as real repository history or a real security incident. Private keys are not stored in the repository or this ledger.

## Identity, manifest and scope failures

| Scenario | Transaction | Final result |
| --- | --- | --- |
| Maintainer nominates itself as steward | [`0x76fe…87e3`](https://explorer-studio-dev.genlayer.com/tx/0x76fe8059cd51d829dc4d7c70165720013e06c9e7c0080216840b4372ab2687e3) | Rollback `INVALID_COVENANT` |
| Covenant ID does not match repository manifest | [`0x5ba8…0b98`](https://explorer-studio-dev.genlayer.com/tx/0x5ba8ec0f284a53d6f1f35942b997fa75bfb680b629dc52fb35f22727bc2d0b98) | Rollback `REPOSITORY_MANIFEST_NOT_VERIFIED` |
| Register V2 covenant from verified manifest | [`0xeb33…67e8`](https://explorer-studio-dev.genlayer.com/tx/0xeb339f3b54a5c16ff531d2125bef2eae7497c2506ede590652675d9ce44767e8) | Finalized |
| Duplicate covenant | [`0xa707…19c0`](https://explorer-studio-dev.genlayer.com/tx/0xa7078255b60433678ecf201c3433344cae96b23e8889684c073064585b7819c0) | Rollback `INVALID_OR_DUPLICATE_COVENANT` |
| Evidence URL points at another repository | [`0x509c…50e2`](https://explorer-studio-dev.genlayer.com/tx/0x509c66fa062b4877267a632f35c2455bcdca2c40a94b0b32dcf12306bb2d50e2) | Rollback `INVALID_EVIDENCE_BUNDLE` |
| Assess missing claim | [`0xb708…a883`](https://explorer-studio-dev.genlayer.com/tx/0xb708b954278782e8b49da6fbd00bbbe7f9590f962269ac85887a89f2c56fa883) | Rollback `CLAIM_NOT_FOUND` |

## Semantic verdict paths

| Scenario | Open | Assessment | Canonical readback |
| --- | --- | --- | --- |
| Positive maintenance | [`0xd128…7015`](https://explorer-studio-dev.genlayer.com/tx/0xd1286ce995ff122ba5af6a3bc4620589a1a6e17eb926cb644a0d7a3aa2b67015) | [`0xfde6…e0ed`](https://explorer-studio-dev.genlayer.com/tx/0xfde69c7d0cb4f849dbb0cc9088c80874099eba5710028e4953d7087f8080e0ed) | `ACTIVE / DISMISSED` |
| 60 days quiet, below 120-day threshold | [`0x0862…036c`](https://explorer-studio-dev.genlayer.com/tx/0x0862196c9879860731391a6ecf7ac08fcd51782241d52dc36753ebe3bb2e036c) | [`0x5dc6…4fec`](https://explorer-studio-dev.genlayer.com/tx/0x5dc64114ddef6e9985d111c6bd43b2c7b04d1ca092d880bad07d76c63a324fec) | `TEMPORARILY_INACTIVE` — fixes the V1 ambiguity |
| Contradictory sources | [`0x7bd8…8571`](https://explorer-studio-dev.genlayer.com/tx/0x7bd8e3e69a0ecfd9c96169347a1562d8788939bec7b5293570f7c245dea38571) | [`0x54a1…b8f2`](https://explorer-studio-dev.genlayer.com/tx/0x54a1314f9ce9fae494571aef26eefa0cc68d6eac90e28728045f0c2ecab2b8f2) | `UNCERTAIN`; no succession |
| Prompt-injection fixture plus positive maintenance | [`0xac38…630f`](https://explorer-studio-dev.genlayer.com/tx/0xac38ee85aac1cad6fbe55453b4aa2b93e1e272c93d1619afac29116b76b3630f) | [`0x77aa…e754`](https://explorer-studio-dev.genlayer.com/tx/0x77aab45166e542f2405b1ebfadeceba2706412cd80b250420596299ff78ce754) | `ACTIVE / DISMISSED`; tested fixture did not override the bounded task |

## Digest failure and retry bound

The bad-digest claim opened at [`0x50f8…736f`](https://explorer-studio-dev.genlayer.com/tx/0x50f82c5b239c822903b251fb5e345833bdab94d4b4e493e294b8d3455411736f). Assessments finalized at [`attempt 1`](https://explorer-studio-dev.genlayer.com/tx/0x68e728069a271379589aa27c717072ea7ce338ed5e7598997fc81e554547a304), [`attempt 2`](https://explorer-studio-dev.genlayer.com/tx/0xa07e3e4c0e24d4f5a8bc46fbc7dcad4d4482f5d78f554b13a9407883b31a36f4), and [`attempt 3`](https://explorer-studio-dev.genlayer.com/tx/0x9d38032432a289284a282dbd0cb36116247ab40403e3056a976b168e67e06947). Readback remained `OPEN` for the first two attempts and closed `UNCERTAIN` on the third. Reassessment then rolled back `CLAIM_NOT_ASSESSABLE` at [`0xf4ca…8b76`](https://explorer-studio-dev.genlayer.com/tx/0xf4cac2a61e07d867cd2db58f5af6d8d3327bd3b04c9d651c359d6c759b788b76).

## Verified restoration and succession

The first 60-second abandonment claim was opened at [`0x8fff…b074`](https://explorer-studio-dev.genlayer.com/tx/0x8fff732dedad8928f6682afd6fed0a35b15c3f64b84d289cec93aa020bc9b074) and assessed at [`0xea2f…e73a`](https://explorer-studio-dev.genlayer.com/tx/0xea2fff88ffdfe5b6fdb3d5dcf545363e44d5f2e5f804b7381259f9e3dbd5e73a). Wrong-restorer rejection passed at [`0x3c48…809f`](https://explorer-studio-dev.genlayer.com/tx/0x3c485689153bc111dfbd08eca1e0c0dda8325411e5cad6747696c21af999809f). The attempted “early” finalization [`0x4f7a…193e`](https://explorer-studio-dev.genlayer.com/tx/0x4f7a07800562d6ee5af417dd800d1e0873ffefd9a599c6d31b5900ffc6b8193e) succeeded because the 60-second window elapsed while earlier transactions reached finality. It is recorded as timing-boundary evidence, **not** as an early-rejection pass.

A second covenant used a deterministic 600-second challenge:

| Scenario | Transaction | Final result |
| --- | --- | --- |
| Register second manifest-bound covenant | [`0xefc2…2da9`](https://explorer-studio-dev.genlayer.com/tx/0xefc26164c370b4418407e7ac5a1f4e97576e81a58a75ccd6b6e6f98a645f2da9) | Finalized |
| Open restoration claim | [`0x22e6…9de3`](https://explorer-studio-dev.genlayer.com/tx/0x22e68212d00f208805e39965dbd30e3e143877fdce98851e685ac28a4eaa9de3) | Finalized |
| Assess abandonment | [`0xd8dc…b85f`](https://explorer-studio-dev.genlayer.com/tx/0xd8dce59acb84d7e7c12abf145b9cdfb75e87a48078ae3dcd88365e798ce9b85f) | `ABANDONED / CHALLENGE_PERIOD` |
| Steward attempts restoration | [`0x80cf…8094`](https://explorer-studio-dev.genlayer.com/tx/0x80cfd6b2d0701ceee6552dad5ad2682363039dad313a6c77c954d2239f298094) | Rollback `MAINTAINER_ONLY` |
| Steward finalizes before 600 seconds | [`0xe806…2736`](https://explorer-studio-dev.genlayer.com/tx/0xe806bb188fa7eaaf0aa2a010d59b20d98438e72989a8add8aee402b2f71f2736) | Rollback `SUCCESSION_NOT_READY` |
| Submit future promise only | [`0xf9de…0e98`](https://explorer-studio-dev.genlayer.com/tx/0xf9de8647e9138dd1062458479cedb3bf69f15dab8a89b210a0f5cc7828d90e98) | Returned without restoration; claim remained `CHALLENGE_PERIOD` |
| Submit completed-action fixture | [`0x4392…339d`](https://explorer-studio-dev.genlayer.com/tx/0x43925e3e076a04f68a2edc58ee5bd7cb46759e0df266e2b393e7724a29aa339d) | Claim `RESTORED`; revision incremented |
| Open new abandonment claim | [`0xdb29…8cef`](https://explorer-studio-dev.genlayer.com/tx/0xdb29aeb2b72d07a273ddf30ecc904c1567ad9d9eebf8dc7f2d2233273a9f8cef) | Finalized |
| Assess new claim | [`0x4fc8…5261`](https://explorer-studio-dev.genlayer.com/tx/0x4fc82040d1893d9cfea34f507b3ee72610a9df063b57e2b09c0f03d383bf5261) | `ABANDONED / CHALLENGE_PERIOD` |
| Finalize after on-chain deadline | [`0x28f6…a0a2`](https://explorer-studio-dev.genlayer.com/tx/0x28f639f82ef87312cb9800f3914c3abf619440ee00743f817f683eedb762a0a2) | `SUCCESSOR_RECOGNIZED` |

## Final readback and remaining live gap

Final stats: `2 covenants`, `8 claims`, `2 successions`. The two successions include the valid 60-second timing-boundary transaction and the deterministic 600-second post-deadline transaction.

`expire_claim` is deliberately time-locked for seven days. Its presence and guards pass local source tests, but no seven-day-old V2 claim exists yet, so this method is **not live-E2E verified**. Repository-hosted JSON remains synthetic/self-reported input; these tests do not prove authoritative GitHub event history.
