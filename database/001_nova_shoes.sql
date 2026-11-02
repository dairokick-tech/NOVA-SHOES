-- NOVA SHOES - PostgreSQL schema
-- Run this file against a new PostgreSQL database before starting the API.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(120) NOT NULL,
  email varchar(190) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role varchar(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('owner','admin','catalog','orders')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name varchar(120) NOT NULL DEFAULT 'NOVA SHOES',
  tagline varchar(200) NOT NULL DEFAULT 'Moda, zapatillas y estilo para todos',
  whatsapp_number varchar(20),
  contact_email varchar(190),
  currency char(3) NOT NULL DEFAULT 'PEN',
  payment_methods jsonb NOT NULL DEFAULT '["yape","plin","qr","transferencia"]'::jsonb,
  yape_number varchar(30),
  plin_number varchar(30),
  payment_qr_url text,
  bank_transfer_instructions text,
  shipping_policy text DEFAULT 'Envíos a todo el Perú. El costo y plazo se confirman según destino.',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  slug varchar(120) NOT NULL UNIQUE,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  audience varchar(20) NOT NULL DEFAULT 'unisex' CHECK (audience IN ('men','women','kids','unisex')),
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name varchar(180) NOT NULL,
  slug varchar(200) NOT NULL UNIQUE,
  sku varchar(80) UNIQUE,
  brand varchar(100),
  product_type varchar(30) NOT NULL CHECK (product_type IN ('sneakers','clothing','accessories')),
  audience varchar(20) NOT NULL DEFAULT 'unisex' CHECK (audience IN ('men','women','kids','unisex')),
  description text,
  material varchar(120),
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text varchar(180),
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku varchar(80) UNIQUE,
  size_label varchar(30),
  color_name varchar(60),
  color_hex char(7),
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  compare_at_price numeric(12,2) CHECK (compare_at_price IS NULL OR compare_at_price >= price),
  stock_on_hand integer NOT NULL DEFAULT 0 CHECK (stock_on_hand >= 0),
  stock_reserved integer NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, size_label, color_name)
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(160) NOT NULL,
  email varchar(190),
  phone varchar(30) NOT NULL,
  document_type varchar(10),
  document_number varchar(30),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique ON customers(lower(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  recipient_name varchar(160) NOT NULL,
  phone varchar(30) NOT NULL,
  department varchar(80) NOT NULL,
  province varchar(80) NOT NULL,
  district varchar(80) NOT NULL,
  address_line text NOT NULL,
  reference text,
  postal_code varchar(20),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number varchar(30) UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id),
  address_id uuid REFERENCES customer_addresses(id) ON DELETE SET NULL,
  status varchar(24) NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment','paid','preparing','shipped','delivered','cancelled')),
  payment_status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','submitted','verified','rejected','refunded')),
  payment_method varchar(20) NOT NULL CHECK (payment_method IN ('yape','plin','qr','transferencia')),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  shipping_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  customer_note text,
  tracking_company varchar(100),
  tracking_code varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name varchar(180) NOT NULL,
  sku varchar(80),
  size_label varchar(30),
  color_name varchar(60),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(12,2) NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method varchar(20) NOT NULL CHECK (method IN ('yape','plin','qr','transferencia')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  reference_code varchar(100),
  proof_url text,
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','verified','rejected')),
  reviewed_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES product_variants(id),
  movement_type varchar(20) NOT NULL CHECK (movement_type IN ('in','out','adjustment','reservation','release')),
  quantity integer NOT NULL CHECK (quantity > 0),
  reference_type varchar(30),
  reference_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_public_idx ON products(is_published, product_type, audience);
CREATE INDEX IF NOT EXISTS variants_product_idx ON product_variants(product_id, is_active);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status, payment_status);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['admin_users','products','product_variants','customers','orders'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', t, t);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

INSERT INTO categories (name, slug, audience, sort_order) VALUES
 ('Zapatillas para hombre','zapatillas-hombre','men',1),
 ('Zapatillas para mujer','zapatillas-mujer','women',2),
 ('Zapatillas para niños','zapatillas-ninos','kids',3),
 ('Ropa para hombre','ropa-hombre','men',4),
 ('Ropa para mujer','ropa-mujer','women',5),
 ('Ropa infantil','ropa-infantil','kids',6),
 ('Accesorios','accesorios','unisex',7)
ON CONFLICT (slug) DO NOTHING;
