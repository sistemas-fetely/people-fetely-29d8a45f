-- Tabela de conversas
CREATE TABLE IF NOT EXISTS public.fala_fetely_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT,
  arquivada BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fala_fetely_conversas_user ON public.fala_fetely_conversas(user_id, updated_at DESC);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS public.fala_fetely_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES public.fala_fetely_conversas(id) ON DELETE CASCADE,
  papel TEXT NOT NULL CHECK (papel IN ('user', 'assistant')),
  conteudo TEXT NOT NULL,
  fontes_consultadas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fala_fetely_mensagens_conversa ON public.fala_fetely_mensagens(conversa_id, created_at);

-- Tabela de feedback
CREATE TABLE IF NOT EXISTS public.fala_fetely_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id UUID NOT NULL REFERENCES public.fala_fetely_mensagens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  util BOOLEAN NOT NULL,
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mensagem_id, user_id)
);

-- Trigger updated_at em conversas
CREATE TRIGGER update_fala_fetely_conversas_updated_at
  BEFORE UPDATE ON public.fala_fetely_conversas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.fala_fetely_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fala_fetely_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fala_fetely_feedback ENABLE ROW LEVEL SECURITY;

-- Policies: usuário gerencia suas próprias conversas
CREATE POLICY "Users see own conversas" ON public.fala_fetely_conversas
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users see own mensagens" ON public.fala_fetely_mensagens
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.fala_fetely_conversas c WHERE c.id = conversa_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.fala_fetely_conversas c WHERE c.id = conversa_id AND c.user_id = auth.uid()));

CREATE POLICY "Users manage own feedback" ON public.fala_fetely_feedback
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Super admin pode ler tudo
CREATE POLICY "Super admin read all conversas" ON public.fala_fetely_conversas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin read all mensagens" ON public.fala_fetely_mensagens
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin read all feedback" ON public.fala_fetely_feedback
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));