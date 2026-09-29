ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transfer_group_id uuid,
  ADD COLUMN IF NOT EXISTS transfer_peer_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_transfer_columns_paired'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_transfer_columns_paired
      CHECK ((transfer_group_id IS NULL) = (transfer_peer_id IS NULL)) NOT VALID;
  END IF;
END $$;
ALTER TABLE public.transactions VALIDATE CONSTRAINT transactions_transfer_columns_paired;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_transfer_peer_fk'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_transfer_peer_fk
      FOREIGN KEY (transfer_peer_id)
      REFERENCES public.transactions (id)
      DEFERRABLE INITIALLY DEFERRED
      NOT VALID;
  END IF;
END $$;
ALTER TABLE public.transactions VALIDATE CONSTRAINT transactions_transfer_peer_fk;

CREATE INDEX IF NOT EXISTS transactions_transfer_group_idx
  ON public.transactions (transfer_group_id)
  WHERE transfer_group_id IS NOT NULL;