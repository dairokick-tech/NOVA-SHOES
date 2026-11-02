import { useEffect, useState, type FormEvent } from 'react';
import { Activity, Boxes, ClipboardList, LogOut, Package, RefreshCw, ShieldCheck, ShoppingBag, Users } from 'lucide-react';

const API=(import.meta.env.VITE_API_URL||'').replace(/\/$/,'');
async function call(path:string,options:RequestInit={}) {
 const response=await fetch(API+'/api'+path,{...options,credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})}});
 const data=await response.json().catch(()=>({error:'Respuesta inválida del servidor'}));
 if(!response.ok)throw new Error(data.error||'No se pudo completar la solicitud');
 return data;
}
const pen=(v:number|string)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(v||0));
type User={id:string;full_name:string;email:string;role:string};
type Order={id:string;order_number:string;status:string;payment_status:string;payment_method:string;total:string;created_at:string;full_name:string;phone:string;department?:string;province?:string;district?:string;address_line?:string;payment_review_status?:string};
export default function AdminPanel(){
 const [mode,setMode]=useState<'checking'|'setup'|'login'|'app'|'error'>('checking');
 const [error,setError]=useState(''),[user,setUser]=useState<User|null>(null),[section,setSection]=useState('dashboard');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[fullName,setFullName]=useState(''),[bootstrapKey,setBootstrapKey]=useState('');
 const [dashboard,setDashboard]=useState<any>(null),[orders,setOrders]=useState<Order[]>([]),[products,setProducts]=useState<any[]>([]),[busy,setBusy]=useState(false);
 async function refresh(){
  setError('');
  try{
   const d=await call('/admin/dashboard');setDashboard(d);
   if(section==='orders')setOrders(await call('/admin/orders'));
   if(section==='products')setProducts(await call('/admin/products'));
  }catch(e:any){setError(e.message);}
 }
 useEffect(()=>{(async()=>{try{const status=await call('/admin/setup-status');if(status.setupRequired){setMode('setup');return;}try{const me=await call('/admin/me');setUser(me.user);setMode('app');}catch{setMode('login');}}catch(e:any){setError(e.message);setMode('error');}})();},[]);
 useEffect(()=>{if(mode==='app')refresh();},[mode,section]);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{
  if(mode==='setup'){const r=await call('/admin/bootstrap',{method:'POST',body:JSON.stringify({bootstrapKey,fullName,email,password})});setUser(r.user);}
  else{const r=await call('/admin/login',{method:'POST',body:JSON.stringify({email,password})});setUser(r.user);}
  setPassword('');setBootstrapKey('');setMode('app');
 }catch(e:any){setError(e.message);}finally{setBusy(false);}}
 async function review(order:Order,status:'verified'|'rejected'){
  if(!confirm(status==='verified'?'¿Confirmar que el pago fue recibido y verificado?':'¿Rechazar el pago y liberar el stock reservado?'))return;
  try{await call('/admin/orders/'+order.id+'/payment',{method:'PATCH',body:JSON.stringify({status})});await refresh();}catch(e:any){setError(e.message);}
 }
 async function logout(){try{await call('/admin/logout',{method:'POST'});}finally{setUser(null);setMode('login');setSection('dashboard');}}
 if(mode==='checking')return <div className="ns-admin-loading">Verificando acceso privado…</div>;
 if(mode==='error')return <div className="ns-admin-auth"><div className="ns-admin-auth-card"><b className="ns-brand">NOVA <i>SHOES</i></b><h1>Panel privado</h1><p>{error}</p><small>El servidor de administración aún no está disponible. Comprueba la API y su configuración.</small></div></div>;
 if(mode==='login'||mode==='setup')return <div className="ns-admin-auth"><form className="ns-admin-auth-card" onSubmit={submit}>
  <b className="ns-brand">NOVA <i>SHOES</i></b><span className="ns-admin-eyebrow">ÁREA RESTRINGIDA</span>
  <h1>{mode==='setup'?'Configurar propietario':'Bienvenido de nuevo'}</h1><p>{mode==='setup'?'Crea la cuenta principal. Esta configuración solo se permite una vez.':'Ingresa con tus credenciales para administrar la tienda.'}</p>
  {mode==='setup'&&<><label>Nombre completo<input required value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name"/></label><label>Clave inicial del servidor<input required type="password" value={bootstrapKey} onChange={e=>setBootstrapKey(e.target.value)} autoComplete="off"/></label></>}
  <label>Correo administrador<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/></label>
  <label>Contraseña<input required minLength={mode==='setup'?12:1} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='setup'?'new-password':'current-password'}/></label>
  {error&&<div className="ns-admin-error">{error}</div>}
  <button disabled={busy}>{busy?'Procesando…':mode==='setup'?'Crear propietario':'Ingresar al panel'}</button>
  <small>Acceso privado · NOVA SHOES · La contraseña se almacena cifrada mediante hash seguro.</small>
 </form></div>;
 const nav=[['dashboard','Panel general',Activity],['orders','Pedidos y pagos',ClipboardList],['products','Productos e inventario',Boxes]];
 return <div className="ns-admin">
  <aside className="ns-admin-side"><a className="ns-brand" href={import.meta.env.BASE_URL}>NOVA <i>SHOES</i></a><small>ADMINISTRACIÓN PRIVADA</small><nav>{nav.map(([id,label,Icon]:any)=><button key={id} className={section===id?'active':''} onClick={()=>setSection(id)}><Icon size={17}/>{label}</button>)}</nav><button className="ns-admin-logout" onClick={logout}><LogOut size={17}/> Cerrar sesión</button></aside>
  <main className="ns-admin-main"><header><div><span>ADMINISTRACIÓN / NOVA SHOES</span><h1>{nav.find(x=>x[0]===section)?.[1]}</h1></div><div className="ns-admin-user"><ShieldCheck size={18}/><span>{user?.full_name}<small>{user?.role==='owner'?'Propietario':'Administrador'}</small></span><button onClick={()=>refresh()} aria-label="Actualizar"><RefreshCw size={17}/></button></div></header>
   {error&&<div className="ns-admin-error">{error}</div>}
   {section==='dashboard'&&dashboard&&<><div className="ns-admin-stats"><article><span>Ventas verificadas este mes</span><b>{pen(dashboard.sales.total)}</b></article><article><span>Pedidos registrados</span><b>{dashboard.orders.total}</b><small>{dashboard.orders.pending} pendientes</small></article><article><span>Productos</span><b>{dashboard.products.total}</b><small>{dashboard.products.published} publicados</small></article><article><span>Clientes</span><b>{dashboard.customers.total}</b></article></div><section className="ns-admin-card"><h2>Pedidos recientes</h2><OrderTable rows={dashboard.recent||[]} /></section></>}
   {section==='orders'&&<section className="ns-admin-card"><h2>Gestión de pedidos</h2><p>Verifica los pagos antes de confirmar una venta. El sistema descuenta el stock al aprobar el pago.</p><OrderTable rows={orders} onReview={review}/></section>}
   {section==='products'&&<section className="ns-admin-card"><h2>Catálogo e inventario</h2><p>Consulta productos registrados, publicación, variantes y existencias.</p><div className="ns-admin-table-wrap"><table><thead><tr><th>Producto</th><th>Tipo</th><th>Audiencia</th><th>Variantes / stock</th><th>Estado</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td><b>{p.name}</b><small>{p.sku||'Sin SKU'}</small></td><td>{p.product_type}</td><td>{p.audience}</td><td>{(p.variants||[]).map((v:any)=><small key={v.id}>{v.size||'Única'} · {v.color||'—'} · {v.stock} und.</small>)}</td><td>{p.is_published?'Publicado':'Borrador'}</td></tr>)}</tbody></table></div></section>}
  </main>
 </div>;
}
function OrderTable({rows,onReview}:{rows:any[];onReview?:(order:Order,status:'verified'|'rejected')=>void}){
 if(!rows.length)return <div className="ns-admin-empty"><ShoppingBag size={28}/><b>Aún no hay pedidos</b><span>Cuando un cliente compre, aparecerá aquí.</span></div>;
 return <div className="ns-admin-table-wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado / pago</th>{onReview&&<th>Acciones</th>}</tr></thead><tbody>{rows.map((o:any)=><tr key={o.id}><td><b>{o.order_number}</b><small>{o.payment_method?.toUpperCase()}</small></td><td>{o.full_name}<small>{o.phone}</small>{o.department&&<small>{o.address_line}, {o.district}, {o.province}, {o.department}</small>}</td><td>{new Date(o.created_at).toLocaleDateString('es-PE')}</td><td><b>{pen(o.total)}</b></td><td><span className="ns-admin-status">{o.status}</span><small>Pago: {o.payment_review_status||o.payment_status}</small>{o.proof_url&&<a href={o.proof_url} target="_blank" rel="noreferrer">Ver comprobante</a>}</td>{onReview&&<td>{!['verified','rejected'].includes(o.payment_review_status||o.payment_status)?<div className="ns-admin-actions"><button onClick={()=>onReview(o,'verified')}>Verificar</button><button className="danger" onClick={()=>onReview(o,'rejected')}>Rechazar</button></div>:<small>Revisado</small>}</td>}</tr>)}</tbody></table></div>;
}
