-- Kalavatri — CMS, Categories, Coupons & Newsletter
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.

-- 1. Allow any admin-managed category on products
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;

-- 2. Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  show_on_home BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.categories (name, slug, description, image, sort_order) VALUES
  ('Bridal', 'bridal', 'Heirloom juttis for the big day', '/images/jutti_red_bridal.jpg', 1),
  ('Festive', 'festive', 'Zardozi and mirror work for celebrations', '/images/jutti_maroon_gold.jpg', 2),
  ('Everyday', 'everyday', 'Soft leather comfort for daily wear', '/images/jutti_pink_floral.jpg', 3),
  ('Designer', 'designer', 'Limited artisan editions', '/images/jutti_black_leaf.jpg', 4)
ON CONFLICT (slug) DO NOTHING;

-- 3. Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_discount_amount NUMERIC(10,2),
  usage_limit INTEGER,
  per_customer_limit INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.coupons (code, description, discount_type, discount_value, usage_limit, per_customer_limit)
VALUES ('FIRST20', '20% off your first order', 'percent', 20, 500, 1)
ON CONFLICT (code) DO NOTHING;

-- Atomic redemption: increments only while under the usage limit
CREATE OR REPLACE FUNCTION public.redeem_coupon(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE public.coupons
     SET used_count = used_count + 1, updated_at = NOW()
   WHERE code = p_code
     AND is_active = true
     AND (usage_limit IS NULL OR used_count < usage_limit);
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;

-- 4. Orders: remember which coupon was used
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_coupon_email ON public.orders (coupon_code, customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders (customer_email);

-- 5. Site settings (announcement bar, navigation, hero, footer, store rules)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Newsletter subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Lock down direct client access; the backend uses the service role key
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
