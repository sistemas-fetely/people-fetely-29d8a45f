-- ============================================================================
-- Fix §3.2: nfs_stage.categoria_id → plano_contas_id
-- ============================================================================
-- nfs_stage ficou de fora da lista SQL do §3.2. FK→plano_contas confirmada.
-- Código TypeScript já foi atualizado pelo refactor §3.2 (cfa22979).
-- IDEMPOTENTE: blocos DO defensivos.
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nfs_stage' AND column_name='categoria_id') THEN
    ALTER TABLE public.nfs_stage RENAME COLUMN categoria_id TO plano_contas_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='nfs_stage_categoria_id_fkey') THEN
    ALTER TABLE public.nfs_stage RENAME CONSTRAINT nfs_stage_categoria_id_fkey TO nfs_stage_plano_contas_id_fkey;
  END IF;
END $$;
