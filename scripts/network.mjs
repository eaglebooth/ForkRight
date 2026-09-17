import { studioDevnet } from "genlayer-js/chains";

export const studioNext = {
  ...studioDevnet,
  rpcUrls: { default: { http: [process.env.GENLAYER_RPC_URL || "https://studio-next.genlayer.com/api"] } },
};
