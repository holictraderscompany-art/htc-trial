# PostgreSQL isolationtester fixture, NOT run by pnpm test. Disposable local
# Supabase database ONLY, with all migrations separately approved/applied.
# Setup commits fixture data; teardown removes it. Never use production.
# READ COMMITTED: transition-first rejects; save-first holds the row lock.
# No optimistic version contract: two valid DRAFT saves are last-writer-wins.
setup
{
  INSERT INTO auth.users(id,email) VALUES
    ('00000000-0000-4000-8000-000000000703','holictraderscompany@gmail.com');
  INSERT INTO public.trial_content(id,category,title,body) VALUES
    ('00000000-0000-4000-8000-000000000713','EDITORIAL','Before','Before');
}
teardown
{
  DELETE FROM public.trial_content WHERE id='00000000-0000-4000-8000-000000000713';
  DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-000000000703';
}
session "save"
setup
{
  SET ROLE authenticated;
  SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000703',false);
}
step "save_begin" { BEGIN ISOLATION LEVEL READ COMMITTED; }
step "save_write"
{
  SELECT public.update_trial_content_draft(jsonb_build_object(
    'id','00000000-0000-4000-8000-000000000713','category','EDITORIAL','title','Edited','body','Edited'))->>'outcome';
}
step "save_commit" { COMMIT; }
step "save_rollback" { ROLLBACK; }
step "released_before"
{
  DO $$ DECLARE result jsonb; BEGIN
    result := public.manage_trial_content(jsonb_build_object('action','read','id','00000000-0000-4000-8000-000000000713'));
    IF result->>'state' IS DISTINCT FROM 'RELEASED' OR result->>'title' IS DISTINCT FROM 'Before' THEN
      RAISE EXCEPTION 'Concurrent rejection/rollback failed';
    END IF;
  END; $$;
}
step "released_edited"
{
  DO $$ DECLARE result jsonb; BEGIN
    result := public.manage_trial_content(jsonb_build_object('action','read','id','00000000-0000-4000-8000-000000000713'));
    IF result->>'state' IS DISTINCT FROM 'RELEASED' OR result->>'title' IS DISTINCT FROM 'Edited' THEN
      RAISE EXCEPTION 'Save-first serialization failed';
    END IF;
  END; $$;
}
step "draft_edited"
{
  DO $$ DECLARE result jsonb; BEGIN
    result := public.manage_trial_content(jsonb_build_object('action','read','id','00000000-0000-4000-8000-000000000713'));
    IF result->>'state' IS DISTINCT FROM 'DRAFT' OR result->>'title' IS DISTINCT FROM 'Edited' THEN
      RAISE EXCEPTION 'Rolled-back transition blocked valid save';
    END IF;
  END; $$;
}
step "draft_other"
{
  DO $$ DECLARE result jsonb; BEGIN
    result := public.manage_trial_content(jsonb_build_object('action','read','id','00000000-0000-4000-8000-000000000713'));
    IF result->>'state' IS DISTINCT FROM 'DRAFT' OR result->>'title' IS DISTINCT FROM 'Other' THEN
      RAISE EXCEPTION 'Concurrent draft saves did not serialize';
    END IF;
  END; $$;
}
session "transition"
setup
{
  SET ROLE authenticated;
  SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000703',false);
}
step "transition_begin" { BEGIN ISOLATION LEVEL READ COMMITTED; }
step "release"
{
  SELECT public.manage_trial_content(jsonb_build_object('action','release','id','00000000-0000-4000-8000-000000000713'))->>'state';
}
step "other_save"
{
  SELECT public.update_trial_content_draft(jsonb_build_object(
    'id','00000000-0000-4000-8000-000000000713','category','EDITORIAL','title','Other','body','Other'))->>'outcome';
}
step "transition_commit" { COMMIT; }
step "transition_rollback" { ROLLBACK; }
# Expected: save_write waits, then not_draft; final RELEASED/Before.
permutation "transition_begin" "release" "save_begin" "save_write" "transition_commit" "save_commit" "released_before"
# Expected: release waits; save reports saved; final RELEASED/Edited.
permutation "save_begin" "save_write" "transition_begin" "release" "save_commit" "transition_commit" "released_edited"
# Expected: save_write waits, then saved after transition rollback; DRAFT/Edited.
permutation "transition_begin" "release" "save_begin" "save_write" "transition_rollback" "save_commit" "draft_edited"
# Expected: release waits until save rollback; final RELEASED/Before.
permutation "save_begin" "save_write" "transition_begin" "release" "save_rollback" "transition_commit" "released_before"
# Expected: other_save waits, then saved; final DRAFT/Other (documented lost-update limit).
permutation "save_begin" "save_write" "transition_begin" "other_save" "save_commit" "transition_commit" "draft_other"
