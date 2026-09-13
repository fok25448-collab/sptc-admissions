-- Run once in Supabase SQL Editor. Safe to re-run. Dedicated project recommended.
begin;
create table if not exists public.site_settings (
 id integer primary key check(id=1), admission_year integer not null check(admission_year between 2500 and 2700), admissions_open boolean not null default false
);
insert into public.site_settings(id,admission_year,admissions_open) values(1,2569,false) on conflict do nothing;
create table if not exists public.courses (
 id text primary key, name text not null, level text not null check(level in ('ปวช.','ปวส.','ปริญญาตรี')),
 system text not null check(system in ('ระบบปกติ','ระบบทวิภาคี')), category text not null,
 description text not null default '', quota integer not null default 0 check(quota>=0), image text,
 duration text, tuition text, jobs text, positions jsonb not null default '[]',
 published boolean not null default false, accepting_applications boolean not null default false,
 sort_order integer not null default 0
);
create sequence if not exists public.application_number_seq;
create table if not exists public.applications (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 application_number text not null unique, admission_year integer not null,
 id_card text not null check(id_card ~ '^[0-9]{13}$'), course_id text not null references public.courses(id),
 payload jsonb not null, payload_hash text not null,
 course_snapshot jsonb not null,
 document_path text not null unique, document_name text not null, document_sha256 text not null,
 status text not null default 'pending' check(status in ('pending','accepted','rejected','cancelled')),
 created_at timestamptz not null default now(), unique(admission_year,id_card)
);
create index if not exists applications_course_year on public.applications(course_id,admission_year);
create table if not exists public.contact_messages (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 payload_hash text not null, name text not null, email text not null, phone text not null default '',
 subject text not null, message text not null, status text not null default 'new', created_at timestamptz not null default now()
);
create table if not exists public.api_rate_limits (
 key text primary key, window_start timestamptz not null, count integer not null
);
alter table public.site_settings enable row level security;
alter table public.courses enable row level security;
alter table public.applications enable row level security;
alter table public.contact_messages enable row level security;
alter table public.api_rate_limits enable row level security;
-- Browsers only access the same-origin Vercel APIs; no public database access.
revoke all on public.site_settings,public.courses,public.applications,public.contact_messages,public.api_rate_limits from anon,authenticated;
grant all on public.site_settings,public.courses,public.applications,public.contact_messages,public.api_rate_limits to service_role;
grant usage,select on sequence public.application_number_seq to service_role;

create or replace function public.consume_rate_limit(p_key text,p_limit integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; t timestamptz:=date_trunc('minute',clock_timestamp());
begin
 insert into public.api_rate_limits(key,window_start,count) values(p_key,t,1)
 on conflict(key) do update set window_start=t, count=case when public.api_rate_limits.window_start=t then public.api_rate_limits.count+1 else 1 end
 returning count into n;
 return n<=p_limit;
end $$;

create or replace function public.submit_application(p_request_id uuid,p_payload_hash text,p_data jsonb,p_year integer,p_document_path text,p_document_name text,p_document_sha256 text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.applications; c public.courses; s public.site_settings; number text;
begin
 -- Serialize retries of the same logical request, including simultaneous finalizations.
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into a from public.applications where request_id=p_request_id;
 if found then
  if a.payload_hash<>p_payload_hash then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('application_number',a.application_number);
 end if;
 select * into s from public.site_settings where id=1 for share;
 if s.id is null or not s.admissions_open or s.admission_year<>p_year then raise exception 'ADMISSIONS_CLOSED'; end if;
 select * into c from public.courses where id=p_data->>'courseId' for update;
 if c.id is null or not c.published or not c.accepting_applications then raise exception 'COURSE_CLOSED'; end if;
 if (select count(*) from public.applications where course_id=c.id and admission_year=p_year and status not in ('rejected','cancelled'))>=c.quota then raise exception 'COURSE_FULL';end if;
 if (p_data->>'terms') is distinct from 'true' then raise exception 'CONSENT_REQUIRED';end if;
 number:='SPTC-'||p_year::text||'-'||lpad(nextval('public.application_number_seq')::text,8,'0');
 insert into public.applications(request_id,application_number,admission_year,id_card,course_id,payload,payload_hash,course_snapshot,document_path,document_name,document_sha256)
 values(p_request_id,number,p_year,p_data->>'idCard',c.id,p_data,p_payload_hash,to_jsonb(c),p_document_path,p_document_name,p_document_sha256);
 return jsonb_build_object('application_number',number);
end $$;

create or replace function public.submit_contact(p_request_id uuid,p_hash text,p_data jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare old_hash text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,1));
 select payload_hash into old_hash from public.contact_messages where request_id=p_request_id;
 if found then
  if old_hash<>p_hash then raise exception 'IDEMPOTENCY_CONFLICT';end if;
  return true;
 end if;
 insert into public.contact_messages(request_id,payload_hash,name,email,phone,subject,message)
 values(p_request_id,p_hash,p_data->>'name',p_data->>'email',p_data->>'phone',p_data->>'subject',p_data->>'message');
 return true;
end $$;
revoke all on function public.consume_rate_limit(text,integer) from public,anon,authenticated;
revoke all on function public.submit_application(uuid,text,jsonb,integer,text,text,text) from public,anon,authenticated;
revoke all on function public.submit_contact(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer) to service_role;
grant execute on function public.submit_application(uuid,text,jsonb,integer,text,text,text) to service_role;
grant execute on function public.submit_contact(uuid,text,jsonb) to service_role;
-- Private files. Only the server can sign a staging upload or read final documents.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('admission-documents','admission-documents',false,5242880,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
commit;
