import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import { z } from 'zod';
// Private administration: signed, HttpOnly sessions and one-time owner bootstrap.
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_TTL = 8 * 60 * 60;
const cookieName = 'nova_admin_session';
const cookieOptions = `Path=/; HttpOnly; SameSite=${process.env.NODE_ENV === 'production' ? 'None; Secure' : 'Lax'}; Max-Age=${SESSION_TTL}`;
function sign(value) { return createHmac('sha256', SESSION_SECRET || 'missing-session-secret').update(value).digest('base64url'); }
function issueSession(user) {
  const payload = Buffer.from(JSON.stringify({ sub:user.id, email:user.email, role:user.role, exp:Math.floor(Date.now()/1000)+SESSION_TTL })).toString('base64url');
  return payload+'.'+sign(payload);
}
function readCookie(req,name) {
  const raw=req.headers.cookie||'';
  for (const part of raw.split(';')) { const i=part.indexOf('='); if(i>0&&part.slice(0,i).trim()===name)return decodeURIComponent(part.slice(i+1).trim()); }
  return '';
}
async function requireAdmin(req,res,next) {
  try {
    if(!SESSION_SECRET || SESSION_SECRET.length<32)return res.status(503).json({error:'El servidor aún no tiene SESSION_SECRET seguro configurado.'});
    const token=readCookie(req,cookieName),[payload,signature]=token.split('.');
    if(!payload||!signature)return res.status(401).json({error:'Inicia sesión para continuar.'});
    const expected=sign(payload),a=Buffer.from(signature),b=Buffer.from(expected);
    if(a.length!==b.length||!timingSafeEqual(a,b))return res.status(401).json({error:'Sesión no válida.'});
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    if(data.exp<Math.floor(Date.now()/1000))return res.status(401).json({error:'La sesión venció. Inicia sesión nuevamente.'});
    const {rows}=await pool.query('SELECT id,full_name,email,role,is_active FROM admin_users WHERE id=$1',[data.sub]);
    if(!rows.length||!rows[0].is_active)return res.status(401).json({error:'Cuenta desactivada o inexistente.'});
    req.admin=rows[0]; next();
  } catch { res.status(401).json({error:'No se pudo validar la sesión.'}); }
}
const loginLimiter=rateLimit({windowMs:15*60_000,limit:8,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Demasiados intentos. Espera 15 minutos.'}});
app.get('/api/admin/setup-status',async(_req,res,next)=>{
  try { const {rows}=await pool.query('SELECT count(*)::int AS count FROM admin_users'); res.json({setupRequired:rows[0].count===0}); } catch(e){next(e);}
});
app.post('/api/admin/bootstrap',loginLimiter,async(req,res,next)=>{
  const schema=z.object({bootstrapKey:z.string().min(20),fullName:z.string().min(2).max(120),email:z.string().email().max(190),password:z.string().min(12).max(128)});
  const parsed=schema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Completa nombre, correo y contraseña de al menos 12 caracteres.'});
  if(!process.env.ADMIN_BOOTSTRAP_KEY||!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32)return res.status(503).json({error:'Faltan ADMIN_BOOTSTRAP_KEY o SESSION_SECRET en el servidor.'});
  const supplied=Buffer.from(parsed.data.bootstrapKey),expected=Buffer.from(process.env.ADMIN_BOOTSTRAP_KEY);
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return res.status(403).json({error:'Clave de configuración incorrecta.'});
  try {
    const {rows}=await pool.query('SELECT count(*)::int AS count FROM admin_users');
    if(rows[0].count!==0)return res.status(409).json({error:'La configuración inicial ya fue realizada.'});
    const salt=randomBytes(16).toString('hex');
    const hash=await scrypt(parsed.data.password,salt,64);
    const result=await pool.query('INSERT INTO admin_users(full_name,email,password_hash,role) VALUES($1,lower($2),$3,$4) RETURNING id,full_name,email,role,is_active',[parsed.data.fullName,parsed.data.email,`scrypt:${salt}:${Buffer.from(hash).toString('hex')}`,'owner']);
    res.cookie(cookieName,issueSession(result.rows[0]),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:process.env.NODE_ENV==='production'?'none':'lax',path:'/',maxAge:SESSION_TTL*1000});
    res.status(201).json({user:result.rows[0]});
  } catch(e){next(e);}
});
app.post('/api/admin/login',loginLimiter,async(req,res,next)=>{
  const parsed=z.object({email:z.string().email(),password:z.string().min(1).max(128)}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Correo o contraseña inválidos.'});
  if(!SESSION_SECRET||SESSION_SECRET.length<32)return res.status(503).json({error:'El servidor aún no está configurado para iniciar sesión.'});
  try {
    const {rows}=await pool.query('SELECT id,full_name,email,password_hash,role,is_active FROM admin_users WHERE lower(email)=lower($1)',[parsed.data.email]);
    if(!rows.length||!rows[0].is_active)return res.status(401).json({error:'Correo o contraseña incorrectos.'});
    const user=rows[0],parts=user.password_hash.split(':');
    if(parts.length!==3||parts[0]!=='scrypt')return res.status(401).json({error:'La cuenta requiere restablecer su contraseña.'});
    const derived=Buffer.from(await scrypt(parsed.data.password,parts[1],64)),stored=Buffer.from(parts[2],'hex');
    if(derived.length!==stored.length||!timingSafeEqual(derived,stored))return res.status(401).json({error:'Correo o contraseña incorrectos.'});
    delete user.password_hash;
    res.cookie(cookieName,issueSession(user),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:process.env.NODE_ENV==='production'?'none':'lax',path:'/',maxAge:SESSION_TTL*1000});
    res.json({user});
  } catch(e){next(e);}
});
app.post('/api/admin/logout',(req,res)=>{res.clearCookie(cookieName,{path:'/',httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:process.env.NODE_ENV==='production'?'none':'lax'});res.json({ok:true});});
app.get('/api/admin/me',requireAdmin,(req,res)=>res.json({user:req.admin}));
app.get('/api/admin/dashboard',requireAdmin,async(_req,res,next)=>{
  try {
    const [sales,orders,products,customers,recent]=await Promise.all([
      pool.query("SELECT COALESCE(sum(total),0)::numeric(12,2) AS total FROM orders WHERE payment_status='verified' AND created_at>=date_trunc('month',now())"),
      pool.query("SELECT count(*)::int AS total,count(*) FILTER(WHERE status IN ('pending_payment','paid'))::int AS pending FROM orders"),
      pool.query('SELECT count(*)::int AS total,count(*) FILTER(WHERE is_published)::int AS published FROM products'),
      pool.query('SELECT count(*)::int AS total FROM customers'),
      pool.query("SELECT o.id,o.order_number,o.status,o.payment_status,o.payment_method,o.total,o.created_at,c.full_name,c.phone FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC LIMIT 8")
    ]);
    res.json({sales:sales.rows[0],orders:orders.rows[0],products:products.rows[0],customers:customers.rows[0],recent:recent.rows});
  } catch(e){next(e);}
});
app.get('/api/admin/orders',requireAdmin,async(req,res,next)=>{
  try {
    const status=String(req.query.status||'');
    const values=[];let where='';
    if(status&&['pending_payment','paid','preparing','shipped','delivered','cancelled'].includes(status)){values.push(status);where='WHERE o.status=$1';}
    const {rows}=await pool.query(`SELECT o.id,o.order_number,o.status,o.payment_status,o.payment_method,o.subtotal,o.shipping_cost,o.total,o.customer_note,o.created_at,c.full_name,c.phone,c.email,a.department,a.province,a.district,a.address_line,a.reference,p.id AS payment_id,p.status AS payment_review_status,p.proof_url,p.reference_code FROM orders o JOIN customers c ON c.id=o.customer_id LEFT JOIN customer_addresses a ON a.id=o.address_id LEFT JOIN payments p ON p.order_id=o.id ${where} ORDER BY o.created_at DESC LIMIT 100`,values);
    res.json(rows);
  } catch(e){next(e);}
});
app.patch('/api/admin/orders/:id/payment',requireAdmin,async(req,res,next)=>{
  const parsed=z.object({status:z.enum(['verified','rejected']),referenceCode:z.string().max(100).optional().default('')}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Estado de pago inválido.'});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const p=await client.query('SELECT id,order_id,status FROM payments WHERE order_id=$1 FOR UPDATE',[req.params.id]);
    if(!p.rowCount)throw Object.assign(new Error('No existe el pago de este pedido.'),{status:404});
    if(p.rows[0].status==='verified'||p.rows[0].status==='rejected')throw Object.assign(new Error('Este pago ya fue revisado.'),{status:409});
    const items=await client.query('SELECT variant_id,quantity FROM order_items WHERE order_id=$1',[req.params.id]);
    if(parsed.data.status==='verified'){
      for(const item of items.rows)if(item.variant_id){
        const updated=await client.query('UPDATE product_variants SET stock_on_hand=stock_on_hand-$1,stock_reserved=GREATEST(stock_reserved-$1,0) WHERE id=$2 AND stock_on_hand >= $1 RETURNING id',[item.quantity,item.variant_id]);
        if(!updated.rowCount)throw Object.assign(new Error('Stock insuficiente al confirmar el pago.'),{status:409});
        await client.query("INSERT INTO inventory_movements(variant_id,movement_type,quantity,reference_type,reference_id,note) VALUES($1,'out','0', 'order',$2,'Venta confirmada')".replace("'0'","$3"),[item.variant_id,item.quantity,req.params.id]);
      }
      await client.query("UPDATE orders SET payment_status='verified',status='paid' WHERE id=$1",[req.params.id]);
    } else {
      for(const item of items.rows)if(item.variant_id)await client.query('UPDATE product_variants SET stock_reserved=GREATEST(stock_reserved-$1,0) WHERE id=$2',[item.quantity,item.variant_id]);
      await client.query("UPDATE orders SET payment_status='rejected',status='cancelled' WHERE id=$1",[req.params.id]);
    }
    await client.query('UPDATE payments SET status=$1,reference_code=NULLIF($2,\'\'),reviewed_by=$3,reviewed_at=now() WHERE id=$4',[parsed.data.status,parsed.data.referenceCode,req.admin.id,p.rows[0].id]);
    await client.query("INSERT INTO audit_logs(actor_admin_id,action,entity_type,entity_id,details) VALUES($1,$2,'order',$3,$4::jsonb)",[req.admin.id,'payment_'+parsed.data.status,req.params.id,JSON.stringify({status:parsed.data.status})]);
    await client.query('COMMIT');res.json({ok:true});
  } catch(e){await client.query('ROLLBACK');next(e);} finally{client.release();}
});
app.get('/api/admin/products',requireAdmin,async(_req,res,next)=>{
  try {
    const {rows}=await pool.query(`SELECT p.id,p.name,p.sku,p.brand,p.product_type,p.audience,p.is_published,p.created_at,c.name AS category,COALESCE(json_agg(DISTINCT jsonb_build_object('id',v.id,'sku',v.sku,'size',v.size_label,'color',v.color_name,'price',v.price,'stock',v.stock_on_hand)) FILTER(WHERE v.id IS NOT NULL),'[]') AS variants FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN product_variants v ON v.product_id=p.id GROUP BY p.id,c.name ORDER BY p.created_at DESC LIMIT 200`);
    res.json(rows);
  } catch(e){next(e);}
});


const app = express();
if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL. Configura la conexión pooled de Neon en el entorno del servidor.');
  process.exit(1);
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  enableChannelBinding: true
});
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, service: 'nova-shoes-api', database: 'connected' }); }
  catch { res.status(503).json({ ok: false, service: 'nova-shoes-api', database: 'unavailable' }); }
});

