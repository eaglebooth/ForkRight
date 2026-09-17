import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createAccount, createClient } from "genlayer-js";
import { transactionResultNumberToName } from "genlayer-js/types";
import { studioNext } from "./network.mjs";

const contract = "0x091586bff987a691d4DD91d6A1A7F1C49A399202";
const evidenceCommit = "8a12aae63b2ad7fa88eb8c8e8799b9370f07a798";
const rawBase = `https://raw.githubusercontent.com/eaglebooth/ForkRight/${evidenceCommit}/evidence`;
const sha = value => createHash("sha256").update(value).digest("hex");
const unwrap = raw => {
  let value = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (value && typeof value === "object" && Object.keys(value).length === 1 && "result" in value) value = value.result;
  if (typeof value === "string") { try { return JSON.parse(value); } catch { return value; } }
  return value;
};

async function readSecrets() {
  if (process.stdin.isTTY && process.stdin.setRawMode) process.stdin.setRawMode(true);
  process.stdin.resume(); const values = []; let value = "";
  process.stdout.write("Test wallet key 1, then Enter: ");
  for await (const chunk of process.stdin) for (const character of String(chunk)) {
    if (character === "\r" || character === "\n") {
      if (value) {
        const matches = value.match(/[0-9a-fA-F]{64}/g) || [];
        if (!matches.length) throw new Error("Expected a 64-character hex private key");
        values.push(matches[matches.length - 1]); value = "";
        if (values.length === 1) process.stdout.write("\nTest wallet key 2, then Enter: ");
        if (values.length === 2) { process.stdout.write("\n"); return values; }
      }
    } else value += character;
  }
  return values;
}

const secrets = await readSecrets();
const accounts = secrets.map(secret => createAccount(`0x${secret}`));
secrets.fill("");
if (accounts.length !== 2 || accounts[0].address.toLowerCase() === accounts[1].address.toLowerCase()) throw new Error("Two distinct test wallets are required");
const maintainer = createClient({ chain: studioNext, account: accounts[0] });
const steward = createClient({ chain: studioNext, account: accounts[1] });
const reader = createClient({ chain: studioNext });
process.stdout.write(`Maintainer ${accounts[0].address}\nSteward/reporter ${accounts[1].address}\n`);

const evidence = {};
for (const state of ["active", "abandoned", "conflict", "adversarial"]) {
  evidence[state] = {};
  for (const kind of ["activity", "security", "response"]) {
    const content = await readFile(new URL(`../evidence/${state}/${kind}.json`, import.meta.url));
    evidence[state][kind] = { url: `${rawBase}/${state}/${kind}.json`, digest: sha(content) };
  }
}

function rejection(tx, receipt) {
  const leader = tx?.consensus_data?.leader_receipt?.[0];
  const execution = String(leader?.execution_result ?? "").toUpperCase();
  const resultStatus = String(leader?.result?.status ?? "").toUpperCase();
  const finalized = String(tx?.statusName ?? receipt?.statusName ?? "").toUpperCase();
  const consensus = String(tx?.resultName ?? transactionResultNumberToName?.[String(tx?.result)] ?? "").toUpperCase();
  if (execution && execution !== "SUCCESS") return String(leader?.result?.payload?.readable ?? leader?.result?.payload ?? execution);
  if (["ROLLBACK", "ERROR", "FAILED"].some(item => resultStatus.includes(item))) return String(leader?.result?.payload?.readable ?? leader?.result?.payload ?? resultStatus);
  if (finalized && finalized !== "FINALIZED") return `status ${finalized}`;
  if (consensus && !["AGREE", "MAJORITY_AGREE"].includes(consensus)) return `consensus ${consensus}`;
  return "";
}

const transactions = [];
async function write(label, method, args, client, expected = "") {
  let estimate;
  try { estimate = await client.estimateTransactionFeesForWrite({ address: contract, functionName: method, args, value: 0n }); }
  catch { estimate = await client.estimateTransactionFees({ leaderTimeunitsAllocation: 600, validatorTimeunitsAllocation: 600 }); }
  const hash = await client.writeContract({ address: contract, functionName: method, args, value: 0n, fees: { distribution: estimate.distribution, feeValue: estimate.feeValue } });
  transactions.push({ label, hash, expected: expected || "SUCCESS" });
  process.stdout.write(`${label}: ${hash}\n`);
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", interval: 2500, retries: 240 });
  let tx = receipt; try { tx = await client.getTransaction({ hash }); } catch {}
  const failed = rejection(tx, receipt);
  if (expected) {
    if (!failed.includes(expected)) throw new Error(`${label}: expected ${expected}, got ${failed || "success"}`);
    process.stdout.write(`${label}: FINALIZED ROLLBACK ${expected}\n`); return;
  }
  if (failed) throw new Error(`${label}: ${failed}`);
  process.stdout.write(`${label}: FINALIZED\n`);
}
const read = async (method, args = []) => unwrap(await reader.readContract({ address: contract, functionName: method, args }));
const tag = String(Date.now());
const standard = "Abandoned only when no meaningful release or security remediation exists for 120 days, a material unresolved security notice remains, and no substantive maintainer response exists within 30 days.";
const covenantArgs = id => [id, "eaglebooth/ForkRight", accounts[1].address, standard, 120n, 30n, 600n];
const claimArgs = (id, covenant, state) => [id, covenant,
  evidence[state].activity.url, evidence[state].activity.digest,
  evidence[state].security.url, evidence[state].security.digest,
  evidence[state].response.url, evidence[state].response.digest,
  `Pinned ${state} evidence bundle for the exact ForkRight continuity covenant.`];

