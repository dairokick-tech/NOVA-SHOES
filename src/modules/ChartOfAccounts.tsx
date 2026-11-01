import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Search, BookOpen } from "lucide-react";
type Account={id:string;code:string;name:string;account_type:string;is_active:boolean};
export default function ChartOfAccounts({organizationId,onNotice}:{organizationId:string;onNotice:(s:string)=>void}){
 const [items,setItems]=useState<Account[]>([]);const [term,setTerm]=useState("");
 useEffect(()=>{async function load(){if(!supabase||!organizationId)return;const {data,error}=await supabase.from("chart_accounts").select("id,code,name,account_type,is_active").eq("organization_id",organizationId).order("code");if(error)onNotice(error.message);else setItems(data??[]);}void load();},[organizationId]);
 const visible=items.filter(a=>(a.code+" "+a.name).toLowerCase().includes(term.toLowerCase()));
 if(!organizationId)return <section className="panel"><div className="empty-state"><div className="empty-icon"><BookOpen/></div><b>Selecciona una empresa</b><p>El plan de cuentas se administra por empresa.</p></div></section>;
 return <section className="panel"><div className="panel-heading"><div><h2>Plan de cuentas inicial</h2><p>{items.length} cuentas · catálogo semilla reducido</p></div><label className="table-search"><Search size={15}/><input value={term} onChange={e=>setTerm(e.target.value)} placeholder="Buscar cuenta"/></label></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Código</th><th>Nombre de cuenta</th><th>Tipo</th><th>Estado</th></tr></thead><tbody>{visible.map(a=><tr key={a.id}><td>{a.code}</td><td>{a.name}</td><td>{a.account_type}</td><td><span className="entry-status posted">Activa</span></td></tr>)}</tbody></table>{!visible.length&&<div className="table-empty">No se encontraron cuentas.</div>}</div><p className="form-hint">Este listado es una semilla de desarrollo y no sustituye el PCGE completo vigente.</p></section>;
}
