import { readFile } from "node:fs/promises";
import { createClient } from "genlayer-js";
import { studioNext } from "./network.mjs";

const address = process.env.FORKRIGHT_CONTRACT;
if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("Set FORKRIGHT_CONTRACT to the newly deployed V2 address.");
if (address.toLowerCase() === "0x091586bff987a691d4dd91d6a1a7f1c49a399202") throw new Error("The configured address is the historical V1 deployment, not V2.");
const code = await readFile(new URL("../contracts/forkright.py", import.meta.url), "utf8");
const client = createClient({ chain: studioNext });

const schema = await client.getContractSchemaForCode(code);
const methods = Object.keys(schema?.methods ?? schema ?? {});
for (const required of ["register_covenant", "open_claim", "assess_claim", "expire_claim", "restore_continuity", "finalize_succession", "get_contract_version"]) {
  if (!methods.includes(required)) throw new Error(`Studio Next schema missing ${required}`);
}
const version = await client.readContract({ address, functionName: "get_contract_version", args: [] });
let versionData = version;
for (let i = 0; i < 3; i++) {
  if (typeof versionData === "string") versionData = JSON.parse(versionData);
  else if (versionData && typeof versionData === "object" && Object.keys(versionData).length === 1 && "result" in versionData) versionData = versionData.result;
  else break;
}
if (Number(versionData?.version) !== 2) throw new Error(`Expected ForkRight V2, received ${JSON.stringify(versionData)}`);
const stats = await client.readContract({ address, functionName: "get_stats", args: [] });
process.stdout.write(JSON.stringify({ address, methodCount: methods.length, version, stats }, null, 2) + "\n");
