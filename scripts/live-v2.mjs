import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createAccount, createClient } from "genlayer-js";
import { transactionResultNumberToName } from "genlayer-js/types";
import { studioNext } from "./network.mjs";

const contract = "0x0991554D61416bD89C848aB6478baA611e6CcED6";
const commit = process.env.FORKRIGHT_EVIDENCE_COMMIT;
const phase = process.env.FORKRIGHT_PHASE || "full";
if (!/^[0-9a-f]{40}$/.test(commit || "")) throw new Error("Set FORKRIGHT_EVIDENCE_COMMIT to the pushed 40-character fixture commit SHA.");
const root = `https://raw.githubusercontent.com/eaglebooth/ForkRight/${commit}/.github/forkright`;
const sha = value => createHash("sha256").update(value).digest("hex");
const normalize = value => {
  for (let i = 0; i < 3; i++) {
    if (typeof value === "string") value = JSON.parse(value);
    else if (value && typeof value === "object" && Object.keys(value).length === 1 && "result" in value) value = value.result;
    else break;
  }
  return value;
};

async function readSecrets() {
  const values = []; let buffer = "";
  if (process.stdin.isTTY && process.stdin.setRawMode) process.stdin.setRawMode(true);
  process.stdin.resume();
  try {
    process.stdout.write("Test wallet key 1, then Enter: ");
    for await (const chunk of process.stdin) for (const character of String(chunk)) {
      if (character === "\r" || character === "\n") {
        if (!buffer) continue;
        const key = buffer.trim(); buffer = "";
        if (!/^(?:0x)?[0-9a-fA-F]{64}$/.test(key)) throw new Error("Expected a 64-character hex private key.");
        values.push(key.replace(/^0x/, ""));
        if (values.length === 2) { process.stdout.write("\n"); return values; }
        process.stdout.write("\nTest wallet key 2, then Enter: ");
      } else buffer += character;
    }
    throw new Error("Two test keys required.");
  } finally {
    if (process.stdin.isTTY && process.stdin.setRawMode) process.stdin.setRawMode(false);
    process.stdin.pause();
  }
}

const keys = await readSecrets();
const accounts = keys.map(key => createAccount(`0x${key}`));
keys.fill("");
if (accounts[0].address.toLowerCase() !== "0xeb57bc7125fa60d7482ce12058397369ab3581f8" ||
    accounts[1].address.toLowerCase() !== "0x2da5393d7bbb9a037dc3abb56dbbc5c150fc843f") {
  throw new Error("Test wallet order/address does not match the pinned manifest. No writes submitted.");
}
const maintainer = createClient({ chain: studioNext, account: accounts[0] });
const steward = createClient({ chain: studioNext, account: accounts[1] });
const reader = createClient({ chain: studioNext });
const read = async (method, args = []) => normalize(await reader.readContract({ address: contract, functionName: method, args }));
const version = await read("get_contract_version");
if (Number(version?.version) !== 2) throw new Error("Target is not ForkRight V2. No writes submitted.");
const initial = await read("get_stats");
if (phase === "full" && Number(initial.covenants) !== 0) throw new Error("Full V2 test expects a fresh contract with zero covenants. No writes submitted.");
const file = async path => readFile(new URL(`../.github/forkright/${path}`, import.meta.url));
const manifest = { url: `${root}/manifest.json`, digest: sha(await file("manifest.json")) };
const evidence = {};
for (const state of ["active", "temporary", "abandoned", "conflict", "injection"]) {
  evidence[state] = {};
  for (const kind of ["activity", "security", "response"]) {
    const path = `evidence/${state}/${kind}.json`;
    evidence[state][kind] = { url: `${root}/${path}`, digest: sha(await file(path)) };
  }
}
const restoration = {};
for (const state of ["promise", "verified"]) {
  const path = `restoration/${state}.json`;
  restoration[state] = { url: `${root}/${path}`, digest: sha(await file(path)) };
}
const standard = "Abandoned only when no meaningful release or security remediation exists for 120 days, a material unresolved security notice remains, and no substantive maintainer response exists within 30 days.";
const covenantId = phase === "resume" ? "v2-e2e-002" : "v2-e2e-001";
const challengeSeconds = phase === "resume" ? 600n : 60n;
const covenantArgs = (id = covenantId, stewardAddress = accounts[1].address) => [id, "eaglebooth/ForkRight", stewardAddress, standard, 120n, 30n, challengeSeconds, manifest.url, manifest.digest];
const claimArgs = (id, state) => [id, covenantId,
  evidence[state].activity.url, evidence[state].activity.digest,
  evidence[state].security.url, evidence[state].security.digest,
  evidence[state].response.url, evidence[state].response.digest,
  `Synthetic ${state} evidence for the V2 continuity E2E fixture.`];
