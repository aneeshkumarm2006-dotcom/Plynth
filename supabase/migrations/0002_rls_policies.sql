-- ============ RLS Policies ============

-- ============ User Profiles ============

CREATE POLICY "users_can_view_own_profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "brokers_can_view_lender_directory" ON user_profiles
  FOR SELECT USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'broker'
    AND user_profiles.role = 'lender'
  );

CREATE POLICY "lenders_can_view_broker_profiles" ON user_profiles
  FOR SELECT USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'lender'
    AND user_profiles.role = 'broker'
  );

CREATE POLICY "users_can_update_own_profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_insert_profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============ Deals ============

CREATE POLICY "brokers_can_view_own_deals" ON deals
  FOR SELECT USING (
    broker_id = auth.uid()
    OR (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'lender'
  );

CREATE POLICY "brokers_can_create_deals" ON deals
  FOR INSERT WITH CHECK (
    broker_id = auth.uid()
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'broker'
  );

CREATE POLICY "brokers_can_update_own_deals" ON deals
  FOR UPDATE USING (broker_id = auth.uid())
  WITH CHECK (broker_id = auth.uid());

-- ============ Lender Criteria ============

CREATE POLICY "lenders_can_view_own_criteria" ON lender_criteria
  FOR SELECT USING (lender_id = auth.uid());

CREATE POLICY "lenders_can_create_criteria" ON lender_criteria
  FOR INSERT WITH CHECK (
    lender_id = auth.uid()
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'lender'
  );

CREATE POLICY "lenders_can_update_own_criteria" ON lender_criteria
  FOR UPDATE USING (lender_id = auth.uid())
  WITH CHECK (lender_id = auth.uid());

-- ============ Offers ============

CREATE POLICY "offer_visibility" ON offers
  FOR SELECT USING (
    lender_id = auth.uid()
    OR deal_id IN (
      SELECT id FROM deals WHERE broker_id = auth.uid()
    )
  );

CREATE POLICY "lenders_can_create_offers" ON offers
  FOR INSERT WITH CHECK (
    lender_id = auth.uid()
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'lender'
  );

CREATE POLICY "can_update_own_offer" ON offers
  FOR UPDATE USING (
    lender_id = auth.uid()
    OR (SELECT broker_id FROM deals WHERE id = offers.deal_id) = auth.uid()
  )
  WITH CHECK (
    lender_id = auth.uid()
    OR (SELECT broker_id FROM deals WHERE id = offers.deal_id) = auth.uid()
  );

-- ============ Offer History ============

CREATE POLICY "offer_history_visibility" ON offer_history
  FOR SELECT USING (
    offer_id IN (
      SELECT id FROM offers
      WHERE lender_id = auth.uid()
      OR deal_id IN (SELECT id FROM deals WHERE broker_id = auth.uid())
    )
  );

CREATE POLICY "can_create_offer_history" ON offer_history
  FOR INSERT WITH CHECK (
    offer_id IN (
      SELECT id FROM offers
      WHERE lender_id = auth.uid()
      OR deal_id IN (SELECT id FROM deals WHERE broker_id = auth.uid())
    )
  );

-- ============ Fundings ============

CREATE POLICY "funding_visibility" ON fundings
  FOR SELECT USING (
    broker_id = auth.uid()
    OR lender_id = auth.uid()
  );

-- ============ Notifications ============

CREATE POLICY "users_can_view_own_notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_update_own_notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============ Lender Deal Interactions ============

CREATE POLICY "lenders_can_view_own_interactions" ON lender_deal_interactions
  FOR SELECT USING (lender_id = auth.uid());

CREATE POLICY "lenders_can_create_interactions" ON lender_deal_interactions
  FOR INSERT WITH CHECK (
    lender_id = auth.uid()
    AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'lender'
  );

CREATE POLICY "lenders_can_update_own_interactions" ON lender_deal_interactions
  FOR UPDATE USING (lender_id = auth.uid())
  WITH CHECK (lender_id = auth.uid());

-- ============ Audit Log ============

CREATE POLICY "audit_log_view_own" ON audit_log
  FOR SELECT USING (user_id = auth.uid());

-- Allow service role to insert (for triggers)
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT WITH CHECK (true);
