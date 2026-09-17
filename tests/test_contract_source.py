from pathlib import Path


SOURCE = Path("contracts/forkright.py").read_text(encoding="utf-8")


def test_studio_next_runner_is_pinned():
    assert SOURCE.startswith('# v0.3.0\n# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }')


def test_contract_exposes_complete_lifecycle():
    for method in ("register_covenant", "open_claim", "assess_claim", "restore_continuity", "finalize_succession"):
        assert f"def {method}(" in SOURCE


def test_evidence_is_commit_pinned_and_digest_bound():
    assert "raw.githubusercontent.com" in SOURCE
    assert "len(commit) != 40" in SOURCE
    assert "SOURCE_DIGEST_MISMATCH" in SOURCE


def test_bounded_model_verdicts():
    for verdict in ("ACTIVE", "TEMPORARILY_INACTIVE", "ABANDONED", "UNCERTAIN"):
        assert verdict in SOURCE
    assert 'set(item.keys()) != {"verdict", "reason"}' in SOURCE


def test_validators_refetch_same_sources():
    assert "checked = json.loads(evaluate())" in SOURCE
    assert "gl.vm.run_nondet(evaluate, validate)" in SOURCE


def test_model_cannot_directly_finalize_succession():
    assessment = SOURCE[SOURCE.index("def assess_claim"):SOURCE.index("def restore_continuity")]
    assert "SUCCESSOR_RECOGNIZED" not in assessment
    assert 'claim.status = "CHALLENGE_PERIOD"' in assessment


def test_succession_requires_steward_and_elapsed_window():
    finalizer = SOURCE[SOURCE.index("def finalize_succession"):SOURCE.index("def get_contract_version")]
    assert "STEWARD_ONLY" in finalizer
    assert "self._now() < int(claim.challenge_ends_at)" in finalizer


def test_maintainer_challenge_rotates_revision():
    restoration = SOURCE[SOURCE.index("def restore_continuity"):SOURCE.index("def finalize_succession")]
    assert "MAINTAINER_ONLY" in restoration
    assert "covenant.revision += u256(1)" in restoration
