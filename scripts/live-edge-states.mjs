import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createAccount, createClient } from "genlayer-js";
import { transactionResultNumberToName } from "genlayer-js/types";
import { studioNext } from "./network.mjs";

const contract = "0x091586bff987a691d4DD91d6A1A7F1C49A399202";
const evidenceCommit = "c8530e95107d62a234a088c608dcae1716e3c3eb";
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
  try {
    process.stdout.write("Test wallet key 1, then Enter: ");
    for await (const chunk of process.stdin) for (const character of String(chunk)) {
      if (character === "\r" || character === "\n") {
        if (value) {
          const candidate = value.trim();
          if (!/^(?:0x)?[0-9a-fA-F]{64}$/.test(candidate)) throw new Error("Expected a 64-character hex private key");
          values.push(candidate.replace(/^0x/, "")); value = "";
          if (values.length === 1) process.stdout.write("\nTest wallet key 2, then Enter: ");
          if (values.length === 2) { process.stdout.write("\n"); return values; }
        }
      } else value += character;
    }
    return values;
  } finally {
    if (process.stdin.isTTY && process.stdin.setRawMode) process.stdin.setRawMode(false);
    process.stdin.pause();
  }
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
for (const state of ["temporary"]) {
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

const temporaryCov = `temporary-${tag}`; const temporaryClaim = `claim-temporary-${tag}`;
await write("temporary.register", "register_covenant", covenantArgs(temporaryCov), maintainer);
await write("temporary.open", "open_claim", claimArgs(temporaryClaim, temporaryCov, "temporary"), steward);
await write("temporary.assess", "assess_claim", [temporaryClaim], steward);
const temporaryState = await read("get_claim", [temporaryClaim]);
const temporaryMatched = temporaryState.status === "TEMPORARILY_INACTIVE" && temporaryState.verdict === "TEMPORARILY_INACTIVE";
if (!temporaryMatched) process.stderr.write(`SEMANTIC_MISMATCH: expected TEMPORARILY_INACTIVE; observed ${JSON.stringify(temporaryState)}\n`);

const unavailableCov = `unavailable-${tag}`; const unavailableClaim = `claim-unavailable-${tag}`;
await write("unavailable.register", "register_covenant", covenantArgs(unavailableCov), maintainer);
const unavailableArgs = claimArgs(unavailableClaim, unavailableCov, "temporary");
unavailableArgs[2] = `https://raw.githubusercontent.com/eaglebooth/ForkRight/${evidenceCommit}/evidence/temporary/does-not-exist.json`;
await write("unavailable.open", "open_claim", unavailableArgs, steward);
await write("unavailable.assess", "assess_claim", [unavailableClaim], steward);
const unavailableState = await read("get_claim", [unavailableClaim]);
if (unavailableState.status !== "UNCERTAIN" || unavailableState.verdict !== "UNCERTAIN") throw new Error(`HTTP failure did not fail closed: ${JSON.stringify(unavailableState)}`);
const stats = await read("get_stats");
process.stdout.write(`FORKRIGHT_EDGE_STATES_COMPLETE ${JSON.stringify({ contract, evidenceCommit, wallets: { maintainer: accounts[0].address, steward: accounts[1].address }, temporaryMatched, temporaryState, unavailableState, stats, transactions }, null, 2)}\n`);
