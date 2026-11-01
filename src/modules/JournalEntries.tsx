import { useEffect, useState } from "react";\nimport type { FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { Plus, RefreshCw, BookOpen } from "lucide-react";

type Account={id:string;code:string;name:string};
type Entry={id:string;entry_date:string;description:string;status:string};
export default function JournalEntries({organizationId,onNotice}:{organizationId:string;onNotice:(s:string)=>void}){
 const [accounts,setAccounts]=useState<Account[]>([]);
 const [entries,setEntries]=useState<Entry[]>([]);
 const [date,setDate]=useState(new Date().toISOString().slice(0,10));
 const [description,setDescription]=useState("");
 const [debitAccount,setDebitAccount]=useState("");
 const [creditAccount,setCreditAccount]=useState("");
 const [amount,setAmount]=useState("");
 const [busy,setBusy]=useState(false);
 async function load(){
  if(!supabase||!organizationId)return;
  const [a,e]=await Promise.all([
   supabase.from("chart_accounts").select("id,code,name").eq("organization_id",organizationId).eq("is_active",true).order("code"),
   supabase.from("journal_entries").select("id,entry_date,description,status").eq("organization_id",organizationId).order("entry_date",{ascending:false}).limit(30)
  ]);
  if(a.error)onNotice(a.error.message);else{setAccounts(a.data??[]);if(!debitAccount&&a.data?.length)setDebitAccount(a.data[0].id);if(!creditAccount&&a.data?.length>1)setCreditAccount(a.data[1].id);}
  if(e.error)onNotice(e.error.message);else setEntries(e.data??[]);
 }
 useEffect(()=>{void load();},[organizationId]);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!supabase||!organizationId)return;
  const value=Number(amount);
  if(!Number.isFinite(value)||value<=0){onNotice("Ingresa un importe mayor que cero.");return;}
  if(debitAccount===creditAccount){onNotice("Selecciona cuentas distintas para el debe y el haber.");return;}
  setBusy(true);
  const {error}=await supabase.rpc("post_journal_entry",{p_organization_id:organizationId,p_entry_date:date,p_description:description,p_lines:[
   {account_id:debitAccount,debit:value,credit:0,description},
   {account_id:creditAccount,debit:0,credit:value,description}
  ]});
  if(error)onNotice(error.message);else{onNotice("Asiento registrado y validado en el servidor.");setDescription("");setAmount("");await load();}
  setBusy(false);
 }
 if(!organizationId)return <section className="panel"><div className="empty-state"><div className="empty-icon"><BookOpen/></div><b>Primero selecciona o registra una empresa</b><p>Los asientos siempre pertenecen a una empresa.</p></div></section>;
 return <div className="journal-layout">
  <section className="panel"><div className="panel-heading"><div><h2>Nuevo asiento contable</h2><p>Registro básico de dos líneas, con validación de partida doble en servidor.</p></div></div>
   <form className="journal-form" onSubmit={save}><label>Fecha del asiento</label><input type="date" required value={date} onChange={e=>setDate(e.target.value)}/><label>Glosa o descripción</label><input required minLength={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descripción de la operación"/><div className="journal-two"><div><label>Cuenta debe</label><select required value={debitAccount} onChange={e=>setDebitAccount(e.target.value)}>{accounts.map(a=><option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></div><div><label>Cuenta haber</label><select required value={creditAccount} onChange={e=>setCreditAccount(e.target.value)}>{accounts.map(a=><option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}</select></div></div><label>Importe (S/)</label><input type="number" min="0.01" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/><button className="primary-btn" disabled={busy||accounts.length<2}><Plus size={16}/>{busy?"Registrando…":"Registrar asiento"}</button>{accounts.length<2&&<small className="form-hint">La empresa necesita al menos dos cuentas activas.</small>}</form>
  </section>
  <section className="panel"><div className="panel-heading"><div><h2>Últimos asientos</h2><p>Máximo 30 registros recientes</p></div><button className="icon-btn" onClick={()=>void load()} aria-label="Actualizar"><RefreshCw size={16}/></button></div>
   {entries.length?<div className="entry-list">{entries.map(e=><div className="entry-row" key={e.id}><div><b>{e.description}</b><small>{e.entry_date}</small></div><span className={e.status==="posted"?"entry-status posted":"entry-status"}>{e.status==="posted"?"Contabilizado":e.status}</span></div>)}</div>:<div className="empty-state"><div className="empty-icon"><BookOpen/></div><b>Sin asientos todavía</b><p>Los asientos que registres aparecerán aquí.</p></div>}
  </section>
 </div>;
}
