import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createAccount, createClient } from "genlayer-js";
import { transactionResultNumberToName } from "genlayer-js/types";
import { studioNext } from "./network.mjs";

const contract = "0x091586bff987a691d4DD91d6A1A7F1C49A399202";
const evidenceCommit = "a9b4f6153ee072933c0fdb0610bc89b14bb62fff";
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
for (const state of ["active", "abandoned"]) {
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

const restoreCov = `restore-${tag}`; const restoreClaim = `claim-restore-${tag}`;
await write("restore.register", "register_covenant", covenantArgs(restoreCov), maintainer);
await write("restore.open", "open_claim", claimArgs(restoreClaim, restoreCov, "abandoned"), steward);
await write("restore.assess", "assess_claim", [restoreClaim], steward);
let restoreState = await read("get_claim", [restoreClaim]);
if (restoreState.status !== "CHALLENGE_PERIOD" || restoreState.verdict !== "ABANDONED") throw new Error(`Expected ABANDONED challenge, got ${JSON.stringify(restoreState)}`);
await write("failure.wrongRestorer", "restore_continuity", [restoreClaim, "A substantive corrective release and security response restore maintenance within the challenge window."], steward, "MAINTAINER_ONLY");
await write("failure.earlySuccession", "finalize_succession", [restoreClaim], steward, "SUCCESSION_NOT_READY");
await write("restore.success", "restore_continuity", [restoreClaim, "A substantive corrective release and security response restore maintenance within the challenge window."], maintainer);
restoreState = await read("get_claim", [restoreClaim]);
if (restoreState.status !== "RESTORED") throw new Error("Restoration invariant failed");
const stats = await read("get_stats");
process.stdout.write(`FORKRIGHT_RESTORATION_COMPLETE ${JSON.stringify({ contract, evidenceCommit, wallets: { maintainer: accounts[0].address, steward: accounts[1].address }, restoreState, stats, transactions }, null, 2)}\n`);
