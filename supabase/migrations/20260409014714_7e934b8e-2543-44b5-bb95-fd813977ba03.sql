
-- Add approved column to profiles
ALTER TABLE public.profiles ADD COLUMN approved boolean NOT NULL DEFAULT false;

-- Auto-approve existing admin users
UPDATE public.profiles
SET approved = true
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'super_admin'
);

-- Update handle_new_user to keep approved = false for new users (already default)
-- No change needed since default is false
