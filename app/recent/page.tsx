'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RadioItem } from '@/components/radio-player';
import {
  clearListeningHistory,
  readListeningHistory,
  removeListeningHistory,
  type ListeningHistoryEntry,
} from '@/lib/listening-history';

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function RecentPage() {
  const [items, setItems] = useState<ListeningHistoryEntry[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(() => setItems(readListeningHistory()), []);

  useEffect(() => {
    refresh();
    const onChanged = () => refresh();
    window.addEventListener('radio-history-changed', onChanged);
    window.addEventListener('storage', onChanged);
    return () => {
      window.removeEventListener('radio-history-changed', onChanged);
      window.removeEventListener('storage', onChanged);
    };
  }, [refresh]);

  const lastUpdated = useMemo(() => items[0]?.updatedAt ?? null, [items]);

  async function continueItem(entry: ListeningHistoryEntry) {
    setBusyId(entry.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/tracks/${encodeURIComponent(entry.id)}/playback`, { cache: 'no-store' });
      if (!response.ok) throw new Error('network_or_missing');
      const payload = await response.json() as { item?: RadioItem };
      if (!payload.item) throw new Error('missing_item');
      window.dispatchEvent(new CustomEvent('radio-play', {
        detail: { ...payload.item, startAt: entry.position },
      }));
    } catch {
      if ('caches' in window) {
        const cache = await caches.open('radio-offline-media-v1');
        const cached = await cache.match(`/offline-media/${encodeURIComponent(entry.id)}`);
        if (cached) {
          window.dispatchEvent(new CustomEvent('radio-play', {
            detail: {
              id: entry.id,
              title: entry.title,
              creator: entry.creator,
              src: `/offline-media/${encodeURIComponent(entry.id)}`,
              mimeType: entry.mimeType,
              href: '/recent',
              startAt: entry.position,
            },
          }));
          setBusyId(null);
          return;
        }
      }
      setNotice('تعذر فتح هذا المقطع الآن. قد يكون الاتصال مقطوعًا أو المقطع لم يعد متاحًا.');
    } finally {
      setBusyId(null);
    }
  }

  function removeItem(id: string) {
    removeListeningHistory(id);
    refresh();
  }

  function clearAll() {
    if (!window.confirm('مسح سجل الاستماع على هذا الجهاز؟')) return;
    clearListeningHistory();
    refresh();
  }

  return (
    <section className="section recent-page">
      <div className="container">
        <div className="section-heading recent-heading">
          <div>
            <span className="section-kicker">على هذا الجهاز</span>
            <h2>استمعت مؤخرًا</h2>
            <p>ارجع إلى آخر المقاطع وأكمل من الموضع الذي توقفت عنده.</p>
          </div>
          {items.length ? <button className="button button-ghost button-small" type="button" onClick={clearAll}>مسح السجل</button> : null}
        </div>

        {notice ? <div className="form-alert">{notice}</div> : null}
        {lastUpdated ? <p className="recent-local-note">السجل محفوظ على هذا الجهاز فقط ولا يُرسل كإشعارات.</p> : null}

        {!items.length ? (
          <div className="empty-state">
            <strong>لا يوجد سجل استماع بعد.</strong>
            <p>عندما تشغّل أي ملف سيظهر هنا تلقائيًا.</p>
          </div>
        ) : (
          <div className="recent-list">
            {items.map((entry) => {
              const resumable = entry.position > 0 && entry.duration > 0;
              return (
                <article className="recent-row" key={entry.id}>
                  <div className="recent-row-main">
                    <h3>{entry.title}</h3>
                    <p>{entry.creator}</p>
                    <div className="recent-progress-copy">
                      {resumable ? `توقفت عند ${formatTime(entry.position)} من ${formatTime(entry.duration)}` : 'جاهز للتشغيل من البداية'}
                    </div>
                    {entry.duration > 0 ? (
                      <div className="recent-progress" aria-hidden="true">
                        <span style={{ width: `${Math.min(100, Math.max(0, (entry.position / entry.duration) * 100))}%` }} />
                      </div>
                    ) : null}
                  </div>
                  <div className="recent-row-actions">
                    <button className="button button-dark button-small" type="button" onClick={() => continueItem(entry)} disabled={busyId === entry.id}>
                      {busyId === entry.id ? 'جارٍ الفتح...' : resumable ? 'أكمل' : 'تشغيل'}
                    </button>
                    <button className="button button-ghost button-small" type="button" onClick={() => removeItem(entry.id)}>إزالة</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
