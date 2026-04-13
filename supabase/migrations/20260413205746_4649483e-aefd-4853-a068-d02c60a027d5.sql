
-- 1. Add admin_rh to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_rh';

-- 2. Add atribuido_manualmente to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS atribuido_manualmente boolean NOT NULL DEFAULT false;

-- 3. Add gestor_direto_id to contratos_pj
ALTER TABLE public.contratos_pj ADD COLUMN IF NOT EXISTS gestor_direto_id uuid REFERENCES public.profiles(id);

-- 4. Create function to auto-manage gestor_direto role
CREATE OR REPLACE FUNCTION public.auto_manage_gestor_direto_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _new_gestor_id uuid;
  _old_gestor_id uuid;
  _gestor_user_id uuid;
  _still_leading boolean;
BEGIN
  -- Determine old and new gestor profile IDs
  IF TG_TABLE_NAME = 'colaboradores_clt' THEN
    _new_gestor_id := NEW.gestor_direto_id;
    _old_gestor_id := CASE WHEN TG_OP = 'UPDATE' THEN OLD.gestor_direto_id ELSE NULL END;
  ELSIF TG_TABLE_NAME = 'contratos_pj' THEN
    _new_gestor_id := NEW.gestor_direto_id;
    _old_gestor_id := CASE WHEN TG_OP = 'UPDATE' THEN OLD.gestor_direto_id ELSE NULL END;
  END IF;

  -- If gestor changed, handle the NEW gestor (add role if needed)
  IF _new_gestor_id IS NOT NULL AND (_old_gestor_id IS DISTINCT FROM _new_gestor_id) THEN
    SELECT user_id INTO _gestor_user_id FROM profiles WHERE id = _new_gestor_id;
    IF _gestor_user_id IS NOT NULL THEN
      INSERT INTO user_roles (user_id, role, atribuido_manualmente)
      VALUES (_gestor_user_id, 'gestor_direto', false)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  -- If gestor changed or removed, handle the OLD gestor (remove role if no longer leading anyone)
  IF _old_gestor_id IS NOT NULL AND (_old_gestor_id IS DISTINCT FROM _new_gestor_id) THEN
    SELECT user_id INTO _gestor_user_id FROM profiles WHERE id = _old_gestor_id;
    IF _gestor_user_id IS NOT NULL THEN
      -- Check if this person is still a gestor for anyone
      SELECT EXISTS (
        SELECT 1 FROM colaboradores_clt WHERE gestor_direto_id = _old_gestor_id
        UNION ALL
        SELECT 1 FROM contratos_pj WHERE gestor_direto_id = _old_gestor_id
      ) INTO _still_leading;

      IF NOT _still_leading THEN
        -- Only remove if not manually assigned
        DELETE FROM user_roles
        WHERE user_id = _gestor_user_id
          AND role = 'gestor_direto'
          AND atribuido_manualmente = false;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Create triggers on both tables
CREATE TRIGGER trg_auto_gestor_direto_clt
AFTER INSERT OR UPDATE OF gestor_direto_id ON public.colaboradores_clt
FOR EACH ROW
EXECUTE FUNCTION public.auto_manage_gestor_direto_role();

CREATE TRIGGER trg_auto_gestor_direto_pj
AFTER INSERT OR UPDATE OF gestor_direto_id ON public.contratos_pj
FOR EACH ROW
EXECUTE FUNCTION public.auto_manage_gestor_direto_role();

-- 6. Add admin_rh to custom_roles table as a system role
INSERT INTO public.custom_roles (name, description, is_system)
VALUES ('admin_rh', 'Gestão completa de RH, acesso a dados sensíveis e configuração de gestores', true)
ON CONFLICT DO NOTHING;
