import { createTransactionKit, type SubmitInput } from "@genlayer/transaction-kit";
import { GENLAYER_CHAIN, WALLET_NETWORK } from "./network";

type Provider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (event: string, fn: (accounts: string[]) => void) => void; removeListener?: (event: string, fn: (accounts: string[]) => void) => void };
declare global { interface Window { ethereum?: Provider } }

export type ChainResult = { success: boolean; data?: unknown; hash?: string; error?: string };
export const contractAddress = () => process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
export const configured = () => !/^0x0{40}$/i.test(contractAddress());
export const explorerTx = (hash: string) => `${process.env.NEXT_PUBLIC_EXPLORER_TX_BASE || "https://explorer-studio-dev.genlayer.com/tx/"}${hash}`;

async function ensureNetwork(provider: Provider) {
  const current = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
  if (current === WALLET_NETWORK.chainId) return;
  try { await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: WALLET_NETWORK.chainId }] }); }
  catch (error) {
    if ((error as { code?: number })?.code !== 4902) throw error;
    await provider.request({ method: "wallet_addEthereumChain", params: [WALLET_NETWORK] });
  }
}

export async function connectWallet(): Promise<ChainResult> {
  if (!window.ethereum) return { success: false, error: "Install or unlock an EVM wallet." };
  try {
    await ensureNetwork(window.ethereum);
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
    return accounts[0] ? { success: true, data: accounts[0] } : { success: false, error: "No account selected." };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "Wallet connection failed." }; }
}

export async function currentWallet() {
  if (!window.ethereum) return "";
  try { return ((await window.ethereum.request({ method: "eth_accounts" })) as string[])[0] || ""; } catch { return ""; }
}

export async function disconnectWallet() {
  try { await window.ethereum?.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }); } catch { /* session cleared by UI */ }
}

export function watchWallet(fn: (address: string) => void) {
  if (!window.ethereum?.on) return () => undefined;
  const listener = (accounts: string[]) => fn(accounts[0] || "");
  window.ethereum.on("accountsChanged", listener);
  return () => window.ethereum?.removeListener?.("accountsChanged", listener);
}

export async function writeContract(method: string, args: unknown[]): Promise<ChainResult> {
  if (!configured()) return { success: false, error: "Deploy ForkRight and configure its address first." };
  if (!window.ethereum) return { success: false, error: "Connect a wallet first." };
  try {
    const version = await readContract("get_contract_version");
    let metadata = version.data;
    for (let i = 0; i < 2 && typeof metadata === "string"; i++) metadata = JSON.parse(metadata);
    if (metadata && typeof metadata === "object" && "result" in metadata) metadata = (metadata as { result: unknown }).result;
    if (!version.success || !metadata || typeof metadata !== "object" || Number((metadata as { version?: unknown }).version) !== 2) {
      return { success: false, error: "This console requires ForkRight V2. Configure the newly deployed V2 contract address; V1 writes are blocked." };
    }
    await ensureNetwork(window.ethereum);
    const account = ((await window.ethereum.request({ method: "eth_requestAccounts" })) as string[])[0] as `0x${string}`;
    const kit = createTransactionKit({ chain: GENLAYER_CHAIN, provider: window.ethereum, account });
    const tx: SubmitInput = { kind: "write", address: contractAddress() as `0x${string}`, method, args };
    const quote = await kit.estimate({ preset: "standard" }, tx);
    if (quote.verification.status === "mismatch") throw new Error("Fee policy changed. Retry with a fresh quote.");
    const submitted = await kit.submit(quote, tx);
    const final = await kit.track(submitted.genlayerTxId, () => undefined, { until: "finalized" });
    if (!final.successful || final.executionResultName !== "FINISHED_WITH_RETURN") return { success: false, hash: submitted.genlayerTxId, error: `Finalized without successful return (${final.executionResultName || final.statusName}).` };
    return { success: true, hash: submitted.genlayerTxId };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "Transaction failed." }; }
}

export async function readContract(method: string, id = ""): Promise<ChainResult> {
  if (!configured()) return { success: false, error: "Contract not configured." };
  try {
    const query = new URLSearchParams({ method }); if (id) query.set("id", id);
    const response = await fetch(`/api/state?${query}`, { cache: "no-store" });
    return await response.json() as ChainResult;
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : "Read failed." }; }
}
