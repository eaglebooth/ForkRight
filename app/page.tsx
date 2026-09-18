"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowRight, BookOpen, ExternalLink, GitBranch, Menu, Radio, ShieldCheck, TimerReset, UserRoundCheck, Wallet, X } from "lucide-react";
import { configured, connectWallet, contractAddress, currentWallet, disconnectWallet, explorerTx, readContract, watchWallet, writeContract } from "@/lib/genlayer";

type FormMode = "register" | "claim" | "assess" | "resolve";
type Notice = { kind: "idle" | "working" | "ok" | "error"; text: string; hash?: string };
type RecordKind = "claim" | "covenant";

const short = (value: string) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "";
const field = (data: FormData, key: string) => String(data.get(key) || "").trim();
const unwrap = (input: unknown): Record<string, unknown> => {
  let value = input;
  try {
    for (let i = 0; i < 3 && typeof value === "string"; i++) value = JSON.parse(value);
    if (value && typeof value === "object" && Object.keys(value).length === 1 && "result" in value) value = (value as { result: unknown }).result;
  } catch { return { raw: String(input) }; }
  return value && typeof value === "object" ? value as Record<string, unknown> : { raw: String(value ?? "") };
};

export default function Home() {
  const [wallet, setWallet] = useState("");
  const [menu, setMenu] = useState(false);
  const [mode, setMode] = useState<FormMode>("register");
  const [notice, setNotice] = useState<Notice>({ kind: "idle", text: configured() ? "Verify the configured contract is V2 before writing. V1 writes are blocked." : "V2 is not deployed yet — deploy the contract to enable writes." });
  const [lookupId, setLookupId] = useState("oss-kernel-001");
  const [recordKind, setRecordKind] = useState<RecordKind>("covenant");
  const [readback, setReadback] = useState<Record<string, unknown> | null>(null);
  const [syncedAt, setSyncedAt] = useState("");
  const [contractVersion, setContractVersion] = useState<number | null>(null);

  useEffect(() => { void currentWallet().then(setWallet); return watchWallet(setWallet); }, []);

  useEffect(() => {
    if (!configured()) return;
    void readContract("get_contract_version").then(result => {
      if (!result.success) return setContractVersion(0);
      const metadata = unwrap(result.data);
      setContractVersion(Number(metadata.version || 0));
    });
  }, []);

  async function connect() { const result = await connectWallet(); if (result.success) setWallet(String(result.data)); else setNotice({ kind: "error", text: result.error || "Connection failed." }); }
  async function disconnect() { await disconnectWallet(); setWallet(""); setNotice({ kind: "idle", text: "Wallet disconnected." }); }

  const synchronize = useCallback(async (id: string, kind: RecordKind, quiet = false) => {
    if (!id) return false;
    if (!quiet) setNotice({ kind: "working", text: "Reading finalized contract state…" });
    const result = await readContract(kind === "claim" ? "get_claim" : "get_covenant", id);
    if (!result.success) { if (!quiet) setNotice({ kind: "error", text: result.error || "Read failed." }); return false; }
    const value = unwrap(result.data);
    if (value.exists === false) { if (!quiet) setNotice({ kind: "error", text: `${kind} “${id}” does not exist on V2.` }); return false; }
    setLookupId(id); setRecordKind(kind); setReadback(value); setSyncedAt(new Date().toLocaleTimeString());
    if (!quiet) setNotice({ kind: "ok", text: `Finalized ${kind} state synchronized.` });
    return true;
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    let method = ""; let args: unknown[] = []; let syncId = ""; let syncKind: RecordKind = "claim";
    if (mode === "register") {
      method = "register_covenant";
      syncId = field(data, "covenant_id"); syncKind = "covenant";
      args = [field(data, "covenant_id"), field(data, "repository"), field(data, "steward"), field(data, "standard"), BigInt(field(data, "inactivity_days")), BigInt(field(data, "response_days")), BigInt(field(data, "challenge_seconds")), field(data, "manifest_url"), field(data, "manifest_sha256")];
    } else if (mode === "claim") {
      method = "open_claim";
      syncId = field(data, "claim_id");
      args = [field(data, "claim_id"), field(data, "covenant_id"), field(data, "activity_url"), field(data, "activity_sha256"), field(data, "security_url"), field(data, "security_sha256"), field(data, "response_url"), field(data, "response_sha256"), field(data, "statement")];
    } else if (mode === "assess") {
      method = "assess_claim"; syncId = field(data, "claim_id"); args = [syncId];
    } else {
      method = field(data, "resolution"); syncId = field(data, "claim_id"); args = [syncId];
      if (method === "restore_continuity") args.push(field(data, "restoration_url"), field(data, "restoration_sha256"));
    }
    setNotice({ kind: "working", text: "Awaiting wallet and validator finality…" });
    const result = await writeContract(method, args, status => setNotice({ kind: "working", text: `Transaction ${status.phase}${status.queuePosition === undefined ? "" : ` · queue ${status.queuePosition}`}${status.statusName ? ` · ${status.statusName}` : ""}`, hash: status.genlayerTxId }));
    if (!result.success) { setNotice({ kind: "error", text: result.error || "Transaction failed.", hash: result.hash }); return; }
    const synchronized = await synchronize(syncId, syncKind, true);
    setNotice({ kind: synchronized ? "ok" : "error", text: synchronized ? `${method} finalized · canonical state synchronized.` : `${method} finalized, but automatic readback failed. Use Synchronize state.`, hash: result.hash });
  }

  async function inspect() {
    await synchronize(lookupId, recordKind);
  }

  useEffect(() => {
    if (!configured() || !lookupId) return;
    const timer = window.setInterval(() => { void synchronize(lookupId, recordKind, true); }, 30_000);
    return () => window.clearInterval(timer);
  }, [lookupId, recordKind, synchronize]);

  return <main style={{ overflowX: "clip" }}>
    <header className="site-header">
      <div className="shell nav">
        <a className="brand" href="#top"><Image src="/forkright-logo.png" alt="ForkRight" width={44} height={44} priority/><span>ForkRight</span></a>
        <button className="menu" onClick={() => setMenu(!menu)} aria-label="Toggle navigation">{menu ? <X/> : <Menu/>}</button>
        <nav className={menu ? "open" : ""}><a href="#thesis">Thesis</a><a href="#protocol">Protocol</a><a href="#registry">Registry</a><a href="#console">Control room</a></nav>
        <div className="wallets">{wallet ? <><button onClick={connect}><Wallet size={15}/>{short(wallet)}</button><button className="icon-btn" onClick={disconnect} aria-label="Disconnect"><X size={16}/></button></> : <button onClick={connect}><Wallet size={15}/>Connect wallet</button>}</div>
      </div>
    </header>

    <section className="hero shell" id="top">
      <div className="hero-copy reveal">
        <p className="eyebrow"><span>01</span> Open-source continuity protocol</p>
        <h1>A project should outlive its <em>point of failure.</em></h1>
        <p className="lede">Maintainers write the succession rules while they are active. GenLayer evaluates abandonment evidence only when continuity is at risk.</p>
        <div className="hero-actions"><a className="primary" href="#console">Create a covenant <ArrowRight size={17}/></a><a className="secondary" href="#protocol">Read the protocol</a></div>
      </div>
      <div className="hero-mark reveal delay">
        <div className="orbit one"/><div className="orbit two"/>
        <Image src="/forkright-logo.png" alt="Protected community branching into successors" width={430} height={430} priority/>
        <div className="signal"><Radio size={14}/><span>STUDIO NEXT</span><strong>61997</strong></div>
      </div>
    </section>

    <section className="proofline"><div className="shell"><span>PRE-COMMITTED RULES</span><i/><span>PINNED EVIDENCE</span><i/><span>INDEPENDENT JUDGMENT</span><i/><span>CHALLENGE WINDOW</span></div></section>

    <section className="thesis shell" id="thesis">
      <div><p className="eyebrow"><span>02</span> The quiet failure</p><h2>Abandonment is not a timestamp.</h2></div>
      <div className="thesis-copy"><p>A dormant repository may be stable. A repository receiving cosmetic commits may still be operationally abandoned. ForkRight evaluates whether meaningful maintenance, unresolved risk and maintainer response satisfy a covenant written before the dispute.</p><p className="callout">The model classifies evidence. Deterministic contract rules control succession.</p></div>
    </section>

    <section className="protocol" id="protocol"><div className="shell">
      <div className="section-head"><p className="eyebrow"><span>03</span> State, not sentiment</p><h2>The continuity path</h2><p>Every exit is explicit. Uncertainty never transfers authority.</p></div>
      <div className="timeline">
        {[{n:"01",i:<BookOpen/>,t:"Covenant",d:"Maintainer fixes the standard, observation windows and steward."},{n:"02",i:<Activity/>,t:"Observation",d:"A reporter submits three commit-pinned evidence documents."},{n:"03",i:<ShieldCheck/>,t:"Judgment",d:"Validators independently refetch evidence and agree on a bounded verdict."},{n:"04",i:<TimerReset/>,t:"Challenge",d:"An abandonment verdict starts a restoration window—never instant takeover."},{n:"05",i:<UserRoundCheck/>,t:"Succession",d:"The nominated steward can finalize only after the window closes."}].map((s, index)=><article key={s.n} className={index===4?"active":""}><span>{s.n}</span><div className="step-icon">{s.i}</div><h3>{s.t}</h3><p>{s.d}</p></article>)}
      </div>
    </div></section>

    <section className="registry shell" id="registry">
      <div className="registry-card"><div className="registry-top"><span className="status-dot"/>LIVE COVENANT PREVIEW <span>DEMO STATE</span></div><div className="repo-row"><div><small>REPOSITORY</small><h3>openmesh / relay-core</h3></div><div className="state">HEALTHY</div></div><div className="metrics"><div><small>INACTIVITY RULE</small><strong>120 days</strong></div><div><small>RESPONSE WINDOW</small><strong>30 days</strong></div><div><small>CHALLENGE</small><strong>7 days</strong></div><div><small>REVISION</small><strong>01</strong></div></div></div>
      <aside><GitBranch/><p>ForkRight recognizes a canonical successor. It does not seize GitHub accounts, package namespaces or private keys.</p></aside>
    </section>

    <section className="control" id="console"><div className="shell">
      <div className="section-head inverse"><p className="eyebrow"><span>04</span> Contract control room</p><h2>Write continuity before crisis.</h2><p>All writes quote Studio Next fees and wait for final execution.</p></div>
      <div className="console-grid">
        <div className="operator">
          <div className="tabs">{(["register","claim","assess","resolve"] as FormMode[]).map((item,i)=><button key={item} className={mode===item?"selected":""} onClick={()=>setMode(item)}><span>0{i+1}</span>{item}</button>)}</div>
          <form onSubmit={submit}>
            {mode === "register" && <><div className="form-grid"><label>Covenant ID<input name="covenant_id" defaultValue="oss-kernel-001" required/></label><label>Repository<input name="repository" defaultValue="openmesh/relay-core" required/></label><label>Community steward<input name="steward" placeholder="0x… distinct address" required/></label><label>Inactivity days<input name="inactivity_days" type="number" defaultValue="120" min="30" required/></label><label>Response days<input name="response_days" type="number" defaultValue="30" min="7" required/></label><label>Challenge seconds<input name="challenge_seconds" type="number" defaultValue="604800" min="60" required/></label></div><label>Maintenance standard<textarea name="standard" defaultValue="Abandoned only when no meaningful release or security remediation exists for 120 days, a material unresolved security notice remains, and no substantive maintainer response exists within 30 days." required/></label><div className="evidence-row"><label>Repository manifest URL<input name="manifest_url" placeholder="https://raw.githubusercontent.com/org/repo/<40-char-commit>/.github/forkright/manifest.json" required/></label><label>Manifest SHA-256<input name="manifest_sha256" placeholder="64 lowercase hex characters" required/></label></div></>}
            {mode === "claim" && <><div className="form-grid"><label>Claim ID<input name="claim_id" defaultValue="claim-oss-001" required/></label><label>Covenant ID<input name="covenant_id" defaultValue="oss-kernel-001" required/></label></div>{["activity","security","response"].map(kind=><div className="evidence-row" key={kind}><label>{kind} URL<input name={`${kind}_url`} placeholder="https://raw.githubusercontent.com/org/repo/<40-char-commit>/evidence.json" required/></label><label>SHA-256<input name={`${kind}_sha256`} placeholder="64 lowercase hex characters" required/></label></div>)}<label>Reporter statement<textarea name="statement" placeholder="Explain which covenant conditions the pinned evidence demonstrates." required/></label></>}
            {mode === "assess" && <div className="single-action"><ShieldCheck/><div><h3>Invoke decentralized judgment</h3><p>Validators refetch all three pinned documents. Missing or contradictory evidence fails closed.</p></div><label>Claim ID<input name="claim_id" defaultValue="claim-oss-001" required/></label></div>}
            {mode === "resolve" && <><div className="form-grid"><label>Claim ID<input name="claim_id" defaultValue="claim-oss-001" required/></label><label>Resolution<select name="resolution"><option value="restore_continuity">Maintainer restores continuity</option><option value="finalize_succession">Steward finalizes succession</option><option value="expire_claim">Expire an unassessed claim after 7 days</option></select></label></div><div className="evidence-row"><label>Restoration URL<input name="restoration_url" placeholder="Required only for restoration"/></label><label>Restoration SHA-256<input name="restoration_sha256" placeholder="Required only for restoration"/></label></div></>}
            <button className="submit" disabled={notice.kind==="working"}>{notice.kind==="working"?"Awaiting finality…":`${mode} on Studio Next`}<ArrowRight size={17}/></button>
          </form>
        </div>
        <aside className="readback">
          <div className="read-head"><span>ON-CHAIN READBACK</span><span className={contractVersion===2?"online":"offline"}>{!configured()?"V2 NOT DEPLOYED":contractVersion===null?"VERIFYING CONTRACT…":contractVersion===2?"CONNECTED · V2":"WRONG CONTRACT VERSION"}</span></div>
          <label>Record type<select value={recordKind} onChange={e=>setRecordKind(e.target.value as RecordKind)}><option value="covenant">Covenant</option><option value="claim">Claim</option></select></label>
          <label>Lookup record ID<input value={lookupId} onChange={e=>setLookupId(e.target.value)}/></label><button onClick={inspect} disabled={!configured() || notice.kind==="working"}>Synchronize state</button>
          <p className="sync-note">Auto-refresh every 30s{syncedAt ? ` · last synchronized ${syncedAt}` : ""}</p>
          <div className={`notice ${notice.kind}`}><span/>{notice.text}{notice.hash&&<a href={explorerTx(notice.hash)} target="_blank" rel="noreferrer">Transaction <ExternalLink size={13}/></a>}</div>
          <div className="json">{readback ? Object.entries(readback).map(([key,value])=><div key={key}><span>{key.replaceAll("_"," ")}</span><strong>{String(value)}</strong></div>) : <div className="empty"><GitBranch/><p>No synchronized record yet.</p></div>}</div>
          <div className="contract-id"><small>CONTRACT</small><span>{configured()?short(contractAddress()):"awaiting deployment"}</span></div>
        </aside>
      </div>
    </div></section>

    <footer><div className="shell"><div className="brand"><Image src="/forkright-logo.png" alt="" width={42} height={42}/><span>ForkRight</span></div><p>Continuity before crisis.</p><div><span className="status-dot"/>STUDIO NEXT · 61997</div></div></footer>
  </main>;
}
