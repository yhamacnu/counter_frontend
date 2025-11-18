import { Program, AnchorProvider, web3, Idl } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor";
import type { PublicKey as SolPublicKey, Transaction as SolTransaction } from "@solana/web3.js";
import idl from "./counter_idl.json";

const { PublicKey, Connection, Transaction } = web3;

// Use Idl type for the imported JSON to avoid `any` casts
const idlTyped = idl as unknown as Idl;
export const PROGRAM_ID = new PublicKey(idlTyped.metadata?.address || "");

const DEFAULT_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || "http://localhost:8899";

// Minimal strongly-typed Phantom provider surface we use in the dApp
export interface PhantomProvider {
  publicKey?: SolPublicKey;
  isPhantom?: boolean;
  isConnected?: boolean;
  connect: () => Promise<void> | Promise<{ publicKey: SolPublicKey }>;
  signTransaction?: (tx: SolTransaction) => Promise<SolTransaction>;
  signAllTransactions?: (txs: SolTransaction[]) => Promise<SolTransaction[]>;
  on?: (event: string, handler: (arg?: unknown) => void) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeWalletAdapter(phatomProvider: PhantomProvider): Wallet {
  // Minimal wallet adapter compatible with AnchorProvider
  return {
    publicKey: phatomProvider.publicKey as any,
    signTransaction: phatomProvider.signTransaction?.bind(phatomProvider) as any,
    signAllTransactions: phatomProvider.signAllTransactions?.bind(phatomProvider) as any,
  } as unknown as Wallet;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getProgram() {
  const connection = new Connection(DEFAULT_RPC, "processed");

  const win = window as unknown as { solana?: PhantomProvider };
  const wallet = win.solana;
  if (!wallet || !wallet.isPhantom) {
    throw new Error("Phantom wallet not found. Please install Phantom and refresh.");
  }

  const walletAdapter = makeWalletAdapter(wallet);

  const provider = new AnchorProvider(connection, walletAdapter as Wallet, AnchorProvider.defaultOptions());

  // Quick RPC connectivity check to give a friendlier error when the RPC is not reachable
  try {
    // Use getVersion as a lightweight RPC probe
    await connection.getVersion();
  } catch {
    try {
      await connection.getLatestBlockhash();
    } catch (err2) {
      const msg = err2 instanceof Error ? err2.message : String(err2);
      throw new Error(
        `RPC unreachable at ${DEFAULT_RPC}: ${msg}\nEnsure your RPC endpoint is correct and reachable from the browser. If you're using a local validator, start it (e.g. 'solana-test-validator') and set NEXT_PUBLIC_SOLANA_RPC to http://localhost:8899, or use a public RPC such as https://api.devnet.solana.com`
      );
    }
  }

  const program = new Program(idlTyped, PROGRAM_ID, provider);
  return { program, provider, connection };
}

export async function findCounterPda(authorPubkey: SolPublicKey) {
  return PublicKey.findProgramAddress([Buffer.from("INIT_COUNTER_SEED"), authorPubkey.toBuffer()], PROGRAM_ID);
}

export async function findModifierPda(modifierPubkey: SolPublicKey, counterPubkey: SolPublicKey) {
  return PublicKey.findProgramAddress([
    Buffer.from("MODIFY_COUNTER_SEED"),
    modifierPubkey.toBuffer(),
    counterPubkey.toBuffer(),
  ], PROGRAM_ID);
}
