// Public, non-secret configuration shared by browser and server.
export const NETWORK = (process.env.NEXT_PUBLIC_NEAR_NETWORK ?? 'testnet') as 'testnet' | 'mainnet';
export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? 'sublee.testnet';
export const RPC_URLS = (process.env.NEXT_PUBLIC_RPC_URLS ?? 'https://test.rpc.fastnear.com,https://rpc.testnet.near.org').split(',');
export const RPC_URL = RPC_URLS[0];
export const USDC_ID =
  process.env.NEXT_PUBLIC_USDC_ID ?? '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af';
export const NEARAI_API = 'https://cloud-api.near.ai';

/** Models with confirmed NEAR-hosted TEE attestation + E2EE support (checked 2026-11-09). */
export const E2EE_MODELS = [
  'z-ai/glm-5.3-flash',
  'Qwen/Qwen3.8-27B',
  'deepseek-ai/DeepSeek-V4.1-Flash-1017',
  'Qwen/Qwen3-VL-30B-A3B-Instruct',
] as const;

/** NEP-413 auth message for a consult. Binds the wallet signature to this consult and these exact ciphertexts. */
export const consultAuthMessage = (consultId: number, bodyHash: string) =>
  `Sublee consult #${consultId}\nI authorise sending my encrypted case to the enclave.\nbody:${bodyHash}`;

/** NEP-413 message a patient signs to cancel a paid consult they haven't used. */
export const cancelAuthMessage = (consultId: number) => `Sublee: cancel consult #${consultId} and refund me.`;
