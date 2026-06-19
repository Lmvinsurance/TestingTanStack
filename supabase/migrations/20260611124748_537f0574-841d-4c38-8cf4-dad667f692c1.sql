ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_status_check
CHECK (payment_status = ANY (ARRAY['initiated','pending','success','failed','refunded','cancelled','collected']::text[]));