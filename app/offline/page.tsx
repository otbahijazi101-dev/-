'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type OfflineEntry = {
  id: string;
  title: string;
  creator: string;
  mimeType: string;
  savedAt: number;
};

const OFFLINE_CACHE = 'radio-offline-media-v1';
const OFFLINE_KEY = 'radio-offline-tracks-v1';

function readEntries(): OfflineEntry[] {
  try {
    const value = localStorage.getItem(OFFLINE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function OfflinePage() {
  const [items, setItems] = useState<OfflineEntry[]>([]);
  const [online, setOnline] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(() => setItems(readEntries()), []);

  useEffect(() => {
    refresh();
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onChanged = () => refresh();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('radio-offline-changed', onChanged);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('radio-offline-changed', onChanged);
    };
  }, [refresh]);

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }), []);

  function play(entry: OfflineEntry) {
    const src = `/offline-media/${encodeURIComponent(entry.id)}`;
    window.dispatchEvent(new CustomEvent('radio-play', {
      detail: {
        id: entry.id,
        title: entry.title,
        creator: entry.creator,
        src,
        mimeType: entry.mimeType,
        coverUrl: null,
        href: '/offline',
      },
    }));
  }

  async function remove(entry: OfflineEntry) {
    if ('caches' in window) {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.delete(`/offline-media/${encodeURIComponent(entry.id)}`);
    }
    const next = readEntries().filter((item) => item.id !== entry.id);
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(next));
    setItems(next);
    setNotice('تم حذف الملف من هذا الجهاز.');
  }

  async function removeAll() {
    if (!window.confirm('حذف كل الملفات المحفوظة دون إنترنت من هذا الجهاز؟')) return;
    if ('caches' in window) await caches.delete(OFFLINE_CACHE);
    localStorage.removeItem(OFFLINE_KEY);
    setItems([]);
    setNotice('تم حذف كل التنزيلات من هذا الجهاز.');
  }

  return (
    <section className="offline-page">
      <div className="container offline-shell">
        <div className="offline-heading">
          <div>
            <span className="section-kicker">على هذا الجهاز</span>
            <h1>تنزيلاتي</h1>
            <p>{online ? 'أنت متصل الآن. الملفات أدناه ستظل تعمل عند انقطاع الإنترنت.' : 'أنت الآن بدون إنترنت. الملفات المحفوظة جاهزة للتشغيل.'}</p>
          </div>
          {items.length ? <button className="button button-ghost button-small" type="button" onClick={removeAll}>حذف الكل</button> : null}
        </div>

        <div className="offline-install-note">
          <strong>تثبيت الراديو</strong>
          <p>على Android استخدم زر «تثبيت» عندما يظهر. وعلى iPhone أو iPad: مشاركة ← إضافة إلى الشاشة الرئيسية.</p>
        </div>

        {notice ? <div className="offline-notice">{notice}</div> : null}

        {!items.length ? (
          <div className="empty-state offline-empty">
            <strong>لا توجد ملفات محفوظة بعد.</strong>
            <p>من قائمة ••• بجوار أي ملف صوتي اختر «حفظ دون إنترنت».</p>
          </div>
        ) : (
          <div className="offline-list">
            {items.map((entry) => (
              <article className="offline-row" key={entry.id}>
                <div className="offline-row-art" aria-hidden="true"><span /></div>
                <div className="offline-row-copy">
                  <h2>{entry.title}</h2>
                  <p>{entry.creator}</p>
                  <small>حُفظ {dateFormatter.format(new Date(entry.savedAt))}</small>
                </div>
                <div className="offline-row-actions">
                  <button className="button button-dark button-small" type="button" onClick={() => play(entry)}>تشغيل</button>
                  <button className="button button-ghost button-small" type="button" onClick={() => remove(entry)}>حذف</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
