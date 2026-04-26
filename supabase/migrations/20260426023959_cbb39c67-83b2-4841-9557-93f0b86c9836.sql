CREATE TABLE IF NOT EXISTS contas_pagar_receber_backup_20260425 AS 
SELECT * FROM contas_pagar_receber;

CREATE INDEX IF NOT EXISTS idx_backup_cpr_20260425_id 
  ON contas_pagar_receber_backup_20260425(id);

COMMENT ON TABLE contas_pagar_receber_backup_20260425 IS 
  'Backup criado em 25/04/2026 antes de limpar contas_pagar_receber';

ALTER TABLE contas_pagar_receber_backup_20260425 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin e financeiro podem ver backup"
  ON contas_pagar_receber_backup_20260425
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'financeiro'::app_role)
  );