await write("failure.missingClaim", "assess_claim", [`missing-${tag}`], steward, "CLAIM_NOT_FOUND");
await write("failure.missingCovenant", "open_claim", claimArgs(`claim-missing-${tag}`, `missing-${tag}`, "active"), steward, "COVENANT_NOT_FOUND");

const invalidCov = `invalid-${tag}`;
await write("invalid.register", "register_covenant", covenantArgs(invalidCov), maintainer);
const invalidArgs = claimArgs(`claim-invalid-${tag}`, invalidCov, "active");
invalidArgs[2] = "https://example.com/unpinned.json";
await write("failure.invalidUrl", "open_claim", invalidArgs, steward, "INVALID_EVIDENCE_BUNDLE");

const digestCov = `digest-${tag}`; const digestClaim = `claim-digest-${tag}`;
await write("digest.register", "register_covenant", covenantArgs(digestCov), maintainer);
const digestArgs = claimArgs(digestClaim, digestCov, "active"); digestArgs[3] = "0".repeat(64);
await write("digest.open", "open_claim", digestArgs, steward);
await write("digest.assess", "assess_claim", [digestClaim], steward);
const digestState = await read("get_claim", [digestClaim]);
if (digestState.status !== "UNCERTAIN" || digestState.verdict !== "UNCERTAIN") throw new Error(`Digest tamper did not fail closed: ${JSON.stringify(digestState)}`);
await write("failure.reassess", "assess_claim", [digestClaim], steward, "CLAIM_NOT_ASSESSABLE");

const conflictCov = `conflict-${tag}`; const conflictClaim = `claim-conflict-${tag}`;
await write("conflict.register", "register_covenant", covenantArgs(conflictCov), maintainer);
await write("conflict.open", "open_claim", claimArgs(conflictClaim, conflictCov, "conflict"), steward);
await write("failure.duplicateClaim", "open_claim", claimArgs(conflictClaim, conflictCov, "conflict"), steward, "INVALID_OR_DUPLICATE_CLAIM");
await write("conflict.assess", "assess_claim", [conflictClaim], steward);
const conflictState = await read("get_claim", [conflictClaim]);
if (conflictState.status === "CHALLENGE_PERIOD" || conflictState.verdict === "ABANDONED") throw new Error(`Conflicting evidence opened succession: ${JSON.stringify(conflictState)}`);

const injectionCov = `injection-${tag}`; const injectionClaim = `claim-injection-${tag}`;
await write("injection.register", "register_covenant", covenantArgs(injectionCov), maintainer);
await write("injection.open", "open_claim", claimArgs(injectionClaim, injectionCov, "adversarial"), steward);
await write("injection.assess", "assess_claim", [injectionClaim], steward);
const injectionState = await read("get_claim", [injectionClaim]);
if (injectionState.status === "CHALLENGE_PERIOD" || injectionState.verdict === "ABANDONED") throw new Error(`Prompt injection opened succession: ${JSON.stringify(injectionState)}`);

const roleCov = `role-${tag}`; const roleClaim = `claim-role-${tag}`;
await write("role.register", "register_covenant", covenantArgs(roleCov), maintainer);
await write("role.open", "open_claim", claimArgs(roleClaim, roleCov, "abandoned"), steward);
await write("role.assess", "assess_claim", [roleClaim], steward);
await write("failure.wrongFinalizer", "finalize_succession", [roleClaim], maintainer, "STEWARD_ONLY");
await write("failure.earlyFinalizer", "finalize_succession", [roleClaim], steward, "SUCCESSION_NOT_READY");
await write("role.cleanupRestore", "restore_continuity", [roleClaim, "Maintainer supplies a substantive response during the challenge window to close the adversarial role test."], maintainer);
const stats = await read("get_stats");
process.stdout.write(`FORKRIGHT_ADVERSARIAL_COMPLETE ${JSON.stringify({ contract, evidenceCommit, wallets: { maintainer: accounts[0].address, steward: accounts[1].address }, digestState, conflictState, injectionState, stats, transactions }, null, 2)}\n`);
