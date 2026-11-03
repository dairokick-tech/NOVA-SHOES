import { ArrowRight, Check, ChevronDown, Headphones, LockKeyhole, Package, ShoppingBag, Store, Zap } from 'lucide-react';
import { useState } from 'react';
import './PlansPage.css';

const wa = 'https://wa.me/51914096138?text=';

const plans = [
  {
    name: 'INICIO', label: 'Para comenzar', description: 'Lo esencial para ordenar tus ventas y dar tus primeros pasos online.',
    featured: false, features: ['Tienda online con catálogo', 'Gestión de productos y precios', 'Registro de pedidos', 'Panel de administración', 'Soporte por WhatsApp']
  },
  {
    name: 'CRECIMIENTO', label: 'Más elegido', description: 'Más herramientas para negocios que quieren vender y administrar mejor.',
    featured: true, features: ['Todo lo incluido en Inicio', 'Control de inventario y stock', 'Gestión de clientes', 'Seguimiento de pedidos', 'Reportes de ventas', 'Configuración de medios de pago', 'Soporte prioritario']
  },
  {
    name: 'PRO', label: 'Control avanzado', description: 'Una solución completa para operaciones con mayor movimiento.',
    featured: false, features: ['Todo lo incluido en Crecimiento', 'Múltiples usuarios y permisos', 'Gestión avanzada de productos', 'Reportes y análisis ampliados', 'Herramientas de promociones', 'Acompañamiento de implementación', 'Atención preferente']
  }
];

const faqs = [
  ['¿Puedo cambiar de plan después?', 'Sí. Puedes solicitar un cambio de plan según las necesidades de tu negocio.'],
  ['¿Los planes incluyen la creación de mi tienda?', 'La implementación y configuración se coordinan al contratar. El alcance se confirma en la cotización.'],
  ['¿Puedo probar el sistema antes de contratar?', 'Puedes solicitar una demostración para conocer el panel y las funciones disponibles.'],
  ['¿Cómo se realizan los pagos?', 'Los medios, periodicidad y condiciones de pago se detallan en la propuesta comercial antes de contratar.']
];

