-- Kalavatri — Short, sequential order numbers (e.g. KV-10001)
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
--
-- Replaces the long date-based reference (KV-20261011-1234) with a short,
-- human-friendly sequence that's easy to read over the phone for dispatch.
-- Postgres hands out each value exactly once, so two concurrent checkouts can
-- never clash — no retry logic, no collisions. Numbers start at 10001 so every
-- order ref is a clean 5 digits. Gaps are normal and expected (an abandoned or
-- failed checkout still consumes a value); they are not errors.

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq
  START WITH 10001
  INCREMENT BY 1
  MINVALUE 10001
  NO MAXVALUE
  NO CYCLE;

-- Returns the next order number as text, e.g. 'KV-10001'. Called once per
-- checkout BEFORE stock reservation so the same ref ties together the order
-- row, the stock movement, and the Razorpay receipt.
CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'KV-' || nextval('public.order_number_seq')::text;
$$;
