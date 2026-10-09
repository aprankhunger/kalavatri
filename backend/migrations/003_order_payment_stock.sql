-- Kalavatri — Atomic stock reservation/release for checkout (payment flow)
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
--
-- Stock is RESERVED (decremented) atomically when an order is created, before
-- the customer is sent to Razorpay. This guarantees we never collect payment
-- for an item we can't fulfil. If payment is abandoned/fails, the matching
-- release function returns the stock. Both functions run in a single
-- transaction, so a shortage on any line rolls back every line in the order.

CREATE OR REPLACE FUNCTION public.reserve_order_stock(p_items jsonb, p_order_ref text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_name text;
  v_prev integer;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_name := COALESCE(item->>'name', 'item');
    v_qty  := COALESCE((item->>'quantity')::integer, 0);

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'INVALID_QTY:%', v_name;
    END IF;

    BEGIN
      v_product_id := (item->>'productId')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'UNAVAILABLE:%', v_name;
    END;

    -- Lock the product row before reading, so concurrent checkouts serialize.
    SELECT stock_quantity INTO v_prev
      FROM public.products
     WHERE id = v_product_id AND is_deleted = false
     FOR UPDATE;

    IF v_prev IS NULL THEN
      RAISE EXCEPTION 'UNAVAILABLE:%', v_name;
    END IF;

    IF v_prev < v_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_name;
    END IF;

    UPDATE public.products
       SET stock_quantity = stock_quantity - v_qty,
           in_stock = (stock_quantity - v_qty) > 0,
           updated_at = NOW()
     WHERE id = v_product_id;

    INSERT INTO public.inventory_movements
      (product_id, type, quantity_delta, previous_stock, new_stock, reason, reference_order_id)
    VALUES
      (v_product_id, 'sale', -v_qty, v_prev, v_prev - v_qty, 'Checkout reservation', p_order_ref);
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_order_stock(p_items jsonb, p_order_ref text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_prev integer;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE((item->>'quantity')::integer, 0);
    IF v_qty <= 0 THEN CONTINUE; END IF;

    BEGIN
      v_product_id := (item->>'productId')::uuid;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;

    SELECT stock_quantity INTO v_prev
      FROM public.products
     WHERE id = v_product_id
     FOR UPDATE;
    IF v_prev IS NULL THEN CONTINUE; END IF;

    UPDATE public.products
       SET stock_quantity = stock_quantity + v_qty,
           in_stock = true,
           updated_at = NOW()
     WHERE id = v_product_id;

    INSERT INTO public.inventory_movements
      (product_id, type, quantity_delta, previous_stock, new_stock, reason, reference_order_id)
    VALUES
      (v_product_id, 'return', v_qty, v_prev, v_prev + v_qty, 'Checkout released', p_order_ref);
  END LOOP;

  RETURN jsonb_build_object('ok', true);
END;
$$;
