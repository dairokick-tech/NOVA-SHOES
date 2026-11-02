import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined, max: 10 });
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','), credentials: false }));
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
