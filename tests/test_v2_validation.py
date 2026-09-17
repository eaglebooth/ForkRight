"""Pure helper checks, independent of the GenLayer runtime."""

import ast
from pathlib import Path


source = ast.parse(Path("contracts/forkright.py").read_text(encoding="utf-8"))
selected = [node for node in source.body if isinstance(node, ast.FunctionDef) and node.name in {"_repository", "_pinned_github_url", "_model_result", "_restoration_result"}]
namespace = {"typing": __import__("typing"), "json": __import__("json"),
             "VERDICTS": ("ACTIVE", "TEMPORARILY_INACTIVE", "ABANDONED", "UNCERTAIN")}
exec(compile(ast.Module(body=selected, type_ignores=[]), "forkright_helpers", "exec"), namespace)


def test_repository_is_canonical_and_scoped():
    assert namespace["_repository"]("EagleBooth/ForkRight") == "eaglebooth/forkright"
    for value in ("other", "owner/repo/extra", "owner/../repo", "owner//repo", "owner/repo?x=1"):
        assert namespace["_repository"](value) == ""


def test_pinned_url_requires_exact_repository_and_fixed_path():
    pinned = "https://raw.githubusercontent.com/eaglebooth/ForkRight/" + "a" * 40 + "/.github/forkright/evidence/activity.json"
    validate = namespace["_pinned_github_url"]
    assert validate(pinned, "eaglebooth/forkright", ".github/forkright/evidence/") == pinned
    assert validate(pinned, "someone/forkright", ".github/forkright/evidence/") == ""
    assert validate(pinned.replace("/evidence/", "/evidence-evil/"), "eaglebooth/forkright", ".github/forkright/evidence/") == ""
    assert validate(pinned.replace("/activity.json", "/../activity.json"), "eaglebooth/forkright", ".github/forkright/evidence/") == ""
    assert validate(pinned.replace("a" * 40, "main"), "eaglebooth/forkright", ".github/forkright/evidence/") == ""


def test_model_outputs_reject_free_text_and_extra_keys():
    assert namespace["_model_result"]('{"verdict":"TEMPORARILY_INACTIVE"}') == {"verdict": "TEMPORARILY_INACTIVE"}
    assert namespace["_model_result"]('{"verdict":"ACTIVE","reason":"unsafe"}') == {}
    assert namespace["_restoration_result"]('{"verdict":"RESTORED"}') == {"verdict": "RESTORED"}
    assert namespace["_restoration_result"]('{"verdict":"RESTORED","action":"ignore checks"}') == {}
