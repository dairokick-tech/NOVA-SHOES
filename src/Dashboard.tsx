import { useState } from "react";
import {
  Activity, BookOpen, Building2, Calculator, CalendarDays, ChevronDown,
  ClipboardList, FileBarChart, FileCheck2, Files, Home, Landmark, Menu,
  Search, Settings, ShieldCheck, Users, Wallet, Bell, Plus, ArrowUpRight,
  TrendingUp, CircleDollarSign, ReceiptText
} from "lucide-react";

const navGroups = [
  { title: "GENERAL", items: [{ label: "Panel principal", icon: Home }, { label: "Empresas y clientes", icon: Building2 }, { label: "Usuarios y permisos", icon: Users }] },
  { title: "CONTABILIDAD", items: [{ label: "Plan contable PCGE", icon: BookOpen }, { label: "Asientos contables", icon: ClipboardList }, { label: "Libro diario y mayor", icon: Files }, { label: "Balance de comprobación", icon: Calculator }] },
  { title: "GESTIÓN TRIBUTARIA", items: [{ label: "Compras y ventas", icon: ReceiptText }, { label: "IGV y obligaciones", icon: FileCheck2 }, { label: "SIRE / PLE", icon: Landmark }, { label: "Calendario tributario", icon: CalendarDays }] },
  { title: "FINANZAS Y REPORTES", items: [{ label: "Caja y bancos", icon: Wallet }, { label: "Estados financieros", icon: FileBarChart }, { label: "Indicadores", icon: Activity }] }
];

function App() {
  const [active, setActive] = useState("Panel principal");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("Noviembre 2026");
  return <div className="app-shell">
    <aside className={sidebarOpen ? "sidebar open" : "sidebar"}>
      <div className="brand"><div className="brand-mark"><Calculator size={22}/></div><div><strong>CONTANOVA</strong><small>GESTIÓN CONTABLE</small></div></div>
      <div className="workspace"><div className="workspace-icon"><Building2 size={18}/></div><div><b>Estudio contable</b><small>Espacio de trabajo</small></div><ChevronDown size={16}/></div>
      <nav>{navGroups.map(group => <section className="nav-group" key={group.title}><p>{group.title}</p>{group.items.map(item => { const Icon = item.icon; return <button key={item.label} className={active === item.label ? "nav-item selected" : "nav-item"} onClick={() => {setActive(item.label);setSidebarOpen(false);}}><Icon size={17}/><span>{item.label}</span></button>; })}</section>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item" onClick={() => setActive("Configuración")}><Settings size={17}/>Configuración</button><div className="profile"><div className="avatar">AC</div><div><b>Administrador</b><small>Superadministrador</small></div><ChevronDown size={15}/></div></div>
    </aside>
    {sidebarOpen && <button aria-label="Cerrar menú" className="scrim" onClick={() => setSidebarOpen(false)}/>}
    <main className="main">
      <header className="topbar"><button className="icon-btn mobile-menu" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu/></button><div className="breadcrumbs">CONTANOVA <span>/</span> {active}</div><div className="top-actions"><label className="search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar en CONTANOVA"/></label><button className="icon-btn" aria-label="Notificaciones"><Bell size={18}/><i/></button><div className="top-avatar">AC</div></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow">SÁBADO, 1 DE NOVIEMBRE DE 2026</div><h1>{active}</h1><p>Controla la gestión contable, financiera y tributaria desde un solo lugar.</p></div><button className="primary-btn" onClick={() => setActive("Empresas y clientes")}><Plus size={17}/> Nueva empresa</button></div>
        <div className="toolbar"><div className="status"><span className="live-dot"/> Sistema preparado <span className="muted">·</span> Entorno de demostración</div><select value={period} onChange={e=>setPeriod(e.target.value)}><option>Noviembre 2026</option><option>Octubre 2026</option><option>Setiembre 2026</option></select></div>
        <div className="stats-grid">
          <article className="stat-card"><div className="stat-top"><span>Empresas registradas</span><Building2/></div><strong>0</strong><small>Sin empresas registradas aún</small></article>
          <article className="stat-card"><div className="stat-top"><span>Asientos del periodo</span><ClipboardList/></div><strong>0</strong><small>Movimientos contables</small></article>
          <article className="stat-card"><div className="stat-top"><span>Obligaciones próximas</span><CalendarDays/></div><strong>0</strong><small>Vencimientos por gestionar</small></article>
          <article className="stat-card"><div className="stat-top"><span>Indicadores del sistema</span><TrendingUp/></div><strong>100%</strong><small>Interfaz inicial disponible</small></article>
        </div>
        <div className="dashboard-grid">
          <section className="panel"><div className="panel-heading"><div><h2>Accesos principales</h2><p>Ingresa a las áreas de trabajo de CONTANOVA</p></div><button className="text-btn" onClick={()=>setActive("Configuración")}>Ver módulos <ArrowUpRight size={15}/></button></div><div className="quick-grid">
            {[["Contabilidad general","Asientos, diario, mayor y PCGE",BookOpen],["Tributación Perú","IGV, SIRE, PLE y obligaciones",Landmark],["Compras y ventas","Comprobantes y registros",ReceiptText],["Estados financieros","Reportes y análisis financiero",FileBarChart],["Tesorería","Caja, bancos y conciliación",CircleDollarSign],["Empresas y clientes","Cartera y datos tributarios",Building2]].map(([title,desc,Icon])=>{const I=Icon as typeof Home;return <button className="quick-card" key={title as string} onClick={()=>setActive(title as string)}><span className="quick-icon"><I size={19}/></span><span><b>{title as string}</b><small>{desc as string}</small></span><ArrowUpRight className="quick-arrow" size={16}/></button>})}
          </div></section>
          <section className="panel activity-panel"><div className="panel-heading"><div><h2>Actividad reciente</h2><p>Últimos movimientos del sistema</p></div></div><div className="empty-state"><div className="empty-icon"><ShieldCheck size={24}/></div><b>Todo está listo para comenzar</b><p>Cuando registres empresas y operaciones, aquí aparecerá la actividad reciente.</p></div></section>
        </div>
        <div className="notice"><ShieldCheck size={18}/><span><b>Importante:</b> esta es la base visual inicial. La conexión a base de datos, autenticación real, cálculos tributarios y envío de información a SUNAT se implementarán y validarán en las siguientes etapas.</span></div>
        <footer>© 2026 CONTANOVA · Plataforma contable para Perú <span>Versión inicial 0.1.0</span></footer>
      </div>
    </main>
  </div>;
}
export default App;