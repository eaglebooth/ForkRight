import { readFile } from "node:fs/promises";
import { createClient } from "genlayer-js";
import { studioNext } from "./network.mjs";

const address = process.env.FORKRIGHT_CONTRACT || "0x091586bff987a691d4DD91d6A1A7F1C49A399202";
const code = await readFile(new URL("../contracts/forkright.py", import.meta.url), "utf8");
const client = createClient({ chain: studioNext });

const schema = await client.getContractSchemaForCode(code);
const methods = Object.keys(schema?.methods ?? schema ?? {});
for (const required of ["register_covenant", "open_claim", "assess_claim", "restore_continuity", "finalize_succession", "get_contract_version"]) {
  if (!methods.includes(required)) throw new Error(`Studio Next schema missing ${required}`);
}
const version = await client.readContract({ address, functionName: "get_contract_version", args: [] });
const stats = await client.readContract({ address, functionName: "get_stats", args: [] });
process.stdout.write(JSON.stringify({ address, methodCount: methods.length, version, stats }, null, 2) + "\n");