const history = [];
function errorText(tx, receipt) {
  const leader = tx?.consensus_data?.leader_receipt?.[0];
  const execution = String(leader?.execution_result ?? "").toUpperCase();
  const status = String(leader?.result?.status ?? "").toUpperCase();
  const finalized = String(tx?.statusName ?? receipt?.statusName ?? "").toUpperCase();
  const consensus = String(tx?.resultName ?? transactionResultNumberToName?.[String(tx?.result)] ?? "").toUpperCase();
  if (execution && execution !== "SUCCESS") return String(leader?.result?.payload?.readable ?? leader?.result?.payload ?? execution);
  if (["ROLLBACK", "ERROR", "FAILED"].some(item => status.includes(item))) return String(leader?.result?.payload?.readable ?? leader?.result?.payload ?? status);
  if (finalized && finalized !== "FINALIZED") return `status ${finalized}`;
  if (consensus && !["AGREE", "MAJORITY_AGREE"].includes(consensus)) return `consensus ${consensus}`;
  return "";
}
async function write(label, method, args, client, expectedError = "") {
  let estimate;
  try { estimate = await client.estimateTransactionFeesForWrite({ address: contract, functionName: method, args, value: 0n }); }
  catch { estimate = await client.estimateTransactionFees({ leaderTimeunitsAllocation: 600, validatorTimeunitsAllocation: 600 }); }
  const hash = await client.writeContract({ address: contract, functionName: method, args, value: 0n, fees: { distribution: estimate.distribution, feeValue: estimate.feeValue } });
  history.push({ label, hash, expected: expectedError || "SUCCESS" });
  process.stdout.write(`${label}: ${hash}\n`);
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 2500, retries: 240 });
  let tx = receipt; try { tx = await client.getTransaction({ hash }); } catch {}
  const failed = errorText(tx, receipt);
  if (expectedError ? !failed.includes(expectedError) : Boolean(failed)) throw new Error(`${label}: expected ${expectedError || "success"}, observed ${failed || "success"}; tx ${hash}`);
  process.stdout.write(`${label}: ${expectedError ? `FINALIZED ROLLBACK ${expectedError}` : "FINALIZED"}\n`);
  return hash;
}
async function claim(label, id, state, expectedStatus, expectedVerdict = expectedStatus) {
  await write(`${label}.open`, "open_claim", claimArgs(id, state), steward);
  await write(`${label}.assess`, "assess_claim", [id], steward);
  const result = await read("get_claim", [id]);
  process.stdout.write(`${label}.readback: ${JSON.stringify(result)}\n`);
  if (result.status !== expectedStatus || result.verdict !== expectedVerdict) throw new Error(`${label}: expected ${expectedStatus}/${expectedVerdict}; observed ${result.status}/${result.verdict}`);
  return result;
}

