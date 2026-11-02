-- NOVA SHOES migration 002: essential commerce modules
CREATE TABLE IF NOT EXISTS store_banners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title varchar(140) NOT NULL,
 subtitle varchar(240),
 image_url text,
 target_url text,
 placement varchar(30) NOT NULL DEFAULT 'home',
 sort_order int NOT NULL DEFAULT 0,
 starts_at timestamptz,
 ends_at timestamptz,
 is_active boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS coupons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code varchar(40) NOT NULL UNIQUE,
 description varchar(200),
 discount_type varchar(12) NOT NULL CHECK(discount_type IN ('percent','fixed')),
 discount_value numeric(12,2) NOT NULL CHECK(discount_value>0),
 min_subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK(min_subtotal>=0),
 max_uses int CHECK(max_uses IS NULL OR max_uses>0),
 uses_count int NOT NULL DEFAULT 0 CHECK(uses_count>=0),
 starts_at timestamptz,
 ends_at timestamptz,
 is_active boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shipping_zones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 department varchar(80) NOT NULL,
 province varchar(80),
 district varchar(80),
 base_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK(base_cost>=0),
 free_from numeric(12,2) CHECK(free_from IS NULL OR free_from>=0),
 estimated_days_min int NOT NULL DEFAULT 2,
 estimated_days_max int NOT NULL DEFAULT 7,
 carrier_name varchar(100),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipping_zones_lookup_idx ON shipping_zones(lower(department),lower(coalesce(province,'')),lower(coalesce(district,'')));
CREATE TABLE IF NOT EXISTS shipments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
 carrier_name varchar(100),
 tracking_code varchar(120),
 status varchar(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','packed','shipped','in_transit','delivered','incident','returned')),
 shipped_at timestamptz,
 delivered_at timestamptz,
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS return_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES orders(id),
 customer_id uuid NOT NULL REFERENCES customers(id),
 reason varchar(40) NOT NULL,
 details text,
 status varchar(20) NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','reviewing','approved','rejected','received','refunded')),
 resolution_notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
 rating int NOT NULL CHECK(rating BETWEEN 1 AND 5),
 title varchar(120),
 comment text,
 is_published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(product_id,customer_id,order_id)
);
CREATE TABLE IF NOT EXISTS wishlists (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(customer_id,product_id)
);
CREATE TABLE IF NOT EXISTS store_pages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug varchar(100) NOT NULL UNIQUE,
 title varchar(160) NOT NULL,
 content text NOT NULL DEFAULT '',
 is_published boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id bigserial PRIMARY KEY,
 actor_admin_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
 action varchar(100) NOT NULL,
 entity_type varchar(60) NOT NULL,
 entity_id varchar(100),
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 ip_address inet,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS shipments_status_idx ON shipments(status,created_at DESC);
CREATE INDEX IF NOT EXISTS returns_status_idx ON return_requests(status,created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_public_idx ON product_reviews(product_id,is_published,created_at DESC);
