'use client';

import { createElement as h, useEffect, useRef, useState } from 'react';

// Public presentation choices only. All validation/authorization remains server-side.
const categories = ['INTRODUCTION', 'INFORMATION', 'EDITORIAL', 'DISCOVERY', 'FUTURE_JOURNEY', 'VALIDATION'];
const blank = { category: 'INFORMATION', title: '', body: '' };

export default function FounderContentWorkspace() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState('Loading content…');
  const mounted = useRef(false);
  const pending = useRef(false);

  async function request(payload) {
    const response = await fetch('/api/founder/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      body: JSON.stringify(payload), signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) {
      if ([401, 403].includes(response.status)) {
        setItems([]); setSelected(null); setEditing(false); setBlocked(true);
      }
      const error = Error(response.status === 400 ? 'Check the category, title and body, then try again.' :
        response.status === 401 ? 'Your session has expired. Sign in again.' :
        response.status === 403 ? 'Access denied.' : response.status === 409 ?
        'This content is read-only. Reload its current state.' : 'Request could not be completed. Reload before trying again.');
      error.status = response.status;
      throw error;
    }
    return result.data;
  }
  async function run(operation, mutation = false) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage('Working…');
    try { await operation(); }
    catch (error) {
      setMessage(error.status === 400 || error.message.startsWith('Your session') || error.message === 'Access denied.' ||
        error.message.startsWith('This content') ? error.message :
        mutation ? 'Save result could not be confirmed. Reload before trying again.' : 'Content is unavailable. Try reloading.');
      if (mutation && error.status !== 400) setBlocked(true);
    } finally { pending.current = false; setBusy(false); }
  }
  async function list(after = null) {
    const data = await request({ action: 'list', cursor: after });
    setItems(previous => after === null ? data.items : [...previous, ...data.items]);
    setCursor(data.next_cursor);
  }
  async function reload() {
    await list(); setSelected(null); setEditing(false); setBlocked(false); setMessage('Content loaded.');
  }
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; void run(reload); }
  }, []);
  function newDraft() {
    setSelected(null); setForm(blank); setEditing(true); setMessage('New draft.');
  }
  function open(id) {
    void run(async () => {
      const row = await request({ action: 'read', id });
      setSelected(row); setForm({ category: row.category, title: row.title, body: row.body });
      setEditing(true); setMessage(row.state === 'DRAFT' ? 'Draft opened.' : 'This content is read-only.');
    });
  }
  function save(event) {
    event.preventDefault();
    if (blocked || (selected && selected.state !== 'DRAFT')) return;
    void run(async () => {
      const row = await request({ action: selected ? 'update' : 'create', ...(selected ? { id: selected.id } : {}), ...form });
      setSelected(row); setForm({ category: row.category, title: row.title, body: row.body });
      setMessage('Draft saved.');
      await list();
      setMessage('Draft saved.');
    }, true);
  }
  const readOnly = blocked || Boolean(selected && selected.state !== 'DRAFT');
  const field = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  return h('section', { className: 'founder-content', 'aria-busy': busy },
    h('h1', null, 'Content workspace'),
    h('p', null, 'Create and edit drafts. Released and withdrawn content is read-only.'),
    h('p', { role: 'status', 'aria-live': 'polite' }, message),
    h('p', null, h('a', { href: '/sign-in' }, 'Sign in'), ' · ', h('a', { href: '/founder' }, 'Founder home')),
    h('div', { className: 'workspace-actions' },
      h('button', { type: 'button', className: 'button secondary', disabled: busy, onClick: () => void run(reload) }, 'Reload content'),
      h('button', { type: 'button', className: 'button', disabled: busy || blocked, onClick: newDraft }, 'New draft')),
    h('ul', { className: 'content-list' }, ...items.map(row => h('li', { key: row.id },
      h('button', { type: 'button', className: 'text-button', disabled: busy || blocked, onClick: () => open(row.id) }, row.title),
      h('p', { className: 'muted' }, `${row.category} · ${row.state}`)))),
    !busy && items.length === 0 && h('p', null, 'No content loaded.'),
    cursor && h('button', { type: 'button', className: 'button secondary', disabled: busy || blocked,
      onClick: () => void run(async () => { await list(cursor); setMessage('More content loaded.'); }) }, 'Load more'),
    editing && h('form', { onSubmit: save, className: 'workspace-form' },
      h('h2', null, selected ? selected.title : 'New draft'),
      selected && h('p', { className: 'muted' }, `State: ${selected.state} · Updated: ${selected.updated_at}`),
      h('fieldset', { disabled: busy || readOnly },
        h('legend', null, 'Draft content'),
        h('label', { htmlFor: 'draft-category' }, 'Category'),
        h('select', { id: 'draft-category', value: form.category, onChange: e => field('category', e.target.value) },
          ...categories.map(value => h('option', { key: value, value }, value))),
        h('label', { htmlFor: 'draft-title' }, 'Title'),
        h('input', { id: 'draft-title', value: form.title, required: true, maxLength: 200, onChange: e => field('title', e.target.value) }),
        h('label', { htmlFor: 'draft-body' }, 'Body (plain text)'),
        h('textarea', { id: 'draft-body', value: form.body, required: true, maxLength: 8000, rows: 12, onChange: e => field('body', e.target.value) })),
      !readOnly && h('button', { type: 'submit', className: 'button', disabled: busy }, 'Save draft'),
      readOnly && h('p', { className: 'notice' }, 'Saving is unavailable. Reload to verify current access and content state.')));
}
