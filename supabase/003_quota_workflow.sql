-- Upgrade after 001_schema.sql and 002_courses.sql. Preserves existing applications.
begin;
alter table public.courses drop constraint if exists courses_system_check;
alter table public.courses add constraint courses_system_check check(system in ('ระบบปกติ','ระบบทวิภาคี','ระบบสมทบ'));
alter table public.courses add column if not exists min_gpa numeric(3,2) not null default 2.00 check(min_gpa between 0 and 4);
update public.courses set min_gpa=2.50 where level='ปวส.' and name in ('ไฟฟ้า','เทคนิคไฟฟ้า');
alter table public.site_settings add column if not exists quota_schedule jsonb not null default '{"selection":"18 ธันวาคม 2569","reporting":"21–25 ธันวาคม 2569","enrollment":"30 เมษายน 2570"}';
-- New installations use the academic year explicitly shown on the supplied forms.
update public.site_settings set admission_year=2570 where id=1 and admission_year=2569 and not exists(select 1 from public.applications);
create table if not exists public.admin_users (
 user_id uuid primary key, display_name text not null, active boolean not null default true, created_at timestamptz not null default now()
);
-- user_id must be an existing Supabase Auth user UUID. No public self-enrollment.
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon,authenticated;
grant all on public.admin_users to service_role;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check check(status in ('pending','under_review','needs_documents','accepted','rejected','reported','cancelled'));
alter table public.applications alter column document_path drop not null;
alter table public.applications alter column document_name drop not null;
alter table public.applications alter column document_sha256 drop not null;
alter table public.applications add column if not exists form_version integer not null default 1;
alter table public.applications add column if not exists submission_channel text not null default 'online' check(submission_channel in ('online','in_person'));
alter table public.applications add column if not exists documents_checked jsonb not null default '{"portrait":false,"transcript":false,"house_registration":false,"id_card":false}';
alter table public.applications add column if not exists public_note text not null default '';
alter table public.applications add column if not exists next_step text not null default '';
alter table public.applications add column if not exists status_version integer not null default 0;
alter table public.applications add column if not exists reviewed_by uuid references public.admin_users(user_id);
alter table public.applications add column if not exists updated_at timestamptz not null default now();
alter table public.applications add column if not exists schedule_snapshot jsonb;
create index if not exists applications_status_created on public.applications(status,created_at desc);
create index if not exists applications_lookup on public.applications(id_card,((payload->>'phone')));
create table if not exists public.application_documents (
 application_id uuid not null references public.applications(id) on delete cascade,
 kind text not null check(kind in ('portrait','transcript','house_registration','id_card')),
 path text not null unique, name text not null, mime_type text not null, size_bytes integer not null, sha256 text not null,
 created_at timestamptz not null default now(), primary key(application_id,kind)
);
create table if not exists public.application_reviews (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 application_id uuid not null references public.applications(id), actor_id uuid not null references public.admin_users(user_id),
 from_status text not null,to_status text not null, public_note text not null default '',next_step text not null default '',
 documents_checked jsonb not null,created_at timestamptz not null default now(),request_hash text not null
);
alter table public.application_documents enable row level security;
alter table public.application_reviews enable row level security;
revoke all on public.application_documents,public.application_reviews from anon,authenticated;
grant all on public.application_documents,public.application_reviews to service_role;