app.get('/api/store', async (_req, res, next) => {
  try { const { rows } = await pool.query('SELECT store_name, tagline, whatsapp_number, contact_email, currency, payment_methods, payment_qr_url, shipping_policy FROM store_settings WHERE id=1'); res.json(rows[0] || {}); } catch (e) { next(e); }
});

app.get('/api/categories', async (_req, res, next) => {
  try { const { rows } = await pool.query('SELECT id,name,slug,audience FROM categories WHERE is_active=true ORDER BY sort_order,name'); res.json(rows); } catch (e) { next(e); }
});

app.get('/api/products', async (req, res, next) => {
  try {
    const values = []; const where = ['p.is_published=true'];
    if (req.query.category) { values.push(String(req.query.category)); where.push('c.slug=$'+values.length); }
    if (req.query.audience && ['men','women','kids','unisex'].includes(String(req.query.audience))) { values.push(String(req.query.audience)); where.push('(p.audience=$'+values.length+' OR p.audience=\'unisex\')'); }
    if (req.query.type && ['sneakers','clothing','accessories'].includes(String(req.query.type))) { values.push(String(req.query.type)); where.push('p.product_type=$'+values.length); }
    if (req.query.q) { values.push('%'+String(req.query.q).slice(0,80)+'%'); where.push('(p.name ILIKE $'+values.length+' OR p.brand ILIKE $'+values.length+')'); }
    const { rows } = await pool.query(`SELECT p.id,p.name,p.slug,p.brand,p.product_type,p.audience,p.description,p.is_featured,
      c.name AS category, COALESCE(json_agg(DISTINCT jsonb_build_object('url',i.image_url,'alt',i.alt_text,'sort',i.sort_order)) FILTER (WHERE i.id IS NOT NULL),'[]') AS images,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id',v.id,'size',v.size_label,'color',v.color_name,'price',v.price,'compare_at_price',v.compare_at_price,'stock',GREATEST(v.stock_on_hand-v.stock_reserved,0))) FILTER (WHERE v.id IS NOT NULL AND v.is_active),'[]') AS variants
      FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN product_images i ON i.product_id=p.id LEFT JOIN product_variants v ON v.product_id=p.id
      WHERE ${where.join(' AND ')} GROUP BY p.id,c.name ORDER BY p.is_featured DESC,p.created_at DESC LIMIT 60`, values);
    res.json(rows);
  } catch (e) { next(e); }
});

