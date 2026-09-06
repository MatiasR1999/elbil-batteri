begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to service_role;

alter default privileges for role postgres
  revoke execute on functions
  from public;
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables
  from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences
  from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions
  from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private
  revoke execute on functions
  from public, anon, authenticated, service_role;

create or replace function private.try_parse_bigint(p_value text)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_value is null or p_value !~ '^-?[0-9]+$' then
    return null;
  end if;

  return p_value::bigint;
exception
  when numeric_value_out_of_range then
    return null;
end;
$$;

create or replace function private.try_parse_uuid(p_value text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return p_value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function private.try_parse_smartcar_timestamp(p_value text)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_value is null then
    return null;
  end if;

  if p_value ~ '^[0-9]+([.][0-9]+)?$' then
    return pg_catalog.to_timestamp(p_value::double precision / 1000);
  end if;

  return p_value::timestamptz;
exception
  when others then
    return null;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  smartcar_vehicle_id text not null,
  make text not null,
  model text not null,
  year smallint not null check (year between 1990 and 2200),
  powertrain_type text,
  smartcar_mode text not null check (smartcar_mode in ('live', 'simulated')),
  vin_encrypted bytea,
  battery_variant text,
  nominal_capacity_kwh numeric(8, 3)
    check (nominal_capacity_kwh is null or nominal_capacity_kwh > 0),
  connected_at timestamptz not null,
  disconnected_at timestamptz,
  last_data_at timestamptz,
  last_event_sequence bigint,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, smartcar_vehicle_id)
);

