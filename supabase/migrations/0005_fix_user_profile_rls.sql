-- ============================================================
-- Plynth — fix infinite recursion in user_profiles RLS
-- ============================================================
-- The original brokers_can_view_lender_directory /
-- lenders_can_view_broker_profiles policies query user_profiles
-- from inside an RLS check ON user_profiles. PostgREST recurses
-- forever and returns 500 on every SELECT. Replace them with a
-- SECURITY DEFINER helper that bypasses RLS to read the caller's
-- own role.
-- ============================================================

-- Helper: returns the role of the currently authenticated user.
-- SECURITY DEFINER → runs with the function owner's rights, skipping RLS.
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$;

-- Only authenticated users should be able to call this.
REVOKE ALL ON FUNCTION current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_user_role() TO authenticated;

-- Drop the recursive policies.
DROP POLICY IF EXISTS "brokers_can_view_lender_directory" ON user_profiles;
DROP POLICY IF EXISTS "lenders_can_view_broker_profiles" ON user_profiles;

-- Recreate them using the helper — no recursion.
CREATE POLICY "brokers_can_view_lender_directory" ON user_profiles
  FOR SELECT USING (
    current_user_role() = 'broker'
    AND user_profiles.role = 'lender'
  );

CREATE POLICY "lenders_can_view_broker_profiles" ON user_profiles
  FOR SELECT USING (
    current_user_role() = 'lender'
    AND user_profiles.role = 'broker'
  );