create or replace function public.submit_quota_application(p_request_id uuid,p_payload_hash text,p_data jsonb,p_year integer,p_files jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.applications; c public.courses; s public.site_settings; n text; doc jsonb; initial_status text; required_kind text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into a from public.applications where request_id=p_request_id;
 if found then
  if a.payload_hash<>p_payload_hash then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return jsonb_build_object('id',a.id,'application_number',a.application_number);
 end if;
 select * into s from public.site_settings where id=1 for share;
 if s.id is null or not s.admissions_open or s.admission_year<>p_year then raise exception 'ADMISSIONS_CLOSED';end if;
 select * into c from public.courses where id=p_data->>'courseId' for update;
 if c.id is null or not c.published or not c.accepting_applications or c.level not in ('ปวช.','ปวส.') then raise exception 'COURSE_CLOSED';end if;
 if (p_data->>'terms') is distinct from 'true' or (p_data->>'formVersion') is distinct from '2' then raise exception 'INVALID_FORM';end if;
 if (p_data->>'submissionChannel') not in ('online','in_person') then raise exception 'INVALID_CHANNEL';end if;
 if (p_data->>'gpa')::numeric<c.min_gpa then raise exception 'GPA_TOO_LOW';end if;
 if (c.level='ปวช.' and p_data->>'educationLevel'<>'ม.3') or (c.level='ปวส.' and p_data->>'educationLevel' not in ('ม.6','ปวช.')) then raise exception 'INVALID_EDUCATION';end if;
 if jsonb_typeof(p_files)<>'array' then raise exception 'INVALID_FILES';end if;
 foreach required_kind in array case when p_data->>'submissionChannel'='online' then array['portrait','transcript','house_registration','id_card'] else array['portrait'] end loop
  if not exists(select 1 from jsonb_array_elements(p_files) f where f->>'kind'=required_kind) then raise exception 'DOCUMENT_REQUIRED';end if;
 end loop;
 if (select count(*) from public.applications where course_id=c.id and admission_year=p_year and status not in ('rejected','cancelled'))>=c.quota then raise exception 'COURSE_FULL';end if;
 initial_status:=case when p_data->>'submissionChannel'='in_person' then 'needs_documents' else 'pending' end;
 n:='SPTC-'||p_year::text||'-'||lpad(nextval('public.application_number_seq')::text,8,'0');
 insert into public.applications(request_id,application_number,admission_year,id_card,course_id,payload,payload_hash,course_snapshot,status,form_version,submission_channel,schedule_snapshot)
 values(p_request_id,n,p_year,p_data->>'idCard',c.id,p_data,p_payload_hash,to_jsonb(c),initial_status,2,p_data->>'submissionChannel',s.quota_schedule) returning * into a;
 for doc in select value from jsonb_array_elements(p_files) loop
  insert into public.application_documents(application_id,kind,path,name,mime_type,size_bytes,sha256)
  values(a.id,doc->>'kind',doc->>'path',doc->>'name',doc->>'type',(doc->>'size')::integer,doc->>'sha256');
 end loop;
 return jsonb_build_object('id',a.id,'application_number',n);
end $$;

create or replace function public.review_quota_application(p_request_id uuid,p_actor uuid,p_application uuid,p_expected_version integer,p_status text,p_note text,p_next_step text,p_checks jsonb,p_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.applications; c public.courses; prior public.application_reviews; k text;
begin
 if not exists(select 1 from public.admin_users where user_id=p_actor and active) then raise exception 'ADMIN_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,2));
 select * into prior from public.application_reviews where request_id=p_request_id;
 if found then
  if prior.actor_id<>p_actor or prior.application_id<>p_application or prior.request_hash<>p_hash then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return jsonb_build_object('saved',true);
 end if;
 -- All writes that affect capacity lock the course before the application.
 select * into c from public.courses where id=(select course_id from public.applications where id=p_application) for update;
 select * into a from public.applications where id=p_application for update;
 if a.id is null then raise exception 'NOT_FOUND';end if;
 if a.status_version<>p_expected_version then raise exception 'STALE_VERSION';end if;
 if p_status not in ('pending','under_review','needs_documents','accepted','rejected','reported','cancelled') then raise exception 'INVALID_STATUS';end if;
 if p_status='reported' and a.status not in ('accepted','reported') then raise exception 'APPROVAL_REQUIRED';end if;
 if p_status in ('accepted','reported') then
  foreach k in array array['portrait','transcript','house_registration','id_card'] loop
   if p_checks->>k is distinct from 'true' then raise exception 'CHECK_DOCUMENTS_FIRST';end if;
  end loop;
 end if;
 if p_status in ('needs_documents','rejected','cancelled') and length(trim(p_note))=0 then raise exception 'NOTE_REQUIRED';end if;
 if a.status in ('rejected','cancelled') and p_status not in ('rejected','cancelled') and
  (select count(*) from public.applications where course_id=a.course_id and admission_year=a.admission_year and status not in ('rejected','cancelled'))>=c.quota then raise exception 'COURSE_FULL';end if;
 update public.applications set status=p_status,public_note=p_note,next_step=p_next_step,documents_checked=p_checks,status_version=status_version+1,reviewed_by=p_actor,updated_at=now() where id=a.id;
 insert into public.application_reviews(request_id,application_id,actor_id,from_status,to_status,public_note,next_step,documents_checked,request_hash)
 values(p_request_id,a.id,p_actor,a.status,p_status,p_note,p_next_step,p_checks,p_hash);
 return jsonb_build_object('saved',true);
end $$;
revoke all on function public.submit_quota_application(uuid,text,jsonb,integer,jsonb) from public,anon,authenticated;
revoke all on function public.review_quota_application(uuid,uuid,uuid,integer,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.submit_quota_application(uuid,text,jsonb,integer,jsonb) to service_role;
grant execute on function public.review_quota_application(uuid,uuid,uuid,integer,text,text,text,jsonb,text) to service_role;
-- Disable the old submit RPC; v2 is the only public website submission pipeline.
revoke execute on function public.submit_application(uuid,text,jsonb,integer,text,text,text) from service_role;
commit;
