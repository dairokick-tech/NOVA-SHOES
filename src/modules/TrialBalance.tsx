import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Calculator } from "lucide-react";
type Balance={account_id:string;account_code:string;account_name:string;total_debit:number;total_credit:number;net_balance:number};
export default function TrialBalance({organizationId,onNotice}:{organizationId:string;onNotice:(s:string)=>void}){
 const [rows,setRows]=useState<Balance[]>([]);
 useEffect(()=>{async function load(){if(!supabase||!organizationId)return;const {data,error}=await supabase.from("v_trial_balance").select("account_id,account_code,account_name,total_debit,total_credit,net_balance").eq("organization_id",organizationId).order("account_code");if(error)onNotice(error.message);else setRows(data??[]);}void load();},[organizationId]);
 if(!organizationId)return <section className="panel"><div className="empty-state"><div className="empty-icon"><Calculator/></div><b>Selecciona una empresa</b><p>El balance se consulta por empresa.</p></div></section>;
 const debit=rows.reduce((s,r)=>s+Number(r.total_debit),0);const credit=rows.reduce((s,r)=>s+Number(r.total_credit),0);
 const money=(n:number)=>new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN"}).format(n);
 return <section className="panel"><div className="panel-heading"><div><h2>Balance de comprobación</h2><p>Movimientos contabilizados de las cuentas activas.</p></div></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Cuenta</th><th>Nombre</th><th className="number">Debe</th><th className="number">Haber</th><th className="number">Saldo neto</th></tr></thead><tbody>{rows.map(r=><tr key={r.account_id}><td>{r.account_code}</td><td>{r.account_name}</td><td className="number">{money(Number(r.total_debit))}</td><td className="number">{money(Number(r.total_credit))}</td><td className="number">{money(Number(r.net_balance))}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Totales</th><th className="number">{money(debit)}</th><th className="number">{money(credit)}</th><th className="number">{money(debit-credit)}</th></tr></tfoot></table>{!rows.length&&<div className="table-empty">No hay movimientos contabilizados.</div>}</div><p className="form-hint">Diferencia Debe - Haber: {money(debit-credit)}. Requiere revisión y conciliación antes de emitir informes oficiales.</p></section>;
}
