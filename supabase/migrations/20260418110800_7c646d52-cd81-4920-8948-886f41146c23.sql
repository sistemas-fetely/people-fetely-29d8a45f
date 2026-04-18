-- ═══ MIGRATION 1 — Adicionar diretoria_executiva ao enum ═══
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'diretoria_executiva';