// Public storefront modules: campaigns, shipping estimates, coupon checks and order tracking.
app.get('/api/banners', async (_req,res,next) => {
  try {
    const { rows } = await pool.query(`SELECT id,title,subtitle,image_url,target_url,placement
      FROM store_banners WHERE is_active=true AND (starts_at IS NULL OR starts_at<=now())
      AND (ends_at IS NULL OR ends_at>=now()) ORDER BY sort_order,created_at DESC LIMIT 12`);
    res.json(rows);
  } catch(e) { next(e); }
});

app.post('/api/shipping/quote', async (req,res,next) => {
  const schema=z.object({department:z.string().min(2).max(80),province:z.string().max(80).optional().default(''),district:z.string().max(80).optional().default(''),subtotal:z.coerce.number().min(0).max(100000)});
  const parsed=schema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Destino inválido'});
  const d=parsed.data;
  try {
    const {rows}=await pool.query(`SELECT base_cost,free_from,estimated_days_min,estimated_days_max,carrier_name
      FROM shipping_zones WHERE is_active=true AND lower(department)=lower($1)
      AND (province IS NULL OR lower(province)=lower($2))
      AND (district IS NULL OR lower(district)=lower($3))
      ORDER BY (district IS NOT NULL) DESC,(province IS NOT NULL) DESC LIMIT 1`,[d.department,d.province,d.district]);
    if(!rows.length)return res.json({available:false,message:'Aún debemos confirmar la tarifa de envío para este destino.'});
    const z=rows[0],cost=z.free_from!==null&&d.subtotal>=Number(z.free_from)?0:Number(z.base_cost);
    res.json({available:true,cost,freeShipping:cost===0,estimatedDays:{min:z.estimated_days_min,max:z.estimated_days_max},carrier:z.carrier_name});
  } catch(e) { next(e); }
});

