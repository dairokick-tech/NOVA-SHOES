import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import Dashboard from "./Dashboard";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { Calculator, Mail, LockKeyhole, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setMessage("No se pudo recuperar la sesión. Vuelve a iniciar sesión.");
        setSession(data.session);
      })
      .catch(() => {
        if (alive) setMessage("No se pudo conectar con el servicio de autenticación.");
      })
      .finally(() => { if (alive) setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage("");
    try {
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
      if (result.error) setMessage(result.error.message);
      else if (mode === "signup" && !result.data.session) setMessage("Revisa tu correo para confirmar la cuenta antes de ingresar.");
    } catch {
      setMessage("No se pudo conectar. Comprueba tu conexión e inténtalo nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="auth-loading">Cargando CONTANOVA…</div>;
  if (session) return <Dashboard onSignOut={async () => { await supabase?.auth.signOut(); setSession(null); }} />;
  return <div className="auth-page">
    <div className="auth-card">
      <div className="auth-brand"><div className="auth-logo"><Calculator size={25}/></div><div><b>CONTANOVA</b><small>GESTIÓN CONTABLE PROFESIONAL</small></div></div>
      <div className="auth-heading"><span>PLATAFORMA CONTABLE PARA PERÚ</span><h1>{mode === "login" ? "Bienvenido de nuevo" : "Crear cuenta"}</h1><p>{mode === "login" ? "Ingresa a tu espacio de trabajo contable." : "Registra tu acceso inicial a CONTANOVA."}</p></div>
      {!isSupabaseConfigured ? <div className="auth-alert"><ShieldCheck size={18}/><span>La autenticación aún no está conectada. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el entorno de despliegue.</span></div> : <form onSubmit={submit}>
        <label className="auth-label">Correo electrónico</label><div className="auth-input"><Mail size={17}/><input type="email" required autoComplete="email" placeholder="tu@empresa.com" value={email} onChange={e=>setEmail(e.target.value)}/></div>
        <label className="auth-label">Contraseña</label><div className="auth-input"><LockKeyhole size={17}/><input type={showPassword?"text":"password"} required minLength={8} autoComplete={mode==="login"?"current-password":"new-password"} placeholder="Mínimo 8 caracteres" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label="Mostrar contraseña">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
        {message && <div className="auth-message" role="alert">{message}</div>}
        <button className="auth-submit" disabled={busy}>{busy?"Procesando…":mode==="login"?"Ingresar al sistema":"Crear cuenta"}</button>
      </form>}
      <button className="auth-switch" onClick={()=>{setMode(mode==="login"?"signup":"login");setMessage("");}}>{mode==="login"?"¿Primera vez? Crear cuenta":"¿Ya tienes cuenta? Iniciar sesión"}</button>
      <div className="auth-foot"><ShieldCheck size={14}/> Acceso protegido · CONTANOVA</div>
    </div>
    <div className="auth-side"><div className="auth-side-content"><div className="side-kicker">CONTROL · ORDEN · CONFIANZA</div><h2>Tu gestión contable,<br/>en un solo lugar.</h2><p>Organiza empresas, registra operaciones y prepara tus reportes desde una plataforma centralizada.</p><div className="side-feature"><span>01</span> Contabilidad organizada por empresa</div><div className="side-feature"><span>02</span> Roles y permisos de acceso</div><div className="side-feature"><span>03</span> Información financiera centralizada</div></div></div>
  </div>;
}