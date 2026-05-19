-- ============================================================================
-- §3.2: Padroniza FK→plano_contas como plano_contas_id em todas as tabelas
-- + extensão §3.5: contas_pagar_itens.conta_id → conta_pagar_id (FK→CPR)
-- ============================================================================
-- IDEMPOTENTE: blocos DO defensivos — safe pra re-executar se banco já foi
-- alterado manualmente via SQL Editor em 18/05/2026.
-- ============================================================================

-- 1. contas_pagar_receber
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contas_pagar_receber' AND column_name='conta_id') THEN
    ALTER TABLE public.contas_pagar_receber RENAME COLUMN conta_id TO plano_contas_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='contas_pagar_receber_conta_id_fkey') THEN
    ALTER TABLE public.contas_pagar_receber RENAME CONSTRAINT contas_pagar_receber_conta_id_fkey TO contas_pagar_receber_plano_contas_id_fkey;
  END IF;
END $$;

-- 2. contas_pagar_itens.conta_id → conta_pagar_id (FK→CPR, extensão §3.5)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contas_pagar_itens' AND column_name='conta_id') THEN
    ALTER TABLE public.contas_pagar_itens RENAME COLUMN conta_id TO conta_pagar_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='contas_pagar_itens_conta_id_fkey') THEN
    ALTER TABLE public.contas_pagar_itens RENAME CONSTRAINT contas_pagar_itens_conta_id_fkey TO contas_pagar_itens_conta_pagar_id_fkey;
  END IF;
END $$;

-- 3. contas_pagar_itens.conta_plano_id → plano_contas_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contas_pagar_itens' AND column_name='conta_plano_id') THEN
    ALTER TABLE public.contas_pagar_itens RENAME COLUMN conta_plano_id TO plano_contas_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='contas_pagar_itens_conta_plano_id_fkey') THEN
    ALTER TABLE public.contas_pagar_itens RENAME CONSTRAINT contas_pagar_itens_conta_plano_id_fkey TO contas_pagar_itens_plano_contas_id_fkey;
  END IF;
END $$;

-- 4. regras_categorizacao
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='regras_categorizacao' AND column_name='conta_plano_id') THEN
    ALTER TABLE public.regras_categorizacao RENAME COLUMN conta_plano_id TO plano_contas_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='regras_categorizacao_conta_plano_id_fkey') THEN
    ALTER TABLE public.regras_categorizacao RENAME CONSTRAINT regras_categorizacao_conta_plano_id_fkey TO regras_categorizacao_plano_contas_id_fkey;
  END IF;
END $$;

-- 5. movimentacoes_bancarias
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimentacoes_bancarias' AND column_name='conta_plano_id') THEN
    ALTER TABLE public.movimentacoes_bancarias RENAME COLUMN conta_plano_id TO plano_contas_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='movimentacoes_bancarias_conta_plano_id_fkey') THEN
    ALTER TABLE public.movimentacoes_bancarias RENAME CONSTRAINT movimentacoes_bancarias_conta_plano_id_fkey TO movimentacoes_bancarias_plano_contas_id_fkey;
  END IF;
END $$;

-- 6. parceiros_comerciais
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parceiros_comerciais' AND column_name='categoria_padrao_id') THEN
    ALTER TABLE public.parceiros_comerciais RENAME COLUMN categoria_padrao_id TO plano_contas_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='parceiros_comerciais_categoria_padrao_id_fkey') THEN
    ALTER TABLE public.parceiros_comerciais RENAME CONSTRAINT parceiros_comerciais_categoria_padrao_id_fkey TO parceiros_comerciais_plano_contas_id_fkey;
  END IF;
END $$;

-- 7. compromissos_parcelados
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='compromissos_parcelados' AND column_name='categoria_id') THEN
    ALTER TABLE public.compromissos_parcelados RENAME COLUMN categoria_id TO plano_contas_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='compromissos_parcelados_categoria_id_fkey') THEN
    ALTER TABLE public.compromissos_parcelados RENAME CONSTRAINT compromissos_parcelados_categoria_id_fkey TO compromissos_parcelados_plano_contas_id_fkey;
  END IF;
END $$;

-- 8. compromissos_recorrentes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='compromissos_recorrentes' AND column_name='categoria_id') THEN
    ALTER TABLE public.compromissos_recorrentes RENAME COLUMN categoria_id TO plano_contas_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='compromissos_recorrentes_categoria_id_fkey') THEN
    ALTER TABLE public.compromissos_recorrentes RENAME CONSTRAINT compromissos_recorrentes_categoria_id_fkey TO compromissos_recorrentes_plano_contas_id_fkey;
  END IF;
END $$;

-- 9. fatura_cartao_lancamentos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fatura_cartao_lancamentos' AND column_name='categoria_id') THEN
    ALTER TABLE public.fatura_cartao_lancamentos RENAME COLUMN categoria_id TO plano_contas_id;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fatura_cartao_lancamentos_categoria_id_fkey') THEN
    ALTER TABLE public.fatura_cartao_lancamentos RENAME CONSTRAINT fatura_cartao_lancamentos_categoria_id_fkey TO fatura_cartao_lancamentos_plano_contas_id_fkey;
  END IF;
END $$;