app.post('/api/coupons/validate', async (req,res,next) => {
  const schema=z.object({code:z.string().trim().min(2).max(40),subtotal:z.coerce.number().min(0).max(100000)});
  const parsed=schema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({valid:false,error:'Cupón inválido'});
  try {
    const {rows}=await pool.query(`SELECT code,discount_type,discount_value,min_subtotal,max_uses,uses_count,starts_at,ends_at
      FROM coupons WHERE upper(code)=upper($1) AND is_active=true LIMIT 1`,[parsed.data.code]);
    if(!rows.length)return res.json({valid:false,error:'Cupón no disponible'});
    const c=rows[0],now=Date.now();
    if((c.starts_at&&new Date(c.starts_at).getTime()>now)||(c.ends_at&&new Date(c.ends_at).getTime()<now)||(c.max_uses!==null&&c.uses_count>=c.max_uses)||parsed.data.subtotal<Number(c.min_subtotal))
      return res.json({valid:false,error:'El cupón no cumple las condiciones de uso'});
    const discount=c.discount_type==='percent'?Math.min(parsed.data.subtotal,parsed.data.subtotal*Number(c.discount_value)/100):Math.min(parsed.data.subtotal,Number(c.discount_value));
    res.json({valid:true,code:c.code,discount:Number(discount.toFixed(2))});
  } catch(e) { next(e); }
});

app.get('/api/orders/track', async (req,res,next) => {
  const schema=z.object({orderNumber:z.string().min(5).max(30),phone:z.string().min(6).max(30)});
  const parsed=schema.safeParse({orderNumber:req.query.orderNumber,phone:req.query.phone});
  if(!parsed.success)return res.status(400).json({error:'Ingresa el número de pedido y el teléfono registrado'});
  try {
    const {rows}=await pool.query(`SELECT o.order_number,o.status,o.payment_status,o.total,o.created_at,
      s.carrier_name,s.tracking_code,s.shipped_at,s.delivered_at
      FROM orders o JOIN customers c ON c.id=o.customer_id
      LEFT JOIN shipments s ON s.order_id=o.id
      WHERE o.order_number=$1 AND c.phone=$2 LIMIT 1`,[parsed.data.orderNumber,parsed.data.phone]);
    if(!rows.length)return res.status(404).json({error:'No encontramos un pedido con esos datos'});
    res.json(rows[0]);
  } catch(e) { next(e); }
});

