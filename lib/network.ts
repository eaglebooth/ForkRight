import { studioDevnet } from "genlayer-js/chains";

const rpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio-next.genlayer.com/api";
export const GENLAYER_CHAIN = { ...studioDevnet, rpcUrls: { default: { http: [rpcUrl] } } };
export const WALLET_NETWORK = {
  chainId: "0xf22d",
  chainName: "GenLayer Studio Next",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: [rpcUrl],
  blockExplorerUrls: ["https://explorer-studio-dev.genlayer.com/"],
};
