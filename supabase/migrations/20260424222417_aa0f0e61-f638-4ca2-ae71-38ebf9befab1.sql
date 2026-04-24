-- 1. Novos campos para registrar pagamento
ALTER TABLE public.contas_pagar_receber
  ADD COLUMN IF NOT EXISTS valor_pago NUMERIC,
  ADD COLUMN IF NOT EXISTS observacao_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_url TEXT;

-- 2. Trigger: gerar lançamento automaticamente quando vira "pago"
CREATE OR REPLACE FUNCTION public.gerar_lancamento_pagamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo_lanc TEXT;
  v_existe BOOLEAN;
BEGIN
  -- Só age quando status passa para 'pago'
  IF NEW.status = 'pago' AND (OLD.status IS DISTINCT FROM 'pago') THEN
    -- Evita duplicar (caso já exista lançamento manual vinculado)
    SELECT EXISTS (
      SELECT 1 FROM public.lancamentos_financeiros
      WHERE conta_id IS NOT NULL
        AND descricao LIKE '%' || NEW.id::text || '%'
    ) INTO v_existe;

    IF NOT v_existe THEN
      v_tipo_lanc := CASE WHEN NEW.tipo = 'receber' THEN 'credito' ELSE 'debito' END;

      INSERT INTO public.lancamentos_financeiros (
        conta_id, descricao, valor, tipo_lancamento,
        data_competencia, data_pagamento,
        centro_custo, canal, fornecedor,
        origem, nf_chave_acesso, observacao
      ) VALUES (
        NEW.conta_id,
        NEW.descricao,
        COALESCE(NEW.valor_pago, NEW.valor),
        v_tipo_lanc,
        COALESCE(NEW.data_pagamento, CURRENT_DATE),
        COALESCE(NEW.data_pagamento, CURRENT_DATE),
        NEW.centro_custo,
        NEW.canal,
        NEW.fornecedor_cliente,
        'auto_pagamento',
        NEW.nf_chave_acesso,
        'Gerado automaticamente ao registrar pagamento da conta ' || NEW.id::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gerar_lancamento_pagamento ON public.contas_pagar_receber;
CREATE TRIGGER trg_gerar_lancamento_pagamento
AFTER UPDATE OF status ON public.contas_pagar_receber
FOR EACH ROW
EXECUTE FUNCTION public.gerar_lancamento_pagamento();

-- 3. Bucket de comprovantes (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-pagamento', 'comprovantes-pagamento', false)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS no bucket
DROP POLICY IF EXISTS "Auth view comprovantes" ON storage.objects;
CREATE POLICY "Auth view comprovantes"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'comprovantes-pagamento');

DROP POLICY IF EXISTS "Auth upload comprovantes" ON storage.objects;
CREATE POLICY "Auth upload comprovantes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'comprovantes-pagamento');

DROP POLICY IF EXISTS "Auth update comprovantes" ON storage.objects;
CREATE POLICY "Auth update comprovantes"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'comprovantes-pagamento');

DROP POLICY IF EXISTS "Super admin delete comprovantes" ON storage.objects;
CREATE POLICY "Super admin delete comprovantes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'comprovantes-pagamento'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);