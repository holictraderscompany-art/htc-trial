// Test/development adapter only. Never imported by application routes.
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { validateContentRequest } from '../src/server/content-release.js';

export const fixtureEnv = Object.freeze({
  SUPABASE_URL: 'https://vzkbcgfywyhtvprxpwfb.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_fixture_only',
}); // Routing identifier required by unchanged Foundation; never contacted.
const stamp = () => new Date().toISOString();
export function createLocalSqlite({ mode, filename = ':memory:' } = {}) {
  if (mode !== 'sqlite') throw Error('Explicit sqlite fixture mode required');
  if (filename !== ':memory:' && existsSync(filename)) throw Error('Refusing existing database');
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=100;
    CREATE TABLE content(id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)));
    CREATE TABLE assets(id TEXT PRIMARY KEY, status TEXT NOT NULL CHECK(status IN ('PENDING','READY','DELETING')),
      mime_type TEXT NOT NULL, object_matches INTEGER NOT NULL CHECK(object_matches IN (0,1)), data TEXT NOT NULL CHECK(json_valid(data)));
    CREATE TABLE relations(id TEXT PRIMARY KEY, content_id TEXT NOT NULL REFERENCES content(id) ON DELETE RESTRICT,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
      role TEXT NOT NULL CHECK(role IN ('PRIMARY','THUMBNAIL','ATTACHMENT')), created_at TEXT NOT NULL,
      UNIQUE(content_id,asset_id));
    CREATE UNIQUE INDEX one_primary ON relations(content_id) WHERE role='PRIMARY';
    CREATE UNIQUE INDEX one_thumbnail ON relations(content_id) WHERE role='THUMBNAIL';
    CREATE TRIGGER linked_asset_guard BEFORE UPDATE OF status ON assets
      WHEN NEW.status<>'READY' AND EXISTS(SELECT 1 FROM relations WHERE asset_id=OLD.id)
      BEGIN SELECT RAISE(ABORT,'Detach linked fixture asset first'); END;
  `);
  let failure;
  const read = id => {
    const row = db.prepare('SELECT data FROM content WHERE id=?').get(id);
    return row ? JSON.parse(row.data) : null;
  };
  const save = row => db.prepare('INSERT INTO content VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data')
    .run(row.id, JSON.stringify(row));
  function transaction(operation) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      if (failure === 'rollback') { failure = undefined; throw Error('Synthetic rollback fault'); }
      db.exec('COMMIT');
      return result;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function manage(payload, draftOnly = false) {
    const p = structuredClone(payload);
    if (draftOnly) {
      if (Object.hasOwn(p, 'action')) throw Error('Forbidden draft field');
      p.action = 'update';
    }
    validateContentRequest(p);
    return transaction(() => {
      if (p.action === 'create') {
        const row = { id: randomUUID(), category: p.category, title: p.title, body: p.body,
          state: 'DRAFT', created_at: stamp(), updated_at: stamp(), released_at: null };
        save(row); return row;
      }
      const row = read(p.id);
      if (!row) return draftOnly ? { outcome: 'not_found' } : null;
      if (p.action === 'update') {
        if (draftOnly && row.state !== 'DRAFT') return { outcome: 'not_draft' };
        Object.assign(row, { category: p.category, title: p.title, body: p.body,
          state: 'DRAFT', released_at: null, updated_at: stamp() });
      } else if (p.action === 'release') {
        if (row.state === 'RELEASED') throw Error('Invalid release');
        Object.assign(row, { state: 'RELEASED', released_at: stamp(), updated_at: stamp() });
      } else if (p.action === 'withdraw') {
        if (row.state !== 'RELEASED') throw Error('Invalid withdrawal');
        Object.assign(row, { state: 'WITHDRAWN', updated_at: stamp() });
      }
      save(row); return draftOnly ? { outcome: 'saved', content: row } : row;
    });
  }
  function relate(p, draftOnly = false) {
    const keys = { attach: ['action','content_id','asset_id','role'], detach: ['action','content_id','asset_id'], list: ['action','content_id'] };
    if (!keys[p?.action] || Object.keys(p).length !== keys[p.action].length || keys[p.action].some(k => typeof p[k] !== 'string')) throw Error('Invalid relation');
    return transaction(() => {
      const row = read(p.content_id);
      if (!row) return draftOnly ? {outcome:'not_found'} : null;
      if (draftOnly && row.state!=='DRAFT')return {outcome:'not_draft'};
      if (p.action === 'list') return { content_id: p.content_id, relations: db.prepare('SELECT * FROM relations WHERE content_id=? ORDER BY role,created_at,id').all(p.content_id) };
      const asset = db.prepare('SELECT * FROM assets WHERE id=?').get(p.asset_id);
      if (!asset) return draftOnly ? {outcome:'not_found'} : null;
      let result;
      if (p.action === 'attach') {
        if (asset.status !== 'READY' || asset.object_matches !== 1 || (p.role === 'THUMBNAIL' && !asset.mime_type.startsWith('image/'))) {
          if(draftOnly)return {outcome:'asset_not_ready'};
          throw Error('Fixture asset cannot attach');
        }
        if(draftOnly && db.prepare('SELECT id FROM relations WHERE content_id=? AND (asset_id=? OR (role=? AND role IN (\'PRIMARY\',\'THUMBNAIL\')))').get(row.id,asset.id,p.role))return {outcome:'relation_conflict'};
        result = { id: randomUUID(), content_id: row.id, asset_id: asset.id, role: p.role, created_at: stamp() };
        db.prepare('INSERT INTO relations VALUES (?,?,?,?,?)').run(...Object.values(result));
      } else {
        result = db.prepare('SELECT * FROM relations WHERE content_id=? AND asset_id=?').get(row.id,asset.id);
        if (!result) return draftOnly?{outcome:'not_found'}:null;
        db.prepare('DELETE FROM relations WHERE id=?').run(result.id);
      }
      // Existing T07B contract: relation edits reset content to DRAFT, even if released.
      Object.assign(row, { state: 'DRAFT', released_at: null, updated_at: stamp() }); save(row);
      return draftOnly ? {outcome:'saved',relation:result} : result;
    });
  }
  const released = id => db.prepare('SELECT data FROM content ORDER BY json_extract(data,\'$.created_at\') DESC,id').all()
    .map(r => JSON.parse(r.data)).filter(r => r.state === 'RELEASED' && (!id || r.id === id)).slice(0,100);
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.origin !== fixtureEnv.SUPABASE_URL) throw Error('Local fixture blocks external transport');
    const token = options.headers?.Authorization;
    if (url.pathname === '/auth/v1/user') return ['Bearer synthetic-founder','Bearer synthetic-user'].includes(token)
      ? Response.json({ id: '00000000-0000-4000-8000-000000000001', is_anonymous: false })
      : Response.json({}, { status: 401 });
    if (url.pathname === '/rest/v1/rpc/is_founder') return Response.json(token === 'Bearer synthetic-founder');
    const args = JSON.parse(options.body ?? '{}');
    if (url.pathname === '/rest/v1/rpc/read_released_content') return Response.json(released(args.content_id).map(({id,category,title,body}) => ({id,category,title,body})));
    if (url.pathname === '/rest/v1/rpc/read_released_content_page') {
      if(!Number.isInteger(args.page_size)||args.page_size<1||args.page_size>100)throw Error('Invalid page');
      const rows=db.prepare(`SELECT data FROM content WHERE json_extract(data,'$.state')='RELEASED'
        AND (? IS NULL OR json_extract(data,'$.category')=?)
        AND (? IS NULL OR julianday(json_extract(data,'$.created_at'))<julianday(?) OR
          (julianday(json_extract(data,'$.created_at'))=julianday(?) AND id>?))
        ORDER BY julianday(json_extract(data,'$.created_at')) DESC,id LIMIT ?`)
        .all(args.category_filter,args.category_filter,args.after_created_at,args.after_created_at,args.after_created_at,args.after_id,args.page_size+1).map(r=>JSON.parse(r.data));
      const items=rows.slice(0,args.page_size),last=items.at(-1);
      return Response.json({items:items.map(({id,category,title,body})=>({id,category,title,body})),next_position:rows.length>args.page_size?{id:last.id,created_at:last.created_at}:null});
    }
    if (url.pathname === '/rest/v1/rpc/read_released_content_assets') return Response.json(released().filter(c => args.content_ids?.includes(c.id)).map(c => ({content_id:c.id,assets:db.prepare(`SELECT a.id,r.role,a.mime_type FROM relations r JOIN assets a ON a.id=r.asset_id WHERE r.content_id=? AND a.status='READY' AND a.object_matches=1 ORDER BY r.role,r.created_at,r.id`).all(c.id).map(a => ({...a,width:null,height:null,duration_seconds:null}))})));
    if (token !== 'Bearer synthetic-founder') return Response.json({}, { status: 403 });
    let result;
    if (url.pathname === '/rest/v1/rpc/list_trial_content_for_founder') result = db.prepare('SELECT data FROM content WHERE id>? ORDER BY id LIMIT 51').all(args.after_id ?? '').map(r => JSON.parse(r.data));
    else if (url.pathname === '/rest/v1/rpc/manage_trial_content') result = manage(args.payload);
    else if (url.pathname === '/rest/v1/rpc/update_trial_content_draft') result = manage(args.payload, true);
    else if (url.pathname === '/rest/v1/rpc/manage_trial_content_asset') result = relate(args.payload);
    else if (url.pathname === '/rest/v1/rpc/manage_trial_content_asset_draft') result = relate(args.payload,true);
    else if (url.pathname === '/rest/v1/rpc/read_trial_assets_for_founder') result = {source:'LOCAL_SQLITE_FIXTURE',items:db.prepare('SELECT * FROM assets WHERE id>? AND (? IS NULL OR id=?) ORDER BY id LIMIT 51').all(args.after_id??'',args.asset_id,args.asset_id).map(a=>({...JSON.parse(a.data),id:a.id,status:a.status,mime_type:a.mime_type}))};
    else if (url.pathname === '/rest/v1/rpc/delete_trial_asset_for_founder') result=transaction(()=>{
      const id=args.payload?.id;
      if(args.payload?.action!=='delete_asset')throw Error('Invalid delete');
      if(!db.prepare('SELECT id FROM assets WHERE id=?').get(id))return {outcome:'not_found'};
      if(db.prepare('SELECT id FROM relations WHERE asset_id=?').get(id))return {outcome:'linked_asset'};
      db.prepare('DELETE FROM assets WHERE id=?').run(id);return {outcome:'saved',id,deleted:true};
    });
    else throw Error('Unsupported local RPC/storage: no fallback');
    const mutation = ['create','update','release','withdraw','attach','detach','delete_asset'].includes(args.payload?.action) || url.pathname.endsWith('/update_trial_content_draft');
    if (failure === 'after-commit' && mutation) { failure = undefined; throw Error('Synthetic ambiguous response after commit'); }
    return Response.json(result);
  };
  return {
    env: fixtureEnv, fetchImpl, close: () => db.close(),
    fixture: {
      clear: ()=>transaction(()=>{db.exec('DELETE FROM relations; DELETE FROM content; DELETE FROM assets;');}),
      seedContent: row => { validateContentRequest({action:'create',category:row.category,title:row.title,body:row.body}); save(row); },
      asset: (id, status = 'READY', mime = 'image/png', objectMatches = true) => {
        const type=mime.startsWith('image/')?'IMAGE':mime.startsWith('video/')?'VIDEO':mime.startsWith('audio/')?'AUDIO':'DOCUMENT';
        const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','video/mp4':'mp4','audio/mpeg':'mp3','application/pdf':'pdf'}[mime];
        if(!ext)throw Error('Unsupported fixture MIME');
        return db.prepare('INSERT INTO assets VALUES (?,?,?,?,?)').run(id,status,mime,Number(objectMatches),JSON.stringify({asset_type:type,byte_size:256,original_filename:`synthetic.${ext}`}));
      },
      objectMatch: (id,value)=>db.prepare('UPDATE assets SET object_matches=? WHERE id=?').run(Number(value),id),
      updateAsset: (id,status) => db.prepare('UPDATE assets SET status=? WHERE id=?').run(status,id),
      deleteAsset: id => db.prepare('DELETE FROM assets WHERE id=?').run(id),
      readAsset: id => db.prepare('SELECT * FROM assets WHERE id=?').get(id),
      failNextWrite: type => { if (!['rollback','after-commit'].includes(type)) throw Error('Unknown fault'); failure = type; },
      counts: () => ({ content: db.prepare('SELECT count(*) n FROM content').get().n, assets: db.prepare('SELECT count(*) n FROM assets').get().n, relations: db.prepare('SELECT count(*) n FROM relations').get().n }),
    },
  };
}
