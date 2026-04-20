DO $$
DECLARE
  v_proc_id UUID;
  v_area_ti UUID := (SELECT id FROM public.parametros WHERE categoria='area_negocio' AND valor='ti' LIMIT 1);
  v_area_adm UUID := (SELECT id FROM public.parametros WHERE categoria='area_negocio' AND valor='administrativo' LIMIT 1);
BEGIN
INSERT INTO public.processos (codigo, nome, descricao, narrativa, diagrama_mermaid, natureza_valor, status_valor, sensivel)
VALUES (
  'manutencao_documentacao',
  'Manutenção da Documentação Fetely',
  'Como criar, atualizar e manter documentos vivos no SNCF. Garante que nenhuma feature fique órfã e que o Fala Fetely sempre saiba responder.',
  $narrativa$# Manutenção da Documentação — manter o que a Fetely sabe, vivo

> *"Feature sem documentação = feature órfã. Documentação desatualizada é pior que nenhuma."*

Este processo garante que toda informação relevante da Fetely esteja acessível, atualizada e respondível pelo Fala Fetely. Não é burocracia — é memória institucional.

---

## Onde a documentação vive

Toda documentação oficial da Fetely vive em **um único lugar**: a tabela `sncf_documentacao`, visível em `/documentacao`. Não em arquivos .md no repositório, não em planilhas, não em mensagens de WhatsApp.

Organizada em 6 categorias:
- 🧬 **DNA & Marca** — identidade, posicionamento, visual
- 👥 **People (RH)** — módulos, guias, status
- ⚖️ **Jurídico** — board, contratos, compliance
- 🖥️ **TI** — arquitetura, deploys, doutrinas
- 📊 **Operacional** — metodologias, doutrinas, números
- 🗺️ **Roadmap** — prioridades, backlog

O Fala Fetely lê automaticamente documentos marcados com `sync_fala_fetely = true`.

---

## Quem faz o quê (RACI)

- **R — Responsável pela atualização:** Quem construiu a feature ou tomou a decisão (Flavio + Claude no dia a dia)
- **A — Aprova:** Flavio (Super Admin) — toda publicação no Lovable é ato de aprovação
- **C — Consultado:** Claude (assistente técnico) — gera prompts de atualização, lembra quando esquecer
- **I — Informado:** Fala Fetely (recebe sync automático), todos os colaboradores (veem em `/documentacao`)

---

## Seu passo a passo — por situação

### 🔧 Acabei de construir uma feature nova
1. No final da sessão, diga ao Claude: *"Atualiza a documentação"*
2. Claude gera prompt de UPDATE pro Lovable atualizando: Estado Atual + doc relevante da área
3. Publique o prompt no Lovable
4. Pronto — `/documentacao` e Fala Fetely já refletem

### 📝 Quero criar um documento novo
1. Vá em `/documentacao` → botão "Novo documento"
2. Escolha categoria (DNA, People, Jurídico, TI, Operacional, Roadmap)
3. Escreva título, descrição e conteúdo
4. Marque "Sincronizar com Fala Fetely" se quiser que o chatbot responda sobre
5. Salve — documento está vivo

**Alternativa:** Peça ao Claude: *"Cria um documento sobre X"* — ele gera o prompt completo.

### 🔄 Informação mudou em outro chat (ex: "01. Marca e referência")
1. Venha a qualquer chat do projeto e diga: *"No chat Marca definimos X, atualiza o DNA"*
2. Claude gera o prompt de UPDATE
3. Publique no Lovable
4. Fala Fetely já responde com a informação nova

### ❓ Não sei se preciso documentar algo
Regra simples: **"Se mais de 1 pessoa precisaria consultar isso regularmente, é documento."**

Se está em dúvida, documente. Custo de documentar algo pequeno é baixo; custo de não documentar algo importante é alto (exatamente como processos — doutrina silencioso vs mapeado).

---

## O que acontece automaticamente

- **Fala Fetely atualiza** quando doc com `sync_fala_fetely = true` é modificado
- **Aviso de +30 dias** — quando alguém pergunta ao Fala Fetely e a fonte tem mais de 30 dias, ele avisa: "essa informação pode estar desatualizada"
- **Versionamento** — cada update incrementa a versão do documento (rastreabilidade)
- **Busca e filtro** — `/documentacao` tem busca por texto e filtro por categoria

## O que NÃO acontece automaticamente

- Documentação **não se atualiza sozinha** ao publicar prompt no Lovable (por design — precisa de ação consciente)
- Outros chats do projeto **não sabem** o que foi discutido aqui (por isso existem os Project Files como instruções de contexto e as memórias como regras permanentes)

---

## Regra de ouro

> **"Feature sem documentação = feature órfã."**

Todo chat do projeto, ao construir algo, deve gerar prompt atualizando:
1. Estado Atual no banco
2. Documento relevante da área
3. Fala Fetely (se aplicável)

Se Claude esquecer, Flavio lembra. Se Flavio esquecer, Claude lembra.

---

## Meta do processo

- Zero documento desatualizado por mais de 30 dias
- Fala Fetely responde sobre 100% dos temas documentados
- Novo colaborador encontra tudo em `/documentacao` sem precisar perguntar a ninguém

---

## KPIs candidatos

> *Estes KPIs serão implementados quando o Quadro de KPIs for construído.*

- 📊 **Docs atualizados / total** — % de documentos com updated_at < 30 dias
- 📊 **Docs com sync Fala Fetely** — % de docs sincronizados
- 📊 **Perguntas respondidas pelo Fala Fetely** vs "não sei" — taxa de cobertura
$narrativa$,
  $diagrama$flowchart TD
    subgraph Origem["🔧 Onde nasce a informação"]
        A1[Feature nova construída]
        A2[Decisão tomada em chat]
        A3[Mudança de marca/produto]
        A4[Novo processo mapeado]
    end
    subgraph Acao["📝 Ação de documentação"]
        B1["Flavio diz: atualiza a documentação"]
        B2[Claude gera prompt UPDATE]
        B3[Flavio publica no Lovable]
    end
    subgraph SelfService["🖥️ Self-service"]
        C1["/documentacao → Novo documento"]
        C2[Escolhe categoria + escreve]
        C3[Marca sync Fala Fetely]
    end
    subgraph Resultado["✅ Resultado"]
        D1[Banco atualizado]
        D2["/documentacao mostra"]
        D3["Fala Fetely responde"]
        D4["Aviso +30 dias se velho"]
    end
    A1 --> B1
    A2 --> B1
    A3 --> B1
    A4 --> B1
    B1 --> B2
    B2 --> B3
    B3 --> D1
    A1 --> C1
    A3 --> C1
    C1 --> C2
    C2 --> C3
    C3 --> D1
    D1 --> D2
    D1 --> D3
    D3 --> D4
    classDef destaque fill:#1a3d2b,color:#fff,stroke:#1a3d2b
    class D1,D2,D3 destaque$diagrama$,
  'guia',
  'vigente',
  false
)
ON CONFLICT (codigo) DO NOTHING
RETURNING id INTO v_proc_id;

