// Development only: a wallet that signs with a testnet key injected at run time by a
// Playwright script (window.__SUBLEE_DEV_WALLET), so the real app can be driven headlessly
// for the demo recording. The key never appears in source or in a production bundle.
import { Account, JsonRpcProvider, type KeyPairString } from 'near-api-js';
import { signMessage } from 'near-api-js/nep413';
import { CONTRACT_ID, RPC_URL } from './config';

type Injected = { accountId: string; privateKey: string };
type Action = { type: 'FunctionCall'; params: { methodName: string; args: object; gas: string; deposit: string } };

export function injectedDevWallet(): Injected | null {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return null;
  return (window as unknown as { __SUBLEE_DEV_WALLET?: Injected }).__SUBLEE_DEV_WALLET ?? null;
}

export function devWallet({ accountId, privateKey }: Injected) {
  const account = new Account(accountId, new JsonRpcProvider({ url: RPC_URL }), privateKey as KeyPairString);
  return {
    async signAndSendTransaction({ receiverId, actions }: { receiverId: string; actions: Action[] }) {
      const { methodName, args, gas, deposit } = actions[0].params;
      return account.callFunctionRaw({ contractId: receiverId, methodName, args, gas: BigInt(gas), deposit: BigInt(deposit) });
    },
    async signMessage({ message, nonce }: { message: string; recipient: string; nonce: Uint8Array }) {
      const s = await signMessage({ signerAccount: account, payload: { message, recipient: CONTRACT_ID, nonce: nonce as never } });
      const sig = s.signature as Uint8Array;
      return { accountId, publicKey: s.publicKey.toString(), signature: btoa(String.fromCharCode(...sig)) };
    },
  };
}
