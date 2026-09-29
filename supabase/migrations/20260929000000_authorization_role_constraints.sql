CREATE UNIQUE INDEX IF NOT EXISTS budget_members_budget_user_uq
  ON public.budget_members (budget_id, user_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'budget_members_role_allowed'
      AND conrelid = 'public.budget_members'::regclass
  ) THEN
    ALTER TABLE public.budget_members
      ADD CONSTRAINT budget_members_role_allowed
      CHECK (role IN ('owner', 'admin', 'editor', 'viewer')) NOT VALID;
  END IF;
END $$;
ALTER TABLE public.budget_members VALIDATE CONSTRAINT budget_members_role_allowed;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'budget_invitations_role_allowed'
      AND conrelid = 'public.budget_invitations'::regclass
  ) THEN
    ALTER TABLE public.budget_invitations
      ADD CONSTRAINT budget_invitations_role_allowed
      CHECK (role IN ('admin', 'editor', 'viewer')) NOT VALID;
  END IF;
END $$;
ALTER TABLE public.budget_invitations VALIDATE CONSTRAINT budget_invitations_role_allowed;