ALTER TABLE integracoes_sync_log DROP CONSTRAINT IF EXISTS integracoes_sync_log_status_check;
ALTER TABLE integracoes_sync_log ADD CONSTRAINT integracoes_sync_log_status_check CHECK (status IN ('executando','sucesso','erro','parcial','cancelado'));
UPDATE integracoes_sync_log SET status='cancelado', detalhes='Cancelado manualmente (estava travado)' WHERE status='executando';