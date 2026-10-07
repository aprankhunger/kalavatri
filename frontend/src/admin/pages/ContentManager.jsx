import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { FiPlus, FiTrash2, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import adminApi from '../services/adminApi';
import { MigrationNotice, SkeletonRows, errorMessage, useToast } from '../components/AdminUi';

const fetcher = (url) => adminApi.get(url).then((r) => r.data);

const TABS = [
  { key: 'announcement', label: 'Announcement Bar' },
  { key: 'navigation', label: 'Navigation Menu' },
  { key: 'hero', label: 'Homepage Hero' },
  { key: 'homepage', label: 'Homepage Sections' },
  { key: 'footer', label: 'Footer & Contact' },
];

function Field({ id, label, children }) {
  return (
    <div className="admin-form-group">
      <label className="admin-label" htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function AnnouncementEditor({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <>
      <div className="am-preview-bar" style={{ background: value.backgroundColor, color: value.textColor, opacity: value.enabled ? 1 : 0.4 }}>
        {value.text || 'Your announcement text'} {value.linkLabel && <u>{value.linkLabel}</u>}
      </div>
      <label className="am-check"><input type="checkbox" checked={value.enabled} onChange={set('enabled')} /> Show announcement bar</label>
      <Field id="an-text" label="Text">
        <input id="an-text" className="admin-input" maxLength={200} value={value.text} onChange={set('text')} />
      </Field>
      <div className="am-row">
        <Field id="an-ll" label="Link label">
          <input id="an-ll" className="admin-input" maxLength={40} value={value.linkLabel} onChange={set('linkLabel')} />
        </Field>
        <Field id="an-lu" label="Link URL">
          <input id="an-lu" className="admin-input" value={value.linkUrl} onChange={set('linkUrl')} placeholder="/shop" />
        </Field>
      </div>
      <div className="am-row">
        <Field id="an-bg" label="Background colour">
          <input id="an-bg" type="color" className="admin-input" value={value.backgroundColor} onChange={set('backgroundColor')} />
        </Field>
        <Field id="an-tc" label="Text colour">
          <input id="an-tc" type="color" className="admin-input" value={value.textColor} onChange={set('textColor')} />
        </Field>
      </div>
      <label className="am-check"><input type="checkbox" checked={value.dismissible} onChange={set('dismissible')} /> Visitors can dismiss it</label>
    </>
  );
}

function PairListEditor({ items, onChange, fields, max, addLabel, emptyItem }) {
  const update = (i, k, v) => onChange(items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const move = (i, dir) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="am-list-editor">
      {items.map((it, i) => (
        <div key={i} className="am-list-item" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
          {fields.map((f) => (
            <input
              key={f.key}
              className="admin-input"
              aria-label={`${f.label} ${i + 1}`}
              placeholder={f.label}
              value={it[f.key]}
              maxLength={f.max}
              onChange={(e) => update(i, f.key, e.target.value)}
            />
          ))}
          <div className="am-actions" style={{ flexWrap: 'nowrap' }}>
            <button type="button" className="am-icon-btn" onClick={() => move(i, -1)} aria-label="Move up"><FiArrowUp size={14} /></button>
            <button type="button" className="am-icon-btn" onClick={() => move(i, 1)} aria-label="Move down"><FiArrowDown size={14} /></button>
            <button type="button" className="am-icon-btn" onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label="Remove"><FiTrash2 size={14} /></button>
          </div>
        </div>
      ))}
      {items.length < max && (
        <button type="button" className="admin-btn admin-btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...items, { ...emptyItem }])}>
          <FiPlus size={14} /> {addLabel}
        </button>
      )}
    </div>
  );
}

function HeroEditor({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <>
      <Field id="h-title" label="Headline">
        <input id="h-title" className="admin-input" maxLength={120} value={value.title} onChange={set('title')} />
      </Field>
      <Field id="h-sub" label="Subtitle">
        <textarea id="h-sub" className="admin-textarea" rows={3} maxLength={400} value={value.subtitle} onChange={set('subtitle')} />
      </Field>
      <div className="am-row">
        <Field id="h-cl" label="Button label">
          <input id="h-cl" className="admin-input" maxLength={40} value={value.ctaLabel} onChange={set('ctaLabel')} />
        </Field>
        <Field id="h-cu" label="Button link">
          <input id="h-cu" className="admin-input" value={value.ctaUrl} onChange={set('ctaUrl')} placeholder="/shop" />
        </Field>
      </div>
      <Field id="h-img" label="Hero image URL">
        <input id="h-img" className="admin-input" value={value.image} onChange={set('image')} />
      </Field>
      {value.image && <img src={value.image} alt="" style={{ width: 200, height: 120, objectFit: 'cover', borderRadius: 8 }} />}
      <span className="admin-label">Stats (max 4)</span>
      <PairListEditor
        items={value.stats || []}
        onChange={(stats) => onChange({ ...value, stats })}
        fields={[{ key: 'value', label: 'Value', max: 20 }, { key: 'label', label: 'Label', max: 40 }]}
        max={4}
        addLabel="Add stat"
        emptyItem={{ value: '', label: '' }}
      />
    </>
  );
}

function HomepageEditor({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <>
      <div className="am-row">
        <Field id="hp-na" label="New arrivals title"><input id="hp-na" className="admin-input" maxLength={60} value={value.newArrivalsTitle} onChange={set('newArrivalsTitle')} /></Field>
        <Field id="hp-ts" label="Top selling title"><input id="hp-ts" className="admin-input" maxLength={60} value={value.topSellingTitle} onChange={set('topSellingTitle')} /></Field>
      </div>
      <div className="am-row">
        <Field id="hp-ct" label="Categories title"><input id="hp-ct" className="admin-input" maxLength={60} value={value.categoriesTitle} onChange={set('categoriesTitle')} /></Field>
        <Field id="hp-tt" label="Testimonials title"><input id="hp-tt" className="admin-input" maxLength={60} value={value.testimonialsTitle} onChange={set('testimonialsTitle')} /></Field>
      </div>
      <label className="am-check"><input type="checkbox" checked={value.showCategories} onChange={set('showCategories')} /> Show categories section</label>
      <label className="am-check"><input type="checkbox" checked={value.showTestimonials} onChange={set('showTestimonials')} /> Show testimonials section</label>
    </>
  );
}

function FooterEditor({ value, onChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <>
      <Field id="f-desc" label="Brand description">
        <textarea id="f-desc" className="admin-textarea" rows={3} maxLength={400} value={value.description} onChange={set('description')} />
      </Field>
      <div className="am-row">
        <Field id="f-email" label="Contact email"><input id="f-email" type="email" className="admin-input" value={value.contactEmail} onChange={set('contactEmail')} /></Field>
        <Field id="f-phone" label="Contact phone"><input id="f-phone" className="admin-input" maxLength={30} value={value.contactPhone} onChange={set('contactPhone')} /></Field>
      </div>
      <p className="am-muted">Leave a social link empty to hide its icon.</p>
      <div className="am-row">
        <Field id="f-ig" label="Instagram URL"><input id="f-ig" className="admin-input" value={value.instagramUrl} onChange={set('instagramUrl')} /></Field>
        <Field id="f-fb" label="Facebook URL"><input id="f-fb" className="admin-input" value={value.facebookUrl} onChange={set('facebookUrl')} /></Field>
      </div>
      <div className="am-row">
        <Field id="f-tw" label="X / Twitter URL"><input id="f-tw" className="admin-input" value={value.twitterUrl} onChange={set('twitterUrl')} /></Field>
        <Field id="f-yt" label="YouTube URL"><input id="f-yt" className="admin-input" value={value.youtubeUrl} onChange={set('youtubeUrl')} /></Field>
      </div>
    </>
  );
}

export default function ContentManager() {
  const { data, error, isLoading, mutate } = useSWR('/content', fetcher);
  const [tab, setTab] = useState('announcement');
  const [drafts, setDrafts] = useState(null);
  const [saving, setSaving] = useState(false);
  const [migration, setMigration] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (data && !drafts) setDrafts(data);
  }, [data, drafts]);

  const value = drafts?.[tab];
  const setValue = (v) => setDrafts((d) => ({ ...d, [tab]: v }));
  const dirty = drafts && data && JSON.stringify(drafts[tab]) !== JSON.stringify(data[tab]);

  const save = async () => {
    setSaving(true);
    try {
      const { data: res } = await adminApi.put(`/content/${tab}`, drafts[tab]);
      await mutate({ ...data, [tab]: res.value }, { revalidate: false });
      setDrafts((d) => ({ ...d, [tab]: res.value }));
      setMigration('');
      toast.show('Saved — changes are live on the storefront');
    } catch (err) {
      if (err?.response?.data?.code === 'MIGRATION_REQUIRED') setMigration(errorMessage(err));
      toast.show(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="am-page">
      <div className="am-header">
        <div>
          <h1 className="am-title">Content & Banners</h1>
          <p className="am-subtitle">Edit the announcement bar, top navigation, homepage and footer.</p>
        </div>
        <div className="am-actions">
          <button type="button" className="admin-btn admin-btn-secondary" disabled={!dirty || saving} onClick={() => setDrafts((d) => ({ ...d, [tab]: data[tab] }))}>Discard</button>
          <button type="button" className="admin-btn admin-btn-gold" disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>

      <MigrationNotice message={migration} />
      {error && <div className="admin-alert admin-alert-danger">{errorMessage(error)}</div>}

      <div className="am-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`am-tab ${tab === t.key ? 'am-tab-active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-card" key={tab} style={{ display: 'grid', gap: 14, animation: 'adminFadeUp 0.3s ease both' }}>
        {isLoading || !value ? (
          <SkeletonRows count={4} />
        ) : tab === 'announcement' ? (
          <AnnouncementEditor value={value} onChange={setValue} />
        ) : tab === 'navigation' ? (
          <>
            <p className="am-muted">Links shown in the top navigation bar (max 8). Use paths like /shop?category=bridal or full URLs.</p>
            <PairListEditor
              items={value.links || []}
              onChange={(links) => setValue({ ...value, links })}
              fields={[{ key: 'label', label: 'Label', max: 40 }, { key: 'url', label: 'URL', max: 500 }]}
              max={8}
              addLabel="Add link"
              emptyItem={{ label: '', url: '' }}
            />
          </>
        ) : tab === 'hero' ? (
          <HeroEditor value={value} onChange={setValue} />
        ) : tab === 'homepage' ? (
          <HomepageEditor value={value} onChange={setValue} />
        ) : (
          <FooterEditor value={value} onChange={setValue} />
        )}
      </div>
      {toast.node}
    </div>
  );
}