IF v_proc_id IS NOT NULL THEN
    IF v_area_ti IS NOT NULL THEN
      INSERT INTO public.processos_tags_areas(processo_id, area_id) VALUES (v_proc_id, v_area_ti) ON CONFLICT DO NOTHING;
    END IF;
    IF v_area_adm IS NOT NULL THEN
      INSERT INTO public.processos_tags_areas(processo_id, area_id) VALUES (v_proc_id, v_area_adm) ON CONFLICT DO NOTHING;
    END IF;
    INSERT INTO public.processos_tags_tipos_colaborador(processo_id, tipo)
    VALUES (v_proc_id, 'clt'), (v_proc_id, 'pj') ON CONFLICT DO NOTHING;

    INSERT INTO public.processos_versoes (
      processo_id, numero, nome_snapshot, descricao_snapshot, narrativa_snapshot,
      natureza_snapshot, diagrama_snapshot, motivo_alteracao
    )
    VALUES (
      v_proc_id, 1, 'Manutenção da Documentação Fetely',
      'Como criar, atualizar e manter documentos vivos no SNCF',
      (SELECT narrativa FROM public.processos WHERE id = v_proc_id),
      'guia',
      (SELECT diagrama_mermaid FROM public.processos WHERE id = v_proc_id),
      'Primeiro registro — processo nasce junto com a migração da documentação para SNCF transversal.'
    );
    UPDATE public.processos SET versao_atual = 1, versao_vigente_em = now() WHERE id = v_proc_id;
END IF;
END $$;

-- ============================================================
-- Fase C1 · Infra para Recentes e Favoritos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usuario_paginas_recentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rota TEXT NOT NULL,
  titulo TEXT NOT NULL,
  pilar TEXT CHECK (pilar IN ('sncf', 'people', 'ti', 'admin')),
  icone TEXT,
  acessado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recentes_user_data ON public.usuario_paginas_recentes(user_id, acessado_em DESC);

CREATE OR REPLACE FUNCTION public.limpar_paginas_recentes()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.usuario_paginas_recentes
  WHERE id IN (
    SELECT id FROM public.usuario_paginas_recentes
    WHERE user_id = NEW.user_id
    ORDER BY acessado_em DESC
    OFFSET 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_limpar_recentes ON public.usuario_paginas_recentes;
CREATE TRIGGER trg_limpar_recentes
  AFTER INSERT ON public.usuario_paginas_recentes
  FOR EACH ROW EXECUTE FUNCTION public.limpar_paginas_recentes();

ALTER TABLE public.usuario_paginas_recentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User manages own recentes" ON public.usuario_paginas_recentes;
CREATE POLICY "User manages own recentes"
  ON public.usuario_paginas_recentes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.usuario_paginas_favoritas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rota TEXT NOT NULL,
  titulo TEXT NOT NULL,
  pilar TEXT CHECK (pilar IN ('sncf', 'people', 'ti', 'admin')),
  icone TEXT,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, rota)
);

CREATE INDEX IF NOT EXISTS idx_favoritas_user ON public.usuario_paginas_favoritas(user_id, ordem);

ALTER TABLE public.usuario_paginas_favoritas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User manages own favoritas" ON public.usuario_paginas_favoritas;
CREATE POLICY "User manages own favoritas"
  ON public.usuario_paginas_favoritas
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DO $$
BEGIN
  PERFORM public.registrar_audit(
    'FASE_C1_RECENTES_FAVORITOS',
    jsonb_build_object(
      'tabelas_criadas', ARRAY['usuario_paginas_recentes', 'usuario_paginas_favoritas'],
      'processo_criado', 'manutencao_documentacao',
      'aplicado_em', now()
    )
  );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;