const orderSchema = z.object({
  customer: z.object({ fullName:z.string().min(2).max(160), phone:z.string().min(6).max(30), email:z.string().email().optional().or(z.literal('')) }),
  address: z.object({ department:z.string().min(2), province:z.string().min(2), district:z.string().min(2), addressLine:z.string().min(5), reference:z.string().max(500).optional().default('') }),
  paymentMethod:z.enum(['yape','plin','qr','transferencia']),
  note:z.string().max(1000).optional().default(''),
  items:z.array(z.object({ variantId:z.string().uuid(), quantity:z.number().int().min(1).max(20) })).min(1).max(30)
});

app.post('/api/orders', async (req, res, next) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error:'Datos de pedido inválidos', details:parsed.error.flatten() });
  const data = parsed.data; const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let customer = await client.query('SELECT id FROM customers WHERE phone=$1 LIMIT 1',[data.customer.phone]);
    if (customer.rowCount) {
      await client.query('UPDATE customers SET full_name=$1,email=NULLIF($2,\'\') WHERE id=$3',[data.customer.fullName,data.customer.email || '',customer.rows[0].id]);
    } else {
      customer = await client.query('INSERT INTO customers(full_name,email,phone) VALUES($1,NULLIF($2,\'\'),$3) RETURNING id',[data.customer.fullName,data.customer.email || '',data.customer.phone]);
    }
    const customerId = customer.rows[0].id;
    const address = await client.query('INSERT INTO customer_addresses(customer_id,recipient_name,phone,department,province,district,address_line,reference) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[customerId,data.customer.fullName,data.customer.phone,data.address.department,data.address.province,data.address.district,data.address.addressLine,data.address.reference]);
    const items=[]; let subtotal=0;
    for (const item of data.items) {
      const result=await client.query(`SELECT v.id,v.sku,v.size_label,v.color_name,v.price,v.stock_on_hand-v.stock_reserved AS available,p.name
        FROM product_variants v JOIN products p ON p.id=v.product_id
        WHERE v.id=$1 AND v.is_active=true AND p.is_published=true FOR UPDATE OF v`,[item.variantId]);
      if (!result.rowCount || result.rows[0].available < item.quantity) throw Object.assign(new Error('Uno de los productos ya no tiene stock suficiente.'),{status:409});
      const v=result.rows[0]; const line=Number(v.price)*item.quantity; subtotal+=line;
      items.push({ ...v, quantity:item.quantity, line });
      await client.query('UPDATE product_variants SET stock_reserved=stock_reserved+$1 WHERE id=$2',[item.quantity,v.id]);
      await client.query('INSERT INTO inventory_movements(variant_id,movement_type,quantity,reference_type,note) VALUES($1,\'reservation\',$2,\'checkout\',\'Reserva por nuevo pedido\')',[v.id,item.quantity]);
    }
    const orderNumber='NS-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+String((await client.query("SELECT nextval('order_number_seq') AS n")).rows[0].n);
    const order=await client.query(`INSERT INTO orders(order_number,customer_id,address_id,payment_method,subtotal,total,customer_note)
      VALUES($1,$2,$3,$4,$5,$5,$6) RETURNING id,order_number,status,payment_status,total,created_at`,[orderNumber,customerId,address.rows[0].id,data.paymentMethod,subtotal,data.note]);
    for (const item of items) await client.query('INSERT INTO order_items(order_id,variant_id,product_name,sku,size_label,color_name,quantity,unit_price,line_total) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[order.rows[0].id,item.id,item.name,item.sku,item.size_label,item.color_name,item.quantity,item.price,item.line]);
    await client.query('INSERT INTO payments(order_id,method,amount) VALUES($1,$2,$3)',[order.rows[0].id,data.paymentMethod,subtotal]);
    await client.query('COMMIT');
    res.status(201).json({ order:order.rows[0], message:'Pedido creado. El pago está pendiente de verificación.' });
  } catch(e) { await client.query('ROLLBACK'); next(e); } finally { client.release(); }
});

app.use((err,_req,res,_next) => { console.error(err); res.status(err.status || 500).json({ error: err.status ? err.message : 'Error interno del servidor' }); });
const port=Number(process.env.PORT || 4000);
app.listen(port,()=>console.log('NOVA SHOES API listening on '+port));
