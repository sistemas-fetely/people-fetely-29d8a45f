
-- Drop all potentially existing triggers first
DROP TRIGGER IF EXISTS trg_auto_criar_periodo_ferias_clt ON public.colaboradores_clt;
DROP TRIGGER IF EXISTS trg_auto_criar_ferias_pj ON public.contratos_pj;
DROP TRIGGER IF EXISTS trg_recalcular_saldo_ferias_clt ON public.ferias_programacoes;
DROP TRIGGER IF EXISTS trg_recalcular_saldo_ferias_pj ON public.ferias_pj;
DROP TRIGGER IF EXISTS trg_auto_atualizar_posicao_pj ON public.contratos_pj;
DROP TRIGGER IF EXISTS trg_auto_atualizar_posicao_clt ON public.colaboradores_clt;
DROP TRIGGER IF EXISTS trg_auto_criar_posicao_clt ON public.colaboradores_clt;
DROP TRIGGER IF EXISTS trg_auto_criar_posicao_pj ON public.contratos_pj;

-- Trigger: auto-criar períodos de férias ao cadastrar colaborador CLT
CREATE TRIGGER trg_auto_criar_periodo_ferias_clt
AFTER INSERT ON public.colaboradores_clt
FOR EACH ROW
EXECUTE FUNCTION public.auto_criar_periodo_ferias_clt();

-- Trigger: auto-criar períodos de férias ao cadastrar contrato PJ
CREATE TRIGGER trg_auto_criar_ferias_pj
AFTER INSERT ON public.contratos_pj
FOR EACH ROW
EXECUTE FUNCTION public.auto_criar_ferias_pj();

-- Trigger: recalcular saldo férias CLT ao alterar programações
CREATE TRIGGER trg_recalcular_saldo_ferias_clt
AFTER INSERT OR UPDATE OR DELETE ON public.ferias_programacoes
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_saldo_ferias_clt();

-- Trigger: recalcular saldo férias PJ ao alterar registros
CREATE TRIGGER trg_recalcular_saldo_ferias_pj
AFTER INSERT OR UPDATE OR DELETE ON public.ferias_pj
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_saldo_ferias_pj();

-- Trigger: auto-atualizar posição no organograma ao editar contrato PJ
CREATE TRIGGER trg_auto_atualizar_posicao_pj
AFTER UPDATE ON public.contratos_pj
FOR EACH ROW
EXECUTE FUNCTION public.auto_atualizar_posicao_pj();

-- Trigger: auto-atualizar posição no organograma ao editar colaborador CLT
CREATE TRIGGER trg_auto_atualizar_posicao_clt
AFTER UPDATE ON public.colaboradores_clt
FOR EACH ROW
EXECUTE FUNCTION public.auto_atualizar_posicao_clt();

-- Trigger: auto-criar posição no organograma ao cadastrar colaborador CLT
CREATE TRIGGER trg_auto_criar_posicao_clt
AFTER INSERT ON public.colaboradores_clt
FOR EACH ROW
EXECUTE FUNCTION public.auto_criar_posicao_clt();

-- Trigger: auto-criar posição no organograma ao cadastrar contrato PJ
CREATE TRIGGER trg_auto_criar_posicao_pj
AFTER INSERT ON public.contratos_pj
FOR EACH ROW
EXECUTE FUNCTION public.auto_criar_posicao_pj();
