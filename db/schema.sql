-- AI Creator Camp 会員システム（schema: camp）
create extension if not exists pgcrypto;
create schema if not exists camp;

create table if not exists camp.settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists camp.members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  plan text not null default 'tool' check (plan in ('tool','school_a','school_b')),
  is_student boolean not null default false,
  student_status text not null default 'none' check (student_status in ('none','pending','approved','rejected')),
  status text not null default 'active' check (status in ('active','past_due','canceled')),
  track text not null default 'core',
  current_stage int not null default 1,
  core_completed boolean not null default false,
  line_user_id text unique,
  line_link_code text unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  school_invoices_paid int not null default 0,
  continuation boolean not null default false,
  referrer text not null default '',
  notes text not null default '',
  joined_at timestamptz not null default now()
);

create table if not exists camp.login_codes (
  id bigserial primary key,
  email text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists login_codes_email_idx on camp.login_codes(email, created_at desc);

create table if not exists camp.stages (
  id serial primary key,
  track text not null default 'core',
  no int not null,
  month int not null default 0,
  title text not null,
  body text not null default '',
  task text not null default '',
  rubric text not null default '',
  unique (track, no)
);

create table if not exists camp.submissions (
  id bigserial primary key,
  member_id uuid not null references camp.members(id) on delete cascade,
  track text not null,
  stage_no int not null,
  content text not null default '',
  has_image boolean not null default false,
  verdict text not null default 'pending' check (verdict in ('pass','retry','pending')),
  feedback text not null default '',
  score int,
  by_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists submissions_member_idx on camp.submissions(member_id, created_at desc);

create table if not exists camp.messages (
  id bigserial primary key,
  member_id uuid references camp.members(id) on delete cascade,
  line_user_id text,
  role text not null check (role in ('user','assistant','admin','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_line_idx on camp.messages(line_user_id, created_at desc);

create table if not exists camp.tickets (
  id bigserial primary key,
  member_id uuid references camp.members(id) on delete cascade,
  line_user_id text,
  kind text not null default 'question',
  content text not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create table if not exists camp.events (
  id bigserial primary key,
  title text not null,
  starts_at timestamptz not null,
  place text not null default '',
  url text not null default '',
  description text not null default '',
  reminded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists camp.rsvps (
  event_id bigint not null references camp.events(id) on delete cascade,
  member_id uuid not null references camp.members(id) on delete cascade,
  status text not null default 'yes',
  primary key (event_id, member_id)
);

create table if not exists camp.line_state (
  line_user_id text primary key,
  mode text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists camp.purchases (
  id bigserial primary key,
  member_id uuid references camp.members(id) on delete set null,
  stripe_session_id text unique,
  plan text not null,
  is_student boolean not null default false,
  amount int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists camp.stripe_events (
  id text primary key,
  created_at timestamptz not null default now()
);

-- 専用ロール（このアプリだけが camp スキーマに触れる）
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'camp_app') then
    create role camp_app login password '__DB_PASSWORD__';
  else
    alter role camp_app with login password '__DB_PASSWORD__';
  end if;
end $$;
grant usage on schema camp to camp_app;
grant select, insert, update, delete on all tables in schema camp to camp_app;
grant usage, select on all sequences in schema camp to camp_app;
alter default privileges in schema camp grant select, insert, update, delete on tables to camp_app;
alter default privileges in schema camp grant usage, select on sequences to camp_app;
alter role camp_app set search_path = camp, public;
revoke all on schema camp from anon, authenticated;
