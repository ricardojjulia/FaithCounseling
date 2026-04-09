import { useState, useEffect } from 'react';
import { fetchCounselor } from '../../lib/clientApi.js';
import CounselorDetailHeader from './CounselorDetailHeader.jsx';
import CounselorDetailTabs from './CounselorDetailTabs.jsx';
import { useI18n } from '../../lib/i18nContext.jsx';

export default function CounselorDetailPage({ staffId, onBack, currentUser }) {
  const { t } = useI18n();
  const [counselor, setCounselor] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCounselor(staffId)
      .then((payload) => {
        if (cancelled) return;
        const data = payload.item ?? payload;
        setCounselor(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [staffId]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-soft)',
          fontSize: '15px',
          padding: '40px',
        }}
      >
        {t('counselorDetail.loadingProfile')}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', color: 'var(--danger)', fontSize: '15px' }}>
        <p>{t('counselorDetail.errorLoad', { error })}</p>
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            border: '1px solid #e1e8ed',
            borderRadius: '4px',
            background: 'var(--surface)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          &#8592; {t('counselorDetail.backToCounselors')}
        </button>
      </div>
    );
  }

  if (!counselor) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <CounselorDetailHeader counselor={counselor} onBack={onBack} />
      <CounselorDetailTabs counselor={counselor} staffId={staffId} currentUser={currentUser} />
    </div>
  );
}