create table public.vehicle_connections (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null unique references public.vehicles(id) on delete cascade,
  smartcar_connection_id text not null unique,
  smartcar_user_id text not null,
  status text not null default 'connected'
    check (status in ('connected', 'reauthorization_required', 'disconnected', 'error')),
  granted_permissions text[] not null default '{}',
  connection_metadata jsonb not null default '{}'::jsonb,
  reauthorization_required_at timestamptz,
  last_event_sequence bigint,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.smartcar_connect_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state_hash char(64) not null unique,
  mode text not null check (mode in ('live', 'simulated')),
  expires_at timestamptz not null,
  smartcar_user_id text,
  sync_status text not null default 'created'
    check (sync_status in ('created', 'pending', 'completed', 'failed')),
  sync_error text,
  sync_attempts integer not null default 0,
  last_attempt_at timestamptz,
  consumed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.vehicle_capabilities (
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  signal_code text not null,
  is_supported boolean not null,
  permission_status text not null default 'unknown'
    check (permission_status in ('unknown', 'granted', 'denied', 'not_capable', 'error')),
  last_status text,
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null,
  last_event_sequence bigint,
  last_event_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (vehicle_id, signal_code)
);

create table public.raw_smartcar_events (
  event_id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  smartcar_vehicle_id text,
  smartcar_user_id text,
  event_type text not null,
  event_sequence bigint,
  smartcar_delivered_at timestamptz,
  payload jsonb,
  payload_purged_at timestamptz,
  received_at timestamptz not null,
  processed_at timestamptz,
  processing_error text,
  processing_attempts integer not null default 0,
  last_processing_attempt_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.vehicle_signal_readings (
  id bigint generated always as identity primary key,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  source_event_id text not null
    references public.raw_smartcar_events(event_id) on delete cascade,
  signal_code text not null,
  numeric_value numeric,
  text_value text,
  boolean_value boolean,
  raw_value jsonb,
  unit text,
  oem_updated_at timestamptz,
  smartcar_fetched_at timestamptz,
  received_at timestamptz not null,
  quality_status text not null,
  created_at timestamptz not null default now(),
  unique (source_event_id, signal_code)
);

create index vehicles_user_id_idx
  on public.vehicles (user_id);
create index vehicle_connections_smartcar_user_idx
  on public.vehicle_connections (smartcar_user_id);
create index smartcar_connect_sessions_user_created_idx
  on public.smartcar_connect_sessions (user_id, created_at desc);
create index smartcar_connect_sessions_expiry_idx
  on public.smartcar_connect_sessions (expires_at)
  where consumed_at is null;
create index raw_smartcar_events_vehicle_received_idx
  on public.raw_smartcar_events (vehicle_id, received_at desc);
create index raw_smartcar_events_user_received_idx
  on public.raw_smartcar_events (user_id, received_at desc);
create index raw_smartcar_events_received_idx
  on public.raw_smartcar_events (received_at);
create index raw_smartcar_events_pending_idx
  on public.raw_smartcar_events (smartcar_user_id, smartcar_vehicle_id)
  where processed_at is null;
create index raw_smartcar_events_retry_idx
  on public.raw_smartcar_events (last_processing_attempt_at, received_at)
  where processed_at is null
    and processing_error is distinct from 'vehicle_not_linked';
create index vehicle_signal_readings_lookup_idx
  on public.vehicle_signal_readings
  (vehicle_id, signal_code, oem_updated_at desc, received_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

create trigger vehicle_connections_set_updated_at
before update on public.vehicle_connections
for each row execute function public.set_updated_at();

create trigger vehicle_capabilities_set_updated_at
before update on public.vehicle_capabilities
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@local.invalid'),
    new.raw_user_meta_data ->> 'display_name'
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, display_name, created_at)
select
  id,
  coalesce(email, id::text || '@local.invalid'),
  raw_user_meta_data ->> 'display_name',
  created_at
from auth.users
on conflict (id) do nothing;

create or replace function private.process_smartcar_event(p_event_id text)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event public.raw_smartcar_events%rowtype;
  v_vehicle_id uuid;
  v_reading_count integer := 0;
begin
  select *
  into v_event
  from public.raw_smartcar_events
  where event_id = p_event_id
  for update;

  if not found then
    return 0;
  end if;

  if v_event.processed_at is not null then
    return 0;
  end if;

  update public.raw_smartcar_events
  set
    processing_attempts = processing_attempts + 1,
    last_processing_attempt_at = now()
  where event_id = p_event_id;

  v_vehicle_id := v_event.vehicle_id;

  if v_vehicle_id is null
    and v_event.smartcar_user_id is not null
    and v_event.smartcar_vehicle_id is not null
  then
    select v.id
    into v_vehicle_id
    from public.vehicles as v
    join public.vehicle_connections as vc on vc.vehicle_id = v.id
    where vc.smartcar_user_id = v_event.smartcar_user_id
      and v.smartcar_vehicle_id = v_event.smartcar_vehicle_id
      and vc.status in ('connected', 'reauthorization_required')
    order by vc.updated_at desc
    limit 1;

    if v_vehicle_id is not null then
      update public.raw_smartcar_events
      set
        vehicle_id = v_vehicle_id,
        user_id = (
          select user_id
          from public.vehicles
          where id = v_vehicle_id
        )
      where event_id = p_event_id;
    end if;
  end if;

  if v_vehicle_id is not null and v_event.user_id is null then
    update public.raw_smartcar_events
    set user_id = (
      select user_id
      from public.vehicles
      where id = v_vehicle_id
    )
    where event_id = p_event_id;
  end if;

  if v_vehicle_id is null then
    update public.raw_smartcar_events
    set
      processed_at = null,
      processing_error = 'vehicle_not_linked'
    where event_id = p_event_id;

    return 0;
  end if;

  if v_event.event_type = 'VEHICLE_STATE' then
    insert into public.vehicle_signal_readings (
      vehicle_id,
      source_event_id,
      signal_code,
      numeric_value,
      text_value,
      boolean_value,
      raw_value,
      unit,
      oem_updated_at,
      smartcar_fetched_at,
      received_at,
      quality_status
    )
    select
      v_vehicle_id,
      p_event_id,
      item.signal ->> 'code',
      case
        when jsonb_typeof(item.signal #> '{body,value}') = 'number'
          then (item.signal #>> '{body,value}')::numeric
        else null
      end,
      case
        when jsonb_typeof(item.signal #> '{body,value}') = 'string'
          then item.signal #>> '{body,value}'
        else null
      end,
      case
        when jsonb_typeof(item.signal #> '{body,value}') = 'boolean'
          then (item.signal #>> '{body,value}')::boolean
        else null
      end,
      case
        when item.signal #> '{body,value}' is not null
          then item.signal #> '{body,value}'
        else coalesce(
          item.signal -> 'body',
          item.signal -> 'status',
          'null'::jsonb
        )
      end,
      item.signal #>> '{body,unit}',
      private.try_parse_smartcar_timestamp(
        item.signal #>> '{meta,oemUpdatedAt}'
      ),
      private.try_parse_smartcar_timestamp(
        item.signal #>> '{meta,retrievedAt}'
      ),
      v_event.received_at,
      case
        when jsonb_typeof(item.signal -> 'body') = 'object'
          then lower(coalesce(item.signal #>> '{status,value}', 'success'))
        else lower(
          coalesce(
            item.signal #>> '{status,value}',
            item.signal #>> '{status,error,code}',
            'unavailable'
          )
        )
      end
    from jsonb_array_elements(
      case
        when jsonb_typeof(v_event.payload #> '{data,signals}') = 'array'
          then v_event.payload #> '{data,signals}'
        else '[]'::jsonb
      end
    ) as item(signal)
    where item.signal ->> 'code' is not null
    on conflict (source_event_id, signal_code) do nothing;

    get diagnostics v_reading_count = row_count;

    insert into public.vehicle_capabilities (
      vehicle_id,
      signal_code,
      is_supported,
      permission_status,
      last_status,
      details,
      checked_at,
      last_event_sequence,
      last_event_at
    )
    select
      v_vehicle_id,
      item.signal ->> 'code',
      coalesce(
        jsonb_typeof(item.signal -> 'body') = 'object',
        false
      ),
      case
        when jsonb_typeof(item.signal -> 'body') = 'object'
          then 'granted'
        when upper(
          coalesce(item.signal #>> '{status,error,type}', '')
        ) = 'PERMISSION'
          then 'denied'
        when upper(
          coalesce(item.signal #>> '{status,error,code}', '')
        ) in (
          'MAKE_NOT_COMPATIBLE',
          'SMARTCAR_NOT_CAPABLE',
          'VEHICLE_NOT_CAPABLE'
        )
          then 'not_capable'
        else 'error'
      end,
      coalesce(
        item.signal #>> '{status,value}',
        item.signal #>> '{status,error,code}',
        'SUCCESS'
      ),
      coalesce(item.signal -> 'status', '{}'::jsonb),
      v_event.received_at,
      v_event.event_sequence,
      coalesce(v_event.smartcar_delivered_at, v_event.received_at)
    from jsonb_array_elements(
      case
        when jsonb_typeof(v_event.payload #> '{data,signals}') = 'array'
          then v_event.payload #> '{data,signals}'
        else '[]'::jsonb
      end
    ) as item(signal)
    where item.signal ->> 'code' is not null
    on conflict (vehicle_id, signal_code) do update
    set
      is_supported =
        public.vehicle_capabilities.is_supported or excluded.is_supported,
      permission_status = case
        when excluded.permission_status = 'error'
          then public.vehicle_capabilities.permission_status
        else excluded.permission_status
      end,
      last_status = excluded.last_status,
      details = excluded.details,
      checked_at = excluded.checked_at,
      last_event_sequence = excluded.last_event_sequence,
      last_event_at = excluded.last_event_at
    where
      (
        excluded.last_event_sequence is not null
        and public.vehicle_capabilities.last_event_sequence is not null
        and excluded.last_event_sequence >
          public.vehicle_capabilities.last_event_sequence
      )
      or (
        (
          excluded.last_event_sequence is null
          or public.vehicle_capabilities.last_event_sequence is null
        )
        and excluded.last_event_at >=
          public.vehicle_capabilities.last_event_at
      );

    update public.vehicles
    set last_data_at = greatest(
      coalesce(last_data_at, '-infinity'::timestamptz),
      v_event.received_at
    )
    where id = v_vehicle_id;

    update public.vehicles
    set
      make = coalesce(v_event.payload #>> '{data,vehicle,make}', make),
      model = coalesce(v_event.payload #>> '{data,vehicle,model}', model),
      year = case
        when jsonb_typeof(v_event.payload #> '{data,vehicle,year}') = 'number'
          then (v_event.payload #>> '{data,vehicle,year}')::smallint
        else year
      end,
      powertrain_type = coalesce(
        v_event.payload #>> '{data,vehicle,powertrainType}',
        powertrain_type
      ),
      last_event_sequence = v_event.event_sequence,
      last_event_at = coalesce(
        v_event.smartcar_delivered_at,
        v_event.received_at
      )
    where id = v_vehicle_id
      and (
        (
          v_event.event_sequence is not null
          and last_event_sequence is not null
          and v_event.event_sequence > last_event_sequence
        )
        or (
          (
            v_event.event_sequence is null
            or last_event_sequence is null
          )
          and coalesce(
            v_event.smartcar_delivered_at,
            v_event.received_at
          ) >= coalesce(last_event_at, '-infinity'::timestamptz)
        )
      );
  elsif v_event.event_type = 'VEHICLE_ERROR' then
    insert into public.vehicle_capabilities (
      vehicle_id,
      signal_code,
      is_supported,
      permission_status,
      last_status,
      details,
      checked_at,
      last_event_sequence,
      last_event_at
    )
    select
      v_vehicle_id,
      signal_item.signal ->> 'code',
      false,
      case
        when upper(
          coalesce(error_item.error ->> 'state', 'ERROR')
        ) = 'RESOLVED'
          then 'unknown'
        when upper(error_item.error ->> 'type') = 'PERMISSION'
          or upper(error_item.error ->> 'code') = 'PERMISSION'
          then 'denied'
        when upper(error_item.error ->> 'code') in (
          'MAKE_NOT_COMPATIBLE',
          'SMARTCAR_NOT_CAPABLE',
          'VEHICLE_NOT_CAPABLE'
        )
          then 'not_capable'
        else 'error'
      end,
      upper(coalesce(error_item.error ->> 'state', 'ERROR')),
      error_item.error - 'signals',
      v_event.received_at,
      v_event.event_sequence,
      coalesce(v_event.smartcar_delivered_at, v_event.received_at)
    from jsonb_array_elements(
      case
        when jsonb_typeof(v_event.payload #> '{data,errors}') = 'array'
          then v_event.payload #> '{data,errors}'
        else '[]'::jsonb
      end
    ) as error_item(error)
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(error_item.error -> 'signals') = 'array'
          then error_item.error -> 'signals'
        else '[]'::jsonb
      end
    ) as signal_item(signal)
    where signal_item.signal ->> 'code' is not null
    on conflict (vehicle_id, signal_code) do update
    set
      is_supported = public.vehicle_capabilities.is_supported,
      permission_status = case
        when excluded.last_status = 'RESOLVED'
          and public.vehicle_capabilities.permission_status in (
            'denied',
            'error',
            'not_capable'
          )
          then 'unknown'
        when excluded.permission_status = 'error'
          then public.vehicle_capabilities.permission_status
        else excluded.permission_status
      end,
      last_status = excluded.last_status,
      details = excluded.details,
      checked_at = excluded.checked_at,
      last_event_sequence = excluded.last_event_sequence,
      last_event_at = excluded.last_event_at
    where
      (
        excluded.last_event_sequence is not null
        and public.vehicle_capabilities.last_event_sequence is not null
        and excluded.last_event_sequence >
          public.vehicle_capabilities.last_event_sequence
      )
      or (
        (
          excluded.last_event_sequence is null
          or public.vehicle_capabilities.last_event_sequence is null
        )
        and excluded.last_event_at >=
          public.vehicle_capabilities.last_event_at
      );

    if exists (
      select 1
      from jsonb_array_elements(
        case
          when jsonb_typeof(v_event.payload #> '{data,errors}') = 'array'
            then v_event.payload #> '{data,errors}'
          else '[]'::jsonb
        end
      ) as error_item(error)
      where upper(coalesce(error_item.error ->> 'state', 'ERROR')) = 'ERROR'
        and (
          upper(error_item.error ->> 'type') in (
            'CONNECTED_SERVICES_ACCOUNT',
            'PERMISSION'
          )
          or upper(coalesce(error_item.error ->> 'code', '')) in (
            'AUTHENTICATION_FAILED',
            'PERMISSION'
          )
        )
    ) then
      update public.vehicle_connections
      set
        status = 'reauthorization_required',
        reauthorization_required_at = v_event.received_at,
        last_event_sequence = v_event.event_sequence,
        last_event_at = coalesce(
          v_event.smartcar_delivered_at,
          v_event.received_at
        )
      where vehicle_id = v_vehicle_id
        and (
          (
            v_event.event_sequence is not null
            and last_event_sequence is not null
            and v_event.event_sequence > last_event_sequence
          )
          or (
            (
              v_event.event_sequence is null
              or last_event_sequence is null
            )
            and coalesce(
              v_event.smartcar_delivered_at,
              v_event.received_at
            ) >= coalesce(last_event_at, '-infinity'::timestamptz)
          )
        );
    elsif exists (
      select 1
      from jsonb_array_elements(
        case
          when jsonb_typeof(v_event.payload #> '{data,errors}') = 'array'
            then v_event.payload #> '{data,errors}'
          else '[]'::jsonb
        end
      ) as error_item(error)
      where upper(error_item.error ->> 'state') = 'RESOLVED'
        and (
          upper(error_item.error ->> 'type') in (
            'CONNECTED_SERVICES_ACCOUNT',
            'PERMISSION'
          )
          or upper(coalesce(error_item.error ->> 'code', '')) in (
            'AUTHENTICATION_FAILED',
            'PERMISSION'
          )
        )
    ) then
      update public.vehicle_connections
      set
        status = 'connected',
        reauthorization_required_at = null,
        last_event_sequence = v_event.event_sequence,
        last_event_at = coalesce(
          v_event.smartcar_delivered_at,
          v_event.received_at
        )
      where vehicle_id = v_vehicle_id
        and (
          (
            v_event.event_sequence is not null
            and last_event_sequence is not null
            and v_event.event_sequence > last_event_sequence
          )
          or (
            (
              v_event.event_sequence is null
              or last_event_sequence is null
            )
            and coalesce(
              v_event.smartcar_delivered_at,
              v_event.received_at
            ) >= coalesce(last_event_at, '-infinity'::timestamptz)
          )
        );
    end if;
  end if;

  update public.raw_smartcar_events
  set
    processed_at = now(),
    processing_error = null
  where event_id = p_event_id;

  return v_reading_count;
exception
  when others then
    update public.raw_smartcar_events
    set
      processed_at = null,
      processing_error = left(sqlerrm, 1000),
      processing_attempts = processing_attempts + 1,
      last_processing_attempt_at = now()
    where event_id = p_event_id;

    return 0;
end;
$$;

create or replace function public.ingest_smartcar_webhook(
  p_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_received_at timestamptz
)
returns table (
  inserted boolean,
  reading_count integer,
  vehicle_id uuid,
  processing_error text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_insert_count integer := 0;
begin
  if nullif(p_event_id, '') is null
    or p_event_type not in ('VEHICLE_STATE', 'VEHICLE_ERROR')
    or p_payload is null
    or p_received_at is null
    or (p_payload ->> 'eventId') is distinct from p_event_id
    or (p_payload ->> 'eventType') is distinct from p_event_type
    or jsonb_typeof(p_payload -> 'data') is distinct from 'object'
  then
    raise exception 'Smartcar webhook arguments are invalid';
  end if;

  insert into public.raw_smartcar_events (
    event_id,
    user_id,
    smartcar_vehicle_id,
    smartcar_user_id,
    event_type,
    event_sequence,
    smartcar_delivered_at,
    payload,
    received_at
  )
  values (
    p_event_id,
    (
      select profile.id
      from public.profiles as profile
      where profile.id = private.try_parse_uuid(
        p_payload #>> '{data,user,externalId}'
      )
    ),
    p_payload #>> '{data,vehicle,id}',
    p_payload #>> '{data,user,id}',
    p_event_type,
    private.try_parse_bigint(p_payload #>> '{meta,sequence}'),
    private.try_parse_smartcar_timestamp(
      p_payload #>> '{meta,deliveredAt}'
    ),
    p_payload,
    p_received_at
  )
  on conflict (event_id) do nothing;

  get diagnostics v_insert_count = row_count;
  inserted := v_insert_count = 1;

  if inserted or exists (
    select 1
    from public.raw_smartcar_events as raw_event
    where raw_event.event_id = p_event_id
      and raw_event.processed_at is null
  ) then
    reading_count := private.process_smartcar_event(p_event_id);
  else
    reading_count := 0;
  end if;

  select
    raw_event.vehicle_id,
    raw_event.processing_error
  into
    vehicle_id,
    processing_error
  from public.raw_smartcar_events as raw_event
  where raw_event.event_id = p_event_id;

  return next;
end;
$$;

create or replace function public.begin_smartcar_connect_sync(
  p_session_id uuid,
  p_smartcar_user_id text
)
returns table (
  giret_user_id uuid,
  connect_mode text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.smartcar_connect_sessions%rowtype;
begin
  if nullif(p_smartcar_user_id, '') is null then
    raise exception 'Smartcar user ID is required';
  end if;

  select *
  into v_session
  from public.smartcar_connect_sessions
  where id = p_session_id
    and consumed_at is null
    and expires_at > now()
    and (
      smartcar_user_id is null
      or smartcar_user_id = p_smartcar_user_id
    )
  for update;

  if not found then
    raise exception 'Smartcar connect session is invalid or expired';
  end if;

  update public.smartcar_connect_sessions
  set
    smartcar_user_id = p_smartcar_user_id,
    sync_status = 'pending',
    sync_error = null,
    sync_attempts = sync_attempts + 1,
    last_attempt_at = now()
  where id = p_session_id;

  giret_user_id := v_session.user_id;
  connect_mode := v_session.mode;
  return next;
end;
$$;

create or replace function public.finalize_smartcar_connect(
  p_session_id uuid,
  p_smartcar_user_id text,
  p_connections jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.smartcar_connect_sessions%rowtype;
  v_item jsonb;
  v_vehicle_id uuid;
  v_vehicle_year bigint;
  v_connection_count integer := 0;
begin
  select *
  into v_session
  from public.smartcar_connect_sessions
  where id = p_session_id
    and consumed_at is null
    and expires_at > now()
    and smartcar_user_id = p_smartcar_user_id
  for update;

  if not found then
    raise exception 'Smartcar connect session is invalid or expired';
  end if;

  if p_connections is null
    or jsonb_typeof(p_connections) <> 'array'
    or jsonb_array_length(p_connections) = 0
  then
    raise exception 'Smartcar connections must be a non-empty array';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_connections)
  loop
    v_vehicle_year := private.try_parse_bigint(v_item ->> 'year');

    if nullif(v_item ->> 'connectionId', '') is null
      or nullif(v_item ->> 'smartcarVehicleId', '') is null
      or nullif(v_item ->> 'make', '') is null
      or nullif(v_item ->> 'model', '') is null
      or v_vehicle_year is null
      or v_vehicle_year not between 1990 and 2200
      or lower(coalesce(v_item ->> 'mode', '')) <> v_session.mode
      or (v_item ->> 'externalId') is distinct from v_session.user_id::text
    then
      raise exception 'Smartcar connection payload is invalid';
    end if;

    insert into public.vehicles (
      user_id,
      smartcar_vehicle_id,
      make,
      model,
      year,
      powertrain_type,
      smartcar_mode,
      connected_at,
      disconnected_at
    )
    values (
      v_session.user_id,
      v_item ->> 'smartcarVehicleId',
      v_item ->> 'make',
      v_item ->> 'model',
      v_vehicle_year::smallint,
      nullif(v_item ->> 'powertrainType', ''),
      lower(v_item ->> 'mode'),
      coalesce(
        private.try_parse_smartcar_timestamp(v_item ->> 'createdAt'),
        now()
      ),
      null
    )
    on conflict (user_id, smartcar_vehicle_id) do update
    set
      make = excluded.make,
      model = excluded.model,
      year = excluded.year,
      powertrain_type = excluded.powertrain_type,
      smartcar_mode = excluded.smartcar_mode,
      disconnected_at = null
    returning id into v_vehicle_id;

    insert into public.vehicle_connections (
      vehicle_id,
      smartcar_connection_id,
      smartcar_user_id,
      status,
      granted_permissions,
      connection_metadata,
      reauthorization_required_at
    )
    values (
      v_vehicle_id,
      v_item ->> 'connectionId',
      p_smartcar_user_id,
      'connected',
      case
        when jsonb_typeof(v_item -> 'permissions') = 'array'
          then array(
            select jsonb_array_elements_text(v_item -> 'permissions')
          )
        else '{}'::text[]
      end,
      jsonb_build_object(
        'mode', lower(v_item ->> 'mode'),
        'smartcarCreatedAt', v_item ->> 'createdAt',
        'smartcarUpdatedAt', v_item ->> 'updatedAt'
      ),
      null
    )
    on conflict (vehicle_id) do update
    set
      smartcar_connection_id = excluded.smartcar_connection_id,
      smartcar_user_id = excluded.smartcar_user_id,
      status = excluded.status,
      granted_permissions = excluded.granted_permissions,
      connection_metadata = excluded.connection_metadata,
      reauthorization_required_at = null;

    perform private.process_smartcar_event(pending_event.event_id)
    from (
      select event_id
      from public.raw_smartcar_events
      where smartcar_user_id = p_smartcar_user_id
        and smartcar_vehicle_id = (v_item ->> 'smartcarVehicleId')
        and processed_at is null
      order by received_at
    ) as pending_event;

    v_connection_count := v_connection_count + 1;
  end loop;

  update public.smartcar_connect_sessions
  set
    smartcar_user_id = p_smartcar_user_id,
    sync_status = 'completed',
    sync_error = null,
    consumed_at = now(),
    completed_at = now()
  where id = p_session_id;

  return v_connection_count;
end;
$$;

create or replace function public.reprocess_smartcar_events(
  p_smartcar_user_id text,
  p_smartcar_vehicle_id text
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_id text;
  v_processed integer := 0;
begin
  for v_event_id in
    select event_id
    from public.raw_smartcar_events
    where smartcar_user_id = p_smartcar_user_id
      and smartcar_vehicle_id = p_smartcar_vehicle_id
      and processed_at is null
    order by received_at
    for update skip locked
  loop
    perform private.process_smartcar_event(v_event_id);

    if exists (
      select 1
      from public.raw_smartcar_events
      where event_id = v_event_id
        and processed_at is not null
    ) then
      v_processed := v_processed + 1;
    end if;
  end loop;

  return v_processed;
end;
$$;

create or replace function public.purge_raw_smartcar_events(
  p_retention interval default interval '30 days'
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_purged integer;
begin
  if p_retention is null or p_retention < interval '7 days' then
    raise exception 'Raw event retention cannot be shorter than 7 days';
  end if;

  update public.raw_smartcar_events
  set
    payload = null,
    payload_purged_at = now()
  where received_at < now() - p_retention
    and payload is not null
    and processed_at is not null
    and processing_error is null;

  get diagnostics v_purged = row_count;
  return v_purged;
end;
$$;

create view public.vehicle_signal_coverage
with (security_invoker = true)
as
select
  capability.vehicle_id,
  capability.signal_code,
  count(reading.id)::integer as reading_count,
  count(reading.id) filter (
    where reading.quality_status = 'success'
  )::integer as successful_reading_count,
  count(distinct reading.oem_updated_at) filter (
    where reading.quality_status = 'success'
      and reading.oem_updated_at is not null
  )::integer as distinct_oem_observation_count,
  count(reading.id) filter (
    where reading.quality_status <> 'success'
  )::integer as error_reading_count,
  min(reading.received_at) as first_received_at,
  max(reading.received_at) as last_received_at,
  min(reading.oem_updated_at) filter (
    where reading.quality_status = 'success'
  ) as first_oem_updated_at,
  max(reading.oem_updated_at) filter (
    where reading.quality_status = 'success'
  ) as last_oem_updated_at,
  case
    when count(distinct reading.oem_updated_at) filter (
      where reading.quality_status = 'success'
        and reading.oem_updated_at is not null
    ) > 1 then
      extract(
        epoch from
          max(reading.oem_updated_at) filter (
            where reading.quality_status = 'success'
          ) - min(reading.oem_updated_at) filter (
            where reading.quality_status = 'success'
          )
      ) / (
        count(distinct reading.oem_updated_at) filter (
          where reading.quality_status = 'success'
            and reading.oem_updated_at is not null
        ) - 1
      )
    else null
  end as average_interval_seconds,
  capability.is_supported,
  capability.permission_status,
  capability.last_status,
  capability.checked_at
from public.vehicle_capabilities as capability
left join public.vehicle_signal_readings as reading
  on reading.vehicle_id = capability.vehicle_id
  and reading.signal_code = capability.signal_code
group by
  capability.vehicle_id,
  capability.signal_code,
  capability.is_supported,
  capability.permission_status,
  capability.last_status,
  capability.checked_at;

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_connections enable row level security;
alter table public.smartcar_connect_sessions enable row level security;
alter table public.vehicle_capabilities enable row level security;
alter table public.raw_smartcar_events enable row level security;
alter table public.vehicle_signal_readings enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "vehicles_select_own"
on public.vehicles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "vehicle_connections_select_own"
on public.vehicle_connections
for select
to authenticated
using (
  exists (
    select 1
    from public.vehicles
    where vehicles.id = vehicle_connections.vehicle_id
      and vehicles.user_id = (select auth.uid())
  )
);

create policy "vehicle_capabilities_select_own"
on public.vehicle_capabilities
for select
to authenticated
using (
  exists (
    select 1
    from public.vehicles
    where vehicles.id = vehicle_capabilities.vehicle_id
      and vehicles.user_id = (select auth.uid())
  )
);

create policy "raw_smartcar_events_select_own"
on public.raw_smartcar_events
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (
    vehicle_id is not null
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = raw_smartcar_events.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  )
);

create policy "vehicle_signal_readings_select_own"
on public.vehicle_signal_readings
for select
to authenticated
using (
  exists (
    select 1
    from public.vehicles
    where vehicles.id = vehicle_signal_readings.vehicle_id
      and vehicles.user_id = (select auth.uid())
  )
);

revoke all on public.profiles from anon, authenticated, service_role;
revoke all on public.vehicles from anon, authenticated, service_role;
revoke all on public.vehicle_connections
  from anon, authenticated, service_role;
revoke all on public.smartcar_connect_sessions
  from anon, authenticated, service_role;
revoke all on public.vehicle_capabilities
  from anon, authenticated, service_role;
revoke all on public.raw_smartcar_events
  from anon, authenticated, service_role;
revoke all on public.vehicle_signal_readings
  from anon, authenticated, service_role;
revoke all on public.vehicle_signal_coverage
  from anon, authenticated, service_role;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.vehicles to authenticated;
grant select on public.vehicle_connections to authenticated;
grant select on public.vehicle_capabilities to authenticated;
grant select on public.raw_smartcar_events to authenticated;
grant select on public.vehicle_signal_readings to authenticated;
grant select on public.vehicle_signal_coverage to authenticated;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.vehicles to service_role;
grant select, insert, update, delete on public.vehicle_connections
  to service_role;
grant select, insert, update, delete on public.smartcar_connect_sessions
  to service_role;
grant select, insert, update, delete on public.vehicle_capabilities
  to service_role;
grant select, insert, update, delete on public.raw_smartcar_events
  to service_role;
grant select, insert, update, delete on public.vehicle_signal_readings
  to service_role;
grant select on public.vehicle_signal_coverage to service_role;
grant usage, select on sequence public.vehicle_signal_readings_id_seq
  to service_role;

revoke all on function public.set_updated_at()
  from public, anon, authenticated, service_role;
revoke all on function public.handle_new_user()
  from public, anon, authenticated, service_role;
revoke all on function private.try_parse_bigint(text)
  from public, anon, authenticated, service_role;
revoke all on function private.try_parse_uuid(text)
  from public, anon, authenticated, service_role;
revoke all on function private.try_parse_smartcar_timestamp(text)
  from public, anon, authenticated, service_role;
revoke all on function private.process_smartcar_event(text)
  from public, anon, authenticated, service_role;
revoke all on function public.ingest_smartcar_webhook(
  text,
  text,
  jsonb,
  timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.begin_smartcar_connect_sync(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.finalize_smartcar_connect(uuid, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.reprocess_smartcar_events(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.purge_raw_smartcar_events(interval)
  from public, anon, authenticated, service_role;

grant execute on function private.try_parse_bigint(text)
  to service_role;
grant execute on function private.try_parse_uuid(text)
  to service_role;
grant execute on function private.try_parse_smartcar_timestamp(text)
  to service_role;
grant execute on function private.process_smartcar_event(text)
  to service_role;

grant execute on function public.ingest_smartcar_webhook(
  text,
  text,
  jsonb,
  timestamptz
) to service_role;
grant execute on function public.begin_smartcar_connect_sync(uuid, text)
  to service_role;
grant execute on function public.finalize_smartcar_connect(uuid, text, jsonb)
  to service_role;
grant execute on function public.reprocess_smartcar_events(text, text)
  to service_role;
grant execute on function public.purge_raw_smartcar_events(interval)
  to service_role;

commit;
