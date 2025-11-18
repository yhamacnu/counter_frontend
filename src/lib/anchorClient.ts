import { Program, AnchorProvider, web3, Idl } from "@coral-xyz/anchor";
import idl from "./counter_idl.json";

const { SystemProgram, PublicKey, Keypair, Connection } = web3;

export const PROGRAM_ID = new PublicKey((idl as any).metadata?.address || "");

const DEFAULT_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || "http://localhost:8899";

function makeWalletAdapter(phatomProvider: any) {
  // Minimal wallet adapter compatible with AnchorProvider
  return {
    publicKey: phatomProvider.publicKey,
    signTransaction: (tx: web3.Transaction) => phatomProvider.signTransaction(tx),
    signAllTransactions: (txs: web3.Transaction[]) => phatomProvider.signAllTransactions(txs),
  };
}

export async function getProgram() {
  const connection = new Connection(DEFAULT_RPC, "processed");

  const wallet = (window as any).solana;
  if (!wallet || !wallet.isPhantom) {
    throw new Error("Phantom wallet not found. Please install Phantom and refresh.");
  }

  const walletAdapter = makeWalletAdapter(wallet);

  const provider = new AnchorProvider(connection, walletAdapter as any, AnchorProvider.defaultOptions());

  // Quick RPC connectivity check to give a friendlier error when the RPC is not reachable
  try {
    // Use getVersion as a lightweight RPC probe
    // some nodes may restrict certain methods; getVersion is generally available
    // fallback to getLatestBlockhash if getVersion is not supported
    await connection.getVersion();
  } catch (err) {
    try {
      await connection.getLatestBlockhash();
    } catch (err2) {
      throw new Error(
        `RPC unreachable at ${DEFAULT_RPC}: ${(err2 as Error).message || err}
Ensure your RPC endpoint is correct and reachable from the browser. If you're using a local validator, start it (e.g. 'solana-test-validator') and set NEXT_PUBLIC_SOLANA_RPC to http://localhost:8899, or use a public RPC such as https://api.devnet.solana.com`
      );
    }
  }

  const program = new Program(idl as Idl, PROGRAM_ID, provider);
  return { program, provider, connection };
}

export async function findCounterPda(authorPubkey: PublicKey) {
  return PublicKey.findProgramAddress([Buffer.from("INIT_COUNTER_SEED"), authorPubkey.toBuffer()], PROGRAM_ID);
}

export async function findModifierPda(modifierPubkey: PublicKey, counterPubkey: PublicKey) {
  return PublicKey.findProgramAddress([
    Buffer.from("MODIFY_COUNTER_SEED"),
    modifierPubkey.toBuffer(),
    counterPubkey.toBuffer(),
  ], PROGRAM_ID);
}
