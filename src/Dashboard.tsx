import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Activity, BookOpen, Building2, Calculator, CalendarDays, ChevronDown, ClipboardList, FileBarChart, FileCheck2, Files, Home, Landmark, Menu, Search, Settings, ShieldCheck, Users, Wallet, Bell, Plus, ArrowUpRight, CircleDollarSign, ReceiptText, LogOut, X } from "lucide-react";
import { supabase } from "./lib/supabase";
import JournalEntries from "./modules/JournalEntries";
import ChartOfAccounts from "./modules/ChartOfAccounts";
import TrialBalance from "./modules/TrialBalance";

const navGroups = [
 {title:"GENERAL",items:[{label:"Panel principal",icon:Home},{label:"Empresas y clientes",icon:Building2},{label:"Usuarios y permisos",icon:Users}]},
 {title:"CONTABILIDAD",items:[{label:"Plan contable PCGE",icon:BookOpen},{label:"Asientos contables",icon:ClipboardList},{label:"Libro diario y mayor",icon:Files},{label:"Balance de comprobación",icon:Calculator}]},
 {title:"GESTIÓN TRIBUTARIA",items:[{label:"Compras y ventas",icon:ReceiptText},{label:"IGV y obligaciones",icon:FileCheck2},{label:"SIRE / PLE",icon:Landmark},{label:"Calendario tributario",icon:CalendarDays}]},
 {title:"FINANZAS Y REPORTES",items:[{label:"Caja y bancos",icon:Wallet},{label:"Estados financieros",icon:FileBarChart},{label:"Indicadores",icon:Activity}]}
];
type Organization={id:string;legal_name:string;trade_name:string|null;tax_id:string|null};
export default function Dashboard({onSignOut}:{onSignOut:()=>void}) {
 const [active,setActive]=useState("Panel principal");
 const [sidebarOpen,setSidebarOpen]=useState(false);
 const [search,setSearch]=useState("");
 const [period,setPeriod]=useState("Noviembre 2026");
 const [companies,setCompanies]=useState<Organization[]>([]);
 const [companyId,setCompanyId]=useState("");
 const [showCreate,setShowCreate]=useState(false);
 const [legalName,setLegalName]=useState("");
 const [tradeName,setTradeName]=useState("");
 const [taxId,setTaxId]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [platformRole,setPlatformRole]=useState("user");
 async function loadCompanies(role = platformRole){
  if(!supabase)return;
  if(role==="superadmin"){
   const {data,error}=await supabase.from("organizations").select("id,legal_name,trade_name,tax_id").order("created_at",{ascending:false});
   if(error){setNotice(error.message);return;}
   const rows=(data??[]) as Organization[];
   setCompanies(rows);setCompanyId(current=>current||rows[0]?.id||"");
   return;
  }
  const {data,error}=await supabase.from("organization_members").select("organization_id, organizations(id,legal_name,trade_name,tax_id)");
  if(error){setNotice(error.message);return;}
  const rows=(data??[]).map((x:any)=>x.organizations).filter(Boolean) as Organization[];
  setCompanies(rows);setCompanyId(current=>current||rows[0]?.id||"");
 }
 useEffect(()=>{
  if(!supabase)return;
  let alive=true;
  async function initialize(){
   const {data,error}=await supabase!.from("profiles").select("platform_role").single();
   if(!alive)return;
   const role=data?.platform_role??"user";
   setPlatformRole(role);
   if(error)setNotice(error.message);
   await loadCompanies(role);
  }
  void initialize();
  return ()=>{alive=false;};
 },[]);
 async function createCompany(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!supabase)return;setBusy(true);setNotice("");
  const {data,error}=await supabase.rpc("create_organization",{p_legal_name:legalName,p_tax_id:taxId||null,p_trade_name:tradeName||null});
  if(error)setNotice(error.message);else{setShowCreate(false);setLegalName("");setTradeName("");setTaxId("");await loadCompanies(platformRole);if(data)setCompanyId(data);}
  setBusy(false);
 }
 const selected=companies.find(c=>c.id===companyId);
 const visibleNavGroups=platformRole==="superadmin"?[...navGroups,{title:"PLATAFORMA",items:[{label:"Administración global",icon:ShieldCheck}]}]:navGroups;
 const filtered=visibleNavGroups.map(g=>({...g,items:g.items.filter(i=>i.label.toLowerCase().includes(search.toLowerCase()))})).filter(g=>g.items.length);
 return <div className="app-shell">
  <aside className={sidebarOpen?"sidebar open":"sidebar"}>
   <div className="brand"><div className="brand-mark"><Calculator size={22}/></div><div><strong>CONTANOVA</strong><small>GESTIÓN CONTABLE</small></div></div>
   <div className="workspace"><div className="workspace-icon"><Building2 size={18}/></div><div><b>{selected?.trade_name||selected?.legal_name||"Mi estudio contable"}</b><small>{selected?.tax_id||"Selecciona una empresa"}</small></div><ChevronDown size={16}/></div>
   <nav>{filtered.map(group=><section className="nav-group" key={group.title}><p>{group.title}</p>{group.items.map(item=>{const Icon=item.icon;return <button key={item.label} className={active===item.label?"nav-item selected":"nav-item"} onClick={()=>{setActive(item.label);setSidebarOpen(false);}}><Icon size={17}/><span>{item.label}</span></button>})}</section>)}</nav>
   <div className="sidebar-bottom"><button className="nav-item" onClick={()=>setActive("Configuración")}><Settings size={17}/>Configuración</button><div className="profile"><div className="avatar">CN</div><div><b>Cuenta activa</b><small>{platformRole==="superadmin"?"SUPERADMINISTRADOR":"Usuario autenticado"}</small></div><button className="icon-btn" aria-label="Cerrar sesión" onClick={onSignOut}><LogOut size={16}/></button></div></div>
  </aside>
  {sidebarOpen&&<button aria-label="Cerrar menú" className="scrim" onClick={()=>setSidebarOpen(false)}/>}
  <main className="main">
   <header className="topbar"><button className="icon-btn mobile-menu" onClick={()=>setSidebarOpen(!sidebarOpen)}><Menu/></button><div className="breadcrumbs">CONTANOVA <span>/</span> {active}</div><div className="top-actions"><label className="search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar módulos"/></label><button className="icon-btn" aria-label="Notificaciones"><Bell size={18}/></button><div className="top-avatar">CN</div></div></header>
   <div className="content">
    <div className="welcome-row"><div><div className="eyebrow">GESTIÓN CONTABLE PARA PERÚ</div><h1>{active}</h1><p>Gestiona la información contable, financiera y tributaria desde un solo lugar.</p></div><button className="primary-btn" onClick={()=>active==="Asientos contables"?setActive("Asientos contables"):setShowCreate(true)}><Plus size={17}/>{active==="Asientos contables"?"Nuevo asiento":"Nueva empresa"}</button></div>
    {notice&&<div className="notice"><ShieldCheck size={18}/><span>{notice}</span><button className="notice-close" onClick={()=>setNotice("")}><X size={15}/></button></div>}
    {active==="Administración global"&&platformRole==="superadmin"?<section className="panel"><div className="panel-heading"><div><h2>Administración de plataforma</h2><p>Vista global de empresas registradas en CONTANOVA.</p></div><button className="primary-btn" onClick={()=>setShowCreate(true)}><Plus size={16}/> Nueva empresa</button></div><div className="stats-grid"><article className="stat-card"><div className="stat-top"><span>Total de empresas</span><Building2/></div><strong>{companies.length}</strong><small>Empresas visibles para el superadministrador</small></article><article className="stat-card"><div className="stat-top"><span>Acceso de plataforma</span><ShieldCheck/></div><strong>Activo</strong><small>Rol de superadministrador detectado</small></article></div><div className="company-list">{companies.map(c=><button className="company-row" key={c.id} onClick={()=>{setCompanyId(c.id);setActive("Panel principal");}}><span className="quick-icon"><Building2 size={19}/></span><span><b>{c.trade_name||c.legal_name}</b><small>{c.legal_name} · RUC: {c.tax_id||"No registrado"}</small></span><ArrowUpRight size={16}/></button>)}</div></section>:null}
    {active==="Empresas y clientes"?<section className="panel"><div className="panel-heading"><div><h2>Empresas registradas</h2><p>Empresas a las que tu usuario tiene acceso.</p></div><button className="primary-btn" onClick={()=>setShowCreate(true)}><Plus size={16}/> Nueva empresa</button></div><div className="company-list">{companies.length?companies.map(c=><button className={companyId===c.id?"company-row chosen":"company-row"} key={c.id} onClick={()=>setCompanyId(c.id)}><span className="quick-icon"><Building2 size={19}/></span><span><b>{c.trade_name||c.legal_name}</b><small>{c.legal_name} · RUC: {c.tax_id||"No registrado"}</small></span><ArrowUpRight size={16}/></button>):<div className="empty-state"><div className="empty-icon"><Building2 size={25}/></div><b>No tienes empresas registradas</b><p>Crea una empresa para comenzar a organizar su contabilidad.</p></div>}</div></section>
    :active==="Asientos contables"?<JournalEntries organizationId={companyId} onNotice={setNotice}/>
    :active==="Plan contable PCGE"?<ChartOfAccounts organizationId={companyId} onNotice={setNotice}/>
    :active==="Balance de comprobación"?<TrialBalance organizationId={companyId} onNotice={setNotice}/>
    :active==="Panel principal"?<>
      <div className="toolbar"><div className="status"><span className="live-dot"/> Conexión de sesión activa <span className="muted">·</span> {companies.length} empresa(s)</div><select value={period} onChange={e=>setPeriod(e.target.value)}><option>Noviembre 2026</option><option>Octubre 2026</option><option>Setiembre 2026</option></select></div>
      <div className="stats-grid"><article className="stat-card"><div className="stat-top"><span>Empresas registradas</span><Building2/></div><strong>{companies.length}</strong><small>Empresas vinculadas a tu usuario</small></article><article className="stat-card"><div className="stat-top"><span>Asientos del periodo</span><ClipboardList/></div><strong>—</strong><small>Consulta el libro diario</small></article><article className="stat-card"><div className="stat-top"><span>Obligaciones próximas</span><CalendarDays/></div><strong>—</strong><small>Configura el régimen tributario</small></article><article className="stat-card"><div className="stat-top"><span>Estado de cuenta</span><ShieldCheck/></div><strong>Activo</strong><small>Autenticación conectada</small></article></div>
      <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><h2>Accesos principales</h2><p>Ingresa a las áreas de trabajo de CONTANOVA</p></div></div><div className="quick-grid">{[["Contabilidad general","Asientos, diario, mayor y PCGE",BookOpen],["Tributación Perú","IGV, SIRE, PLE y obligaciones",Landmark],["Compras y ventas","Comprobantes y registros",ReceiptText],["Estados financieros","Reportes y análisis financiero",FileBarChart],["Tesorería","Caja, bancos y conciliación",CircleDollarSign],["Empresas y clientes","Cartera y datos tributarios",Building2]].map(([title,desc,Icon])=>{const I=Icon as typeof Home;return <button className="quick-card" key={title as string} onClick={()=>setActive(({ "Contabilidad general":"Asientos contables", "Tributación Perú":"IGV y obligaciones", "Compras y ventas":"Compras y ventas", "Estados financieros":"Balance de comprobación", "Tesorería":"Caja y bancos", "Empresas y clientes":"Empresas y clientes" } as Record<string,string>)[title as string] || (title as string))}><span className="quick-icon"><I size={19}/></span><span><b>{title as string}</b><small>{desc as string}</small></span><ArrowUpRight className="quick-arrow" size={16}/></button>})}</div></section><section className="panel activity-panel"><div className="panel-heading"><div><h2>Actividad reciente</h2><p>Últimos movimientos</p></div></div><div className="empty-state"><div className="empty-icon"><ShieldCheck size={24}/></div><b>Panel conectado</b><p>Los movimientos aparecerán conforme registres operaciones.</p></div></section></div>
    </>:<section className="panel module-view"><div className="module-title"><div className="module-symbol"><BookOpen size={24}/></div><div><h2>{active}</h2><p>Módulo de CONTANOVA</p></div></div><div className="module-placeholder"><div className="empty-icon"><Settings size={25}/></div><h3>Módulo en desarrollo</h3><p>La estructura de navegación está preparada. Este módulo requiere su lógica de negocio, validaciones, reportes y permisos antes de usarlo con datos reales.</p><div className="module-tags"><span>Multiempresa</span><span>Auditoría</span><span>Roles y permisos</span></div></div></section>}
    <footer>© 2026 CONTANOVA · Plataforma contable para Perú · Versión 0.2.0</footer>
   </div>
  </main>
  {showCreate&&<div className="modal-backdrop"><form className="modal-card" onSubmit={createCompany}><div className="modal-head"><div><h2>Registrar empresa</h2><p>Se creará su espacio contable independiente dentro de CONTANOVA.</p></div><button type="button" className="icon-btn" onClick={()=>setShowCreate(false)}><X size={18}/></button></div><label>Razón social *</label><input required minLength={3} value={legalName} onChange={e=>setLegalName(e.target.value)} placeholder="Nombre legal de la empresa"/><label>Nombre comercial</label><input value={tradeName} onChange={e=>setTradeName(e.target.value)} placeholder="Nombre comercial (opcional)"/><label>RUC</label><input inputMode="numeric" pattern="[0-9]{11}" maxLength={11} value={taxId} onChange={e=>setTaxId(e.target.value)} placeholder="11 dígitos"/><div className="modal-actions"><button type="button" className="outline-button" onClick={()=>setShowCreate(false)}>Cancelar</button><button className="primary-btn" disabled={busy}>{busy?"Guardando…":"Crear empresa"}</button></div></form></div>}
 </div>;
}
