-- ============================================================================
-- USER SYNCHRONIZATION SCRIPT
-- ============================================================================
-- This script ensures proper synchronization between Supabase Auth and custom users table
-- Execute this in your Supabase SQL Editor

-- ============================================================================
-- 1. CREATE TRIGGER FUNCTION TO SYNC USERS
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new user is created in auth.users, create corresponding record in public.users
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.users (
      id,
      email,
      username,
      full_name,
      auth_provider,
      is_verified,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        CONCAT(
          COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
          ' ',
          COALESCE(NEW.raw_user_meta_data->>'last_name', '')
        )
      ),
      CASE 
        WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'
        WHEN NEW.raw_app_meta_data->>'provider' = 'apple' THEN 'apple'
        ELSE 'email'
      END,
      COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
      NEW.created_at,
      NEW.updated_at
    );
    
    -- Also create a default wallet for the user
    INSERT INTO public.wallets (
      user_id,
      currency,
      available_balance,
      reserved_balance,
      total_deposited,
      total_withdrawn,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      'USD',
      0.00,
      0.00,
      0.00,
      0.00,
      NOW(),
      NOW()
    );
    
    RETURN NEW;
  END IF;
  
  -- When a user is updated in auth.users, update corresponding record in public.users
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.users SET
      email = NEW.email,
      username = COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
      full_name = COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        CONCAT(
          COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
          ' ',
          COALESCE(NEW.raw_user_meta_data->>'last_name', '')
        )
      ),
      auth_provider = CASE 
        WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'
        WHEN NEW.raw_app_meta_data->>'provider' = 'apple' THEN 'apple'
        ELSE 'email'
      END,
      is_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
      updated_at = NEW.updated_at
    WHERE id = NEW.id;
    
    RETURN NEW;
  END IF;
  
  -- When a user is deleted from auth.users, delete corresponding record from public.users
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.users WHERE id = OLD.id;
    DELETE FROM public.wallets WHERE user_id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. CREATE TRIGGERS ON AUTH.USERS
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_from_auth();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_from_auth();

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_from_auth();

-- ============================================================================
-- 3. SYNC EXISTING USERS
-- ============================================================================

-- Insert existing auth users into public.users table
INSERT INTO public.users (
  id,
  email,
  username,
  full_name,
  auth_provider,
  is_verified,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)),
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    CONCAT(
      COALESCE(au.raw_user_meta_data->>'first_name', ''),
      ' ',
      COALESCE(au.raw_user_meta_data->>'last_name', '')
    )
  ),
  CASE 
    WHEN au.raw_app_meta_data->>'provider' = 'google' THEN 'google'
    WHEN au.raw_app_meta_data->>'provider' = 'apple' THEN 'apple'
    ELSE 'email'
  END,
  COALESCE(au.email_confirmed_at IS NOT NULL, false),
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- Create wallets for users who don't have them
INSERT INTO public.wallets (
  user_id,
  currency,
  available_balance,
  reserved_balance,
  total_deposited,
  total_withdrawn,
  created_at,
  updated_at
)
SELECT 
  u.id,
  'USD',
  0.00,
  0.00,
  0.00,
  0.00,
  NOW(),
  NOW()
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallets w WHERE w.user_id = u.id
);

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Check sync status
SELECT 
  'Auth Users' as table_name,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Public Users' as table_name,
  COUNT(*) as count
FROM public.users
UNION ALL
SELECT 
  'Wallets' as table_name,
  COUNT(*) as count
FROM public.wallets;

-- Show any mismatches
SELECT 
  'Users in auth but not in public' as issue,
  au.email,
  au.id
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
UNION ALL
SELECT 
  'Users in public but not in auth' as issue,
  pu.email,
  pu.id
FROM public.users pu
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.id = pu.id
);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Enable RLS on wallets table
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallets
CREATE POLICY "Users can view own wallets" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own wallets
CREATE POLICY "Users can update own wallets" ON public.wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 'User synchronization setup completed successfully!' as status;
