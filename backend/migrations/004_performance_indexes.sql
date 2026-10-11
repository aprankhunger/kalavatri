-- Migration 004: Performance indexes
-- Adds indexes for the hottest storefront + admin queries and for foreign
-- keys that Postgres does not index automatically. All are IF NOT EXISTS so
-- this migration is safe to re-run.
--
-- Apply via the Supabase SQL editor or `psql`. For a large live table you may
-- prefer CREATE INDEX CONCURRENTLY (run each statement outside a transaction).

-- === Storefront product listing (GET /api/products) ========================
-- Every catalog/category page filters on (is_deleted=false AND status='published')
-- and sorts by created_at DESC (default) or by category + created_at. Partial
-- indexes match the always-on visibility predicate and keep the index small.
CREATE INDEX IF NOT EXISTS idx_products_visible_created
  ON public.products (created_at DESC)
  WHERE is_deleted = false AND status = 'published';

CREATE INDEX IF NOT EXISTS idx_products_cat_created
  ON public.products (category, created_at DESC)
  WHERE is_deleted = false AND status = 'published';

-- Admin product list: low-stock filter / sort by stock_quantity
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity
  ON public.products (stock_quantity)
  WHERE is_deleted = false;

-- === Orders (admin screens all sort by created_at DESC) ====================
CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders (created_at DESC);

-- === Reviews (had NO indexes except PK) ====================================
-- product_id is also an unindexed FK -> products(id) ON DELETE CASCADE.
CREATE INDEX IF NOT EXISTS idx_reviews_product_id
  ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at
  ON public.reviews (created_at DESC);

-- === Inventory movements (ledger + per-product history) ====================
CREATE INDEX IF NOT EXISTS idx_inv_mov_product_created
  ON public.inventory_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_mov_created_at
  ON public.inventory_movements (created_at DESC);

-- === Unindexed foreign keys (Postgres does not auto-index FKs) =============
CREATE INDEX IF NOT EXISTS idx_inv_mov_performed_by
  ON public.inventory_movements (performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user_id
  ON public.audit_logs (admin_user_id);
