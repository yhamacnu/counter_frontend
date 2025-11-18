/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { getProgram, findCounterPda, findModifierPda } from "@/lib/anchorClient";
import { BN } from "@coral-xyz/anchor";

export default function CounterPage() {
  const [connected, setConnected] = useState(false);
  const [pubkey, setPubkey] = useState<PublicKey | null>(null);
  const [value, setValue] = useState(0);
  const [counterValue, setCounterValue] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const handler = async () => {
      const w = (window as any).solana;
      if (w && w.isPhantom) {
        if (w.isConnected) {
          setConnected(true);
          setPubkey(w.publicKey);
        }
        w.on("connect", (pk: any) => {
          setConnected(true);
          setPubkey(pk as PublicKey);
        });
        w.on("disconnect", () => {
          setConnected(false);
          setPubkey(null);
        });
      }
    };
    handler();
  }, []);

  async function connect() {
    try {
      const w = (window as any).solana;
      if (!w) throw new Error("Phantom not found");
      await w.connect();
      setConnected(true);
      setPubkey(w.publicKey as PublicKey);
    } catch (err: any) {
      setStatus(String(err.message || err));
    }
  }

  async function fetchCounter() {
    if (!pubkey) return setStatus("Connect wallet first");
    try {
      const { program } = await getProgram();
      const [counterPda] = await findCounterPda(pubkey);
  const account = (await program.account.counter.fetch(counterPda)) as { counter: BN };
  setCounterValue(account.counter.toNumber());
      setStatus("Fetched counter");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(msg);
      setCounterValue(null);
    }
  }

  async function initialize() {
    if (!pubkey) return setStatus("Connect wallet first");
    if (value < 0) return setStatus("Counter value must be non-negative");
    try {
      setStatus("Initializing...");
      const { program } = await getProgram();
      const [counterPda] = await findCounterPda(pubkey!);
      const systemProgramId = (program.provider as any).programs?.SystemProgram || (await import('@solana/web3.js')).SystemProgram.programId;
      const tx = await program.methods.initialize(new BN(value)).accounts({
        // pass both snake_case and camelCase to be compatible with different IDL transforms
        counter_authority: pubkey!,
        counterAuthority: pubkey!,
        counter: counterPda,
        system_program: systemProgramId,
        systemProgram: systemProgramId,
      }).rpc();
      setStatus("Initialized: " + tx);
    } catch (err: any) {
      setStatus(String(err.message || err));
    }
  }

  async function increment() {
    if (!pubkey) return setStatus("Connect wallet first");
    try {
      setStatus("Incrementing...");
      const { program } = await getProgram();
      const [counterPda] = await findCounterPda(pubkey!);
      const [modPda] = await findModifierPda(pubkey!, counterPda);
      const systemProgramId2 = (program.provider as any).programs?.SystemProgram || (await import('@solana/web3.js')).SystemProgram.programId;
      const tx = await program.methods.increment().accounts({
        modify_author: pubkey!,
        modifyAuthor: pubkey!,
        counter_modifier: modPda,
        counterModifier: modPda,
        counter: counterPda,
        system_program: systemProgramId2,
        systemProgram: systemProgramId2,
      }).rpc();
      setStatus("Incremented: " + tx);
    } catch (err: any) {
      setStatus(String(err.message || err));
    }
  }

  async function decrement() {
    if (!pubkey) return setStatus("Connect wallet first");
    try {
      setStatus("Decrementing...");
      const { program } = await getProgram();
      const [counterPda] = await findCounterPda(pubkey!);
      const [modPda] = await findModifierPda(pubkey!, counterPda);
      const systemProgramId3 = (program.provider as any).programs?.SystemProgram || (await import('@solana/web3.js')).SystemProgram.programId;
      const tx = await program.methods.decrement().accounts({
        modify_author: pubkey!,
        modifyAuthor: pubkey!,
        counter_modifier: modPda,
        counterModifier: modPda,
        counter: counterPda,
        system_program: systemProgramId3,
        systemProgram: systemProgramId3,
      }).rpc();
      setStatus("Decremented: " + tx);
    } catch (err: any) {
      setStatus(String(err.message || err));
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Counter dApp (rudimental)</h1>

      <div className="mb-4">
        {connected ? (
          <div>Connected: {pubkey?.toBase58()}</div>
        ) : (
          <button className="btn" onClick={connect}>Connect Phantom</button>
        )}
      </div>

      <div className="mb-4">
        <label>Initial value:</label>
        <input type="number" min="0" value={value} onChange={(e) => setValue(Math.max(0, parseInt(e.target.value || "0")))} className="ml-2 p-1 border" />
        <button className="ml-2 btn" onClick={initialize}>Initialize</button>
      </div>

      <div className="mb-4">
        <button className="btn mr-2" onClick={increment}>Increment</button>
        <button className="btn" onClick={decrement}>Decrement</button>
      </div>

      <div className="mb-4">
        <button className="btn" onClick={fetchCounter}>Fetch Counter</button>
        <div className="mt-2">Counter value: {counterValue ?? "-"}</div>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">{status}</div>
    </div>
  );
}
