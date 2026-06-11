import { useEffect, useState } from 'react';
import { criteriaService, type BuilderState } from '@plynth/supabase/services';
import { useAuth } from '@plynth/supabase/auth';
import { LENDER_MOCK } from '@plynth/shared/mock';
import { CriteriaBuilder } from '../components/CriteriaBuilder';
import { useToastFire } from '../components/ToastContext';

export function Criteria() {
  const { profile } = useAuth();
  const [initial, setInitial] = useState<BuilderState | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToastFire();

  useEffect(() => {
    let alive = true;
    if (!profile) {
      setInitial(LENDER_MOCK.criteria);
      return;
    }
    criteriaService
      .getForLender(profile.id)
      .then((c) => alive && setInitial(c))
      .catch(() => alive && setInitial(LENDER_MOCK.criteria));
    return () => {
      alive = false;
    };
  }, [profile]);

  if (!initial) {
    return (
      <div className="page page-wide">
        <div className="skel" style={{ width: 220, height: 16, marginBottom: 24 }} />
      </div>
    );
  }

  const onSave = async (c: BuilderState) => {
    if (!profile) return;
    setSaving(true);
    try {
      await criteriaService.upsert(profile.id, c);
      toast({
        title: 'Criteria updated',
        sub: 'Changes affect matching for new deals only.',
      });
    } catch (err) {
      toast({ title: 'Save failed', sub: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page page-wide">
      <div style={{ marginBottom: 32, maxWidth: 620 }}>
        <h1 className="h1">Criteria</h1>
        <p className="lead" style={{ fontSize: 16, marginTop: 6 }}>
          The instrument that decides which deals reach you. Adjust anytime.
        </p>
      </div>
      <CriteriaBuilder
        initial={initial}
        onComplete={onSave}
        ctaLabel={saving ? 'Saving…' : 'Save changes'}
        note="Changes affect matching for new deals only."
      />
    </div>
  );
}
