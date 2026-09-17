import { readFile } from "node:fs/promises";
import { createClient } from "genlayer-js";
import { studioNext } from "./network.mjs";

const code = await readFile(new URL("../contracts/forkright.py", import.meta.url), "utf8");
const client = createClient({ chain: studioNext });
const schema = await client.getContractSchemaForCode(code);
const methods = Object.keys(schema?.methods ?? schema ?? {});
for (const required of ["register_covenant", "open_claim", "assess_claim", "expire_claim", "restore_continuity", "finalize_succession", "get_contract_version"]) {
  if (!methods.includes(required)) throw new Error(`Studio Next V2 schema missing ${required}`);
}
process.stdout.write(`ForkRight V2 schema accepted with ${methods.length} methods.\n`);
