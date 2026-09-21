# Independent verification — PatchProof PP-2026-001

This synthetic report exists solely to exercise the PatchProof Intelligent Contract on GenLayer Studionet. It is not a disclosure about a production package.

The authorization-bypass corpus described by the advisory was reproduced against the simulated parser version 2.4.0. Nested duplicate `scope` fields caused the gateway and worker to select different authorization values.

The same corpus was executed against simulated version 2.4.1. The request was rejected before authorization because duplicate security-sensitive fields are no longer accepted. Regression cases for nested, reordered, malformed, and mixed-encoding payloads passed. Canonical parser mode was confirmed. The remaining integration risk is that downstream adopters must retain canonical mode; this matches the patch report.

Conclusion: the evidence supports the claimed root-cause fix, affected range `<2.4.1`, fixed version `2.4.1`, regression coverage, and documented residual configuration risk.