process.stdout.write(`V2 live E2E: ${contract}; fixture commit ${commit}; test wallets ${accounts.map(item => item.address).join(" / ")}\n`);
if (phase === "full") {
await write("failure.selfSteward", "register_covenant", covenantArgs("v2-self-steward", accounts[0].address), maintainer, "INVALID_COVENANT");
await write("failure.manifestMismatch", "register_covenant", covenantArgs("v2-wrong-manifest"), maintainer, "REPOSITORY_MANIFEST_NOT_VERIFIED");
await write("register", "register_covenant", covenantArgs(), maintainer);
await write("failure.duplicateCovenant", "register_covenant", covenantArgs(), maintainer, "INVALID_OR_DUPLICATE_COVENANT");
const crossRepo = claimArgs("claim-v2-cross-repo", "active");
crossRepo[2] = crossRepo[2].replace("eaglebooth/ForkRight", "someone/Elsewhere");
await write("failure.crossRepo", "open_claim", crossRepo, steward, "INVALID_EVIDENCE_BUNDLE");
await write("failure.missingClaim", "assess_claim", ["claim-v2-missing"], steward, "CLAIM_NOT_FOUND");
await claim("active", "claim-v2-active-001", "active", "DISMISSED", "ACTIVE");
await claim("temporary", "claim-v2-temporary-001", "temporary", "TEMPORARILY_INACTIVE");
await claim("conflict", "claim-v2-conflict-001", "conflict", "UNCERTAIN");
await claim("injection", "claim-v2-injection-001", "injection", "DISMISSED", "ACTIVE");
const badSha = claimArgs("claim-v2-bad-sha-001", "active"); badSha[3] = "0".repeat(64);
await write("failure.badShaOpen", "open_claim", badSha, steward);
for (let attempt = 1; attempt <= 3; attempt++) {
  await write(`failure.badShaAssess${attempt}`, "assess_claim", ["claim-v2-bad-sha-001"], steward);
  const state = await read("get_claim", ["claim-v2-bad-sha-001"]);
  if (state.status !== (attempt === 3 ? "UNCERTAIN" : "OPEN") || Number(state.assessment_attempts) !== attempt) throw new Error(`Retry invariant failed at attempt ${attempt}: ${JSON.stringify(state)}`);
}
await write("failure.reassess", "assess_claim", ["claim-v2-bad-sha-001"], steward, "CLAIM_NOT_ASSESSABLE");
} else {
  await write("resume.register", "register_covenant", covenantArgs(), maintainer);
}
const restoreId = phase === "resume" ? "claim-v2-restore-002" : "claim-v2-restore-001";
const successionId = phase === "resume" ? "claim-v2-succession-002" : "claim-v2-succession-001";
await claim("restore", restoreId, "abandoned", "CHALLENGE_PERIOD", "ABANDONED");
await write("failure.wrongRestorer", "restore_continuity", [restoreId, restoration.verified.url, restoration.verified.digest], steward, "MAINTAINER_ONLY");
await write("failure.earlySuccession", "finalize_succession", [restoreId], steward, "SUCCESSION_NOT_READY");
await write("restore.promise", "restore_continuity", [restoreId, restoration.promise.url, restoration.promise.digest], maintainer);
if ((await read("get_claim", [restoreId])).status !== "CHALLENGE_PERIOD") throw new Error("Bare promise incorrectly restored continuity.");
await write("restore.verified", "restore_continuity", [restoreId, restoration.verified.url, restoration.verified.digest], maintainer);
if ((await read("get_claim", [restoreId])).status !== "RESTORED") throw new Error("Verified restoration invariant failed.");
await claim("succession", successionId, "abandoned", "CHALLENGE_PERIOD", "ABANDONED");
const pending = await read("get_claim", [successionId]);
const waitMs = Math.max(0, Number(pending.challenge_ends_at) * 1000 - Date.now() + 1500);
if (waitMs) { process.stdout.write(`Waiting ${waitMs}ms for challenge window.\n`); await new Promise(resolve => setTimeout(resolve, waitMs)); }
await write("succession.finalize", "finalize_succession", [successionId], steward);
if ((await read("get_covenant", [covenantId])).state !== "SUCCESSOR_RECOGNIZED") throw new Error("Succession readback invariant failed.");
process.stdout.write(`FORKRIGHT_V2_E2E_COMPLETE ${JSON.stringify({ contract, commit, stats: await read("get_stats"), history }, null, 2)}\n`);
