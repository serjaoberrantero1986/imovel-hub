-- ==============================================================================
-- Migration 10: Extended Profile Fields & Permissive Profile Policies
-- ==============================================================================

-- 1. Adiciona colunas complementares ao perfil do corretor e usuário
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creci_uf TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creci_status TEXT;

-- 2. Atualiza políticas RLS de profiles para permitir gravação e atualização seguras
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admin" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id OR auth.role() = 'anon' OR auth.role() = 'authenticated')
  WITH CHECK (auth.uid() = id OR auth.role() = 'anon' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles 
  FOR INSERT WITH CHECK (true);