export default function PlansPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  return <main className="nova-plans">
    <div className="np-top">NOVA SHOES SOFTWARE <span>·</span> SOLUCIONES PARA TU NEGOCIO</div>
    <header className="np-header">
      <a className="np-brand" href="/NOVA-SHOES/"><b>NOVA</b><strong>SHOES</strong><small>TIENDA Y GESTIÓN ONLINE</small></a>
      <nav><a href="#planes">Planes</a><a href="#incluye">Funciones</a><a href="#preguntas">Preguntas</a></nav>
      <a className="np-header-cta" href={wa + encodeURIComponent('Hola, quiero información sobre los planes de NOVA SHOES.')}>Hablar con ventas <ArrowRight size={15}/></a>
    </header>

    <section className="np-hero">
      <div className="np-hero-content">
        <span className="np-eyebrow"><Zap size={14}/> TU NEGOCIO, UN PASO ADELANTE</span>
        <h1>Elige el plan que<br/><em>impulsa tus ventas.</em></h1>
        <p>Una plataforma para mostrar tus productos, recibir pedidos y administrar tu negocio desde un solo lugar.</p>
        <a className="np-primary" href="#planes">Ver planes <ArrowRight size={17}/></a>
        <div className="np-trust"><span><Check size={14}/> Atención personalizada</span><span><LockKeyhole size={14}/> Acceso privado</span></div>
      </div>
      <div className="np-hero-art" aria-label="Panel de gestión de ventas ilustrativo">
        <div className="np-dashboard">
          <div className="np-dash-head"><span></span><span></span><span></span><b>RESUMEN DEL NEGOCIO</b></div>
          <div className="np-dash-welcome">Tu negocio, bajo control</div>
          <div className="np-dash-stats"><div><small>Pedidos</small><b>Organizados</b><i></i></div><div><small>Productos</small><b>En catálogo</b><i></i></div></div>
          <div className="np-dash-bars"><span/><span/><span/><span/><span/><span/><span/></div>
          <div className="np-dash-bottom"><ShoppingBag size={18}/><span>TIENDA ONLINE</span><b>ACTIVA</b></div>
        </div>
        <div className="np-float np-float-one"><Package size={17}/> Inventario organizado</div>
        <div className="np-float np-float-two"><Store size={17}/> Tu tienda, siempre visible</div>
      </div>
    </section>

    <section className="np-benefits" id="incluye">
      <div><Store/><b>Tu tienda online</b><small>Presenta tus productos en internet.</small></div>
      <div><Package/><b>Gestión de productos</b><small>Organiza catálogo y existencias.</small></div>
      <div><ShoppingBag/><b>Pedidos centralizados</b><small>Consulta y administra tus pedidos.</small></div>
      <div><Headphones/><b>Acompañamiento</b><small>Orientación para ponerlo en marcha.</small></div>
    </section>

    <section className="np-pricing" id="planes">
      <div className="np-section-title"><span className="np-eyebrow">PLANES Y SOLUCIONES</span><h2>Crece a tu propio ritmo</h2><p>Conoce las opciones y solicita una propuesta para tu negocio.</p></div>
      <div className="np-plan-grid">
        {plans.map((plan) => <article className={'np-plan-card' + (plan.featured ? ' featured' : '')} key={plan.name}>
          {plan.featured && <div className="np-popular">RECOMENDADO</div>}
          <span className="np-plan-label">{plan.label}</span><h3>{plan.name}</h3><p className="np-plan-desc">{plan.description}</p>
          <div className="np-price-contact">Precio a cotizar <small>Según configuración y necesidades</small></div>
          <a className={plan.featured ? 'np-primary np-plan-button' : 'np-outline np-plan-button'} href={wa + encodeURIComponent('Hola, quiero cotizar el plan ' + plan.name + ' de NOVA SHOES.')}>Consultar este plan <ArrowRight size={16}/></a>
          <div className="np-includes">¿QUÉ INCLUYE?</div>
          <ul>{plan.features.map(feature => <li key={feature}><Check size={16}/>{feature}</li>)}</ul>
        </article>)}
      </div>
      <p className="np-pricing-note">Los precios, límites, servicios de implementación y condiciones se confirman en una cotización personalizada antes de contratar.</p>
    </section>

    <section className="np-cta">
      <div><span className="np-eyebrow">¿NO SABES QUÉ PLAN ELEGIR?</span><h2>Te ayudamos a encontrar<br/>la mejor opción.</h2><p>Cuéntanos cómo funciona tu negocio y te orientaremos.</p></div>
      <a href={wa + encodeURIComponent('Hola, necesito asesoría para elegir un plan de NOVA SHOES.')}>Solicitar asesoría <ArrowRight size={17}/></a>
    </section>

    <section className="np-faq" id="preguntas">
      <div className="np-section-title"><span className="np-eyebrow">AYUDA</span><h2>Preguntas frecuentes</h2></div>
      <div className="np-faq-list">{faqs.map(([q,a],i) => <div className="np-faq-item" key={q}><button onClick={() => setOpenFaq(openFaq === i ? null : i)}>{q}<ChevronDown className={openFaq === i ? 'rotated' : ''}/></button>{openFaq === i && <p>{a}</p>}</div>)}</div>
    </section>

    <footer className="np-footer"><a className="np-brand" href="/NOVA-SHOES/"><b>NOVA</b><strong>SHOES</strong><small>TIENDA Y GESTIÓN ONLINE</small></a><span>© {new Date().getFullYear()} NOVA SHOES. Todos los derechos reservados.</span><a href="/NOVA-SHOES/">Volver a la tienda</a></footer>
  </main>;
}
