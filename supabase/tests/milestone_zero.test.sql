begin;

select plan(48);

select ok(
  not has_function_privilege(
    'anon',
    'public.ingest_smartcar_webhook(text,text,jsonb,timestamptz)',
    'EXECUTE'
  ),
  'anon cannot call webhook ingestion'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.ingest_smartcar_webhook(text,text,jsonb,timestamptz)',
    'EXECUTE'
  ),
  'authenticated cannot call webhook ingestion'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.purge_raw_smartcar_events(interval)',
    'EXECUTE'
  ),
  'anon cannot purge raw payloads'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.finalize_smartcar_connect(uuid,text,jsonb)',
    'EXECUTE'
  ),
  'authenticated cannot finalize Smartcar connections'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.get_signal_coverage_report(uuid,timestamptz,timestamptz)',
    'EXECUTE'
  ),
  'authenticated cannot bypass RLS through the report RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.ingest_smartcar_webhook(text,text,jsonb,timestamptz)',
    'EXECUTE'
  ),
  'service role can ingest webhooks'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.get_signal_coverage_report(uuid,timestamptz,timestamptz)',
    'EXECUTE'
  ),
  'service role can generate signal reports'
);
select ok(
  not has_schema_privilege('authenticated', 'private', 'USAGE'),
  'authenticated cannot use the private schema'
);
select ok(
  has_schema_privilege('service_role', 'private', 'USAGE'),
  'service role can use internal normalization functions'
);

create function public.default_acl_probe()
returns integer
language sql
as $$ select 1 $$;

select ok(
  not has_function_privilege(
    'anon',
    'public.default_acl_probe()',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.default_acl_probe()',
    'EXECUTE'
  ),
  'future public functions are private by default'
);

drop function public.default_acl_probe();

select ok(
  has_table_privilege(
    'service_role',
    'public.raw_smartcar_events',
    'SELECT'
  )
  and has_table_privilege(
    'service_role',
    'public.raw_smartcar_events',
    'INSERT'
  )
  and has_table_privilege(
    'service_role',
    'public.raw_smartcar_events',
    'UPDATE'
  ),
  'service role has explicit webhook table privileges'
);
select ok(
  has_table_privilege(
    'authenticated',
    'public.raw_smartcar_events',
    'SELECT'
  )
  and not has_table_privilege(
    'authenticated',
    'public.raw_smartcar_events',
    'INSERT'
  ),
  'authenticated is read-only on its RLS-filtered raw events'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'milestone-zero@example.test',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.vehicles (
  id,
  user_id,
  smartcar_vehicle_id,
  make,
  model,
  year,
  smartcar_mode,
  connected_at
)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'smartcar-vehicle-test',
  'TEST',
  'EV',
  2026,
  'simulated',
  now()
);

insert into public.vehicle_connections (
  vehicle_id,
  smartcar_connection_id,
  smartcar_user_id
)
values (
  '20000000-0000-0000-0000-000000000001',
  'smartcar-connection-test',
  'smartcar-user-test'
);

insert into public.raw_smartcar_events (
  event_id,
  user_id,
  vehicle_id,
  smartcar_vehicle_id,
  smartcar_user_id,
  event_type,
  payload,
  received_at,
  processed_at
)
values (
  'retention-event',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'smartcar-vehicle-test',
  'smartcar-user-test',
  'VEHICLE_STATE',
  '{"sensitive":"raw-data"}'::jsonb,
  now() - interval '31 days',
  now() - interval '31 days'
);

insert into public.vehicle_signal_readings (
  vehicle_id,
  source_event_id,
  signal_code,
  numeric_value,
  raw_value,
  unit,
  oem_updated_at,
  received_at,
  quality_status
)
values (
  '20000000-0000-0000-0000-000000000001',
  'retention-event',
  'tractionbattery-stateofcharge',
  80,
  '80'::jsonb,
  'percent',
  now() - interval '31 days',
  now() - interval '31 days',
  'success'
);

insert into public.vehicle_capabilities (
  vehicle_id,
  signal_code,
  is_supported,
  permission_status,
  last_status,
  checked_at,
  last_event_at
)
values (
  '20000000-0000-0000-0000-000000000001',
  'tractionbattery-stateofcharge',
  true,
  'granted',
  'SUCCESS',
  now() - interval '31 days',
  now() - interval '31 days'
);

select is(
  public.purge_raw_smartcar_events(interval '30 days'),
  1,
  'retention purges one raw payload'
);
select ok(
  (
    select payload is null and payload_purged_at is not null
    from public.raw_smartcar_events
    where event_id = 'retention-event'
  ),
  'retention redacts payload but keeps the deduplication row'
);
select is(
  (
    select count(*)::integer
    from public.vehicle_signal_readings
    where source_event_id = 'retention-event'
  ),
  1,
  'retention keeps normalized signal history'
);

select lives_ok(
  $sql$
  select *
  from public.ingest_smartcar_webhook(
  'signal-error-event',
  'VEHICLE_STATE',
  '{
    "eventId":"signal-error-event",
    "eventType":"VEHICLE_STATE",
    "data":{
      "user":{
        "id":"smartcar-user-test",
        "externalId":"10000000-0000-0000-0000-000000000001"
      },
      "vehicle":{"id":"smartcar-vehicle-test"},
      "signals":[{
        "code":"tractionbattery-range",
        "status":{
          "value":"ERROR",
          "error":{
            "type":"COMPATIBILITY",
            "code":"VEHICLE_NOT_CAPABLE"
          }
        }
      }]
    },
    "meta":{"deliveredAt":"2026-09-05T10:00:00Z"}
  }'::jsonb,
  '2026-09-05T10:00:01Z'::timestamptz
  )
  $sql$,
  'signal-level errors can be ingested'
);

select is(
  (
    select permission_status
    from public.vehicle_capabilities
    where vehicle_id = '20000000-0000-0000-0000-000000000001'
      and signal_code = 'tractionbattery-range'
  ),
  'not_capable',
  'nested Smartcar compatibility errors are normalized'
);

select lives_ok(
  $sql$
  select *
  from public.ingest_smartcar_webhook(
  'resolved-error-event',
  'VEHICLE_ERROR',
  '{
    "eventId":"resolved-error-event",
    "eventType":"VEHICLE_ERROR",
    "data":{
      "user":{
        "id":"smartcar-user-test",
        "externalId":"10000000-0000-0000-0000-000000000001"
      },
      "vehicle":{"id":"smartcar-vehicle-test"},
      "errors":[{
        "type":"COMPATIBILITY",
        "code":"VEHICLE_NOT_CAPABLE",
        "state":"RESOLVED",
        "signals":[{"code":"tractionbattery-range"}]
      }]
    },
    "meta":{"deliveredAt":"2026-09-05T10:01:00Z"}
  }'::jsonb,
  '2026-09-05T10:01:01Z'::timestamptz
  )
  $sql$,
  'resolved vehicle errors can be ingested'
);

select is(
  (
    select permission_status
    from public.vehicle_capabilities
    where vehicle_id = '20000000-0000-0000-0000-000000000001'
      and signal_code = 'tractionbattery-range'
  ),
  'unknown',
  'resolved errors clear the active capability error'
);
select is(
  (
    select last_status
    from public.vehicle_capabilities
    where vehicle_id = '20000000-0000-0000-0000-000000000001'
      and signal_code = 'tractionbattery-range'
  ),
  'RESOLVED',
  'resolved error state is retained for diagnostics'
);
select is(
  (
    select distinct_oem_observation_count
    from public.get_signal_coverage_report(
      '20000000-0000-0000-0000-000000000001',
      now() - interval '40 days',
      now()
    )
    where signal_code = 'tractionbattery-stateofcharge'
  ),
  1,
  'signal report counts distinct OEM observations'
);
select is(
  (
    select count(*)::integer
    from public.raw_smartcar_events
    where event_id in ('signal-error-event', 'resolved-error-event')
      and processed_at is not null
  ),
  2,
  'valid error events complete normalization'
);

select lives_ok(
  $sql$
  select *
  from public.ingest_smartcar_webhook(
    'newer-state-event',
    'VEHICLE_STATE',
    '{
      "eventId":"newer-state-event",
      "eventType":"VEHICLE_STATE",
      "data":{
        "user":{"id":"smartcar-user-test"},
        "vehicle":{"id":"smartcar-vehicle-test"},
        "signals":[{
          "code":"tractionbattery-range",
          "body":{"value":250,"unit":"km"},
          "status":{"value":"SUCCESS"},
          "meta":{
            "oemUpdatedAt":1788609599000,
            "retrievedAt":1788609600000
          }
        }]
      },
      "meta":{
        "sequence":200,
        "deliveredAt":"2026-09-05T12:00:00Z"
      }
    }'::jsonb,
    '2026-09-05T12:00:01Z'::timestamptz
  )
  $sql$,
  'newer signal state can be processed'
);
select lives_ok(
  $sql$
  select *
  from public.ingest_smartcar_webhook(
    'newer-state-event',
    'VEHICLE_STATE',
    (
      select payload
      from public.raw_smartcar_events
      where event_id = 'newer-state-event'
    ),
    '2026-09-05T12:00:03Z'::timestamptz
  )
  $sql$,
  'duplicate event delivery is accepted idempotently'
);
select is(
  (
    select count(*)::integer
    from public.raw_smartcar_events
    where event_id = 'newer-state-event'
  ),
  1,
  'duplicate delivery keeps one raw event'
);
select is(
  (
    select count(*)::integer
    from public.vehicle_signal_readings
    where source_event_id = 'newer-state-event'
  ),
  1,
  'duplicate delivery keeps one normalized reading'
);
select lives_ok(
  $sql$
  select *
  from public.ingest_smartcar_webhook(
    'older-state-event',
    'VEHICLE_STATE',
    '{
      "eventId":"older-state-event",
      "eventType":"VEHICLE_STATE",
      "data":{
        "user":{"id":"smartcar-user-test"},
        "vehicle":{"id":"smartcar-vehicle-test"},
        "signals":[{
          "code":"tractionbattery-range",
          "status":{
            "value":"ERROR",
            "error":{
              "type":"COMPATIBILITY",
              "code":"VEHICLE_NOT_CAPABLE"
            }
          }
        }]
      },
      "meta":{"deliveredAt":"2026-09-05T11:00:00Z"}
    }'::jsonb,
    '2026-09-05T12:00:02Z'::timestamptz
  )
  $sql$,
  'late out-of-order signal state can be ingested'
);
select is(
  (
    select permission_status
    from public.vehicle_capabilities
    where vehicle_id = '20000000-0000-0000-0000-000000000001'
      and signal_code = 'tractionbattery-range'
  ),
  'granted',
  'older errors cannot overwrite newer capability state'
);
select is(
  (
    select last_status
    from public.vehicle_capabilities
    where vehicle_id = '20000000-0000-0000-0000-000000000001'
      and signal_code = 'tractionbattery-range'
  ),
  'SUCCESS',
  'capability status follows Smartcar delivery order'
);

select lives_ok(
  $sql$
  select *
  from public.ingest_smartcar_webhook(
    'later-unsequenced-event',
    'VEHICLE_STATE',
    '{
      "eventId":"later-unsequenced-event",
      "eventType":"VEHICLE_STATE",
      "data":{
        "user":{"id":"smartcar-user-test"},
        "vehicle":{"id":"smartcar-vehicle-test"},
        "signals":[{
          "code":"tractionbattery-range",
          "status":{
            "value":"ERROR",
            "error":{
              "type":"COMPATIBILITY",
              "code":"VEHICLE_NOT_CAPABLE"
            }
          }
        }]
      },
      "meta":{"deliveredAt":"2026-09-05T12:30:00Z"}
    }'::jsonb,
    '2026-09-05T12:30:01Z'::timestamptz
  )
  $sql$,
  'later unsequenced state can follow a sequenced state'
);
select is(
  (
    select permission_status
    from public.vehicle_capabilities
    where vehicle_id = '20000000-0000-0000-0000-000000000001'
      and signal_code = 'tractionbattery-range'
  ),
  'not_capable',
  'mixed ordering accepts a later unsequenced event'
);
select lives_ok(
  $sql$
  select *
  from public.ingest_smartcar_webhook(
    'stale-sequenced-event',
    'VEHICLE_STATE',
    '{
      "eventId":"stale-sequenced-event",
      "eventType":"VEHICLE_STATE",
      "data":{
        "user":{"id":"smartcar-user-test"},
        "vehicle":{"id":"smartcar-vehicle-test"},
        "signals":[{
          "code":"tractionbattery-range",
          "body":{"value":240,"unit":"km"},
          "status":{"value":"SUCCESS"}
        }]
      },
      "meta":{
        "sequence":300,
        "deliveredAt":"2026-09-05T12:15:00Z"
      }
    }'::jsonb,
    '2026-09-05T12:31:00Z'::timestamptz
  )
  $sql$,
  'stale sequenced state can be recorded after an unsequenced state'
);
select is(
  (
    select permission_status
    from public.vehicle_capabilities
    where vehicle_id = '20000000-0000-0000-0000-000000000001'
      and signal_code = 'tractionbattery-range'
  ),
  'not_capable',
  'mixed ordering rejects a stale sequenced overwrite'
);

select lives_ok(
  $sql$
  select *
  from public.ingest_smartcar_webhook(
    'authentication-error-event',
    'VEHICLE_ERROR',
    '{
      "eventId":"authentication-error-event",
      "eventType":"VEHICLE_ERROR",
      "data":{
        "user":{"id":"smartcar-user-test"},
        "vehicle":{"id":"smartcar-vehicle-test"},
        "errors":[{
          "type":"CONNECTED_SERVICES_ACCOUNT",
          "code":"AUTHENTICATION_FAILED",
          "state":"ERROR",
          "signals":[{"code":"tractionbattery-range"}]
        }]
      },
      "meta":{"deliveredAt":"2026-09-05T13:00:00Z"}
    }'::jsonb,
    '2026-09-05T13:00:01Z'::timestamptz
  )
  $sql$,
  'authentication errors can be processed'
);
select is(
  (
    select status
    from public.vehicle_connections
    where vehicle_id = '20000000-0000-0000-0000-000000000001'
  ),
  'reauthorization_required',
  'active authentication errors require reauthorization'
);
select lives_ok(
  $sql$
  select *
  from public.ingest_smartcar_webhook(
    'authentication-resolved-event',
    'VEHICLE_ERROR',
    '{
      "eventId":"authentication-resolved-event",
      "eventType":"VEHICLE_ERROR",
      "data":{
        "user":{"id":"smartcar-user-test"},
        "vehicle":{"id":"smartcar-vehicle-test"},
        "errors":[{
          "type":"CONNECTED_SERVICES_ACCOUNT",
          "code":"AUTHENTICATION_FAILED",
          "state":"RESOLVED",
          "signals":[{"code":"tractionbattery-range"}]
        }]
      },
      "meta":{"deliveredAt":"2026-09-05T13:01:00Z"}
    }'::jsonb,
    '2026-09-05T13:01:01Z'::timestamptz
  )
  $sql$,
  'resolved authentication errors remain linkable'
);
select ok(
  (
    select processed_at is not null and processing_error is null
    from public.raw_smartcar_events
    where event_id = 'authentication-resolved-event'
  ),
  'resolved authentication events complete normalization'
);
select is(
  (
    select status
    from public.vehicle_connections
    where vehicle_id = '20000000-0000-0000-0000-000000000001'
  ),
  'connected',
  'resolved authentication errors restore the connection'
);

insert into public.vehicle_capabilities (
  vehicle_id,
  signal_code,
  is_supported,
  permission_status,
  last_status,
  checked_at,
  last_event_at
)
values (
  '20000000-0000-0000-0000-000000000001',
  'test-interval',
  true,
  'granted',
  'SUCCESS',
  '2026-09-01T10:00:01Z',
  '2026-09-01T10:00:00Z'
);

insert into public.vehicle_signal_readings (
  vehicle_id,
  source_event_id,
  signal_code,
  numeric_value,
  raw_value,
  oem_updated_at,
  received_at,
  quality_status
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'signal-error-event',
    'test-interval',
    1,
    '1'::jsonb,
    '2026-09-01T00:00:00Z',
    '2026-09-01T00:00:01Z',
    'success'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'resolved-error-event',
    'test-interval',
    2,
    '2'::jsonb,
    '2026-09-01T02:00:00Z',
    '2026-09-01T02:00:01Z',
    'success'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'older-state-event',
    'test-interval',
    null,
    '{"error":"late"}'::jsonb,
    '2026-09-01T10:00:00Z',
    '2026-09-01T10:00:01Z',
    'error'
  );

select is(
  (
    select round(average_interval_seconds)
    from public.get_signal_coverage_report(
      '20000000-0000-0000-0000-000000000001',
      '2026-09-01T00:00:00Z',
      '2026-09-02T00:00:00Z'
    )
    where signal_code = 'test-interval'
  ),
  7200::numeric,
  'report interval excludes failed OEM timestamps'
);
select is(
  (
    select round(average_interval_seconds)
    from public.vehicle_signal_coverage
    where vehicle_id = '20000000-0000-0000-0000-000000000001'
      and signal_code = 'test-interval'
  ),
  7200::numeric,
  'coverage view interval excludes failed OEM timestamps'
);

insert into public.smartcar_connect_sessions (
  id,
  user_id,
  state_hash,
  mode,
  expires_at
)
values (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  repeat('a', 64),
  'simulated',
  now() + interval '10 minutes'
);

select is(
  (
    select giret_user_id
    from public.begin_smartcar_connect_sync(
      '30000000-0000-0000-0000-000000000001',
      'smartcar-user-finalize'
    )
  ),
  '10000000-0000-0000-0000-000000000001'::uuid,
  'callback sync starts for the owning Giret user'
);
select is(
  public.finalize_smartcar_connect(
    '30000000-0000-0000-0000-000000000001',
    'smartcar-user-finalize',
    '[
      {
        "connectionId":"smartcar-connection-finalize",
        "smartcarVehicleId":"smartcar-vehicle-finalize",
        "externalId":"10000000-0000-0000-0000-000000000001",
        "permissions":["read_vehicle_info"],
        "make":"TEST",
        "model":"ATOMIC",
        "year":2026,
        "powertrainType":"BEV",
        "mode":"simulated",
        "createdAt":"2026-09-05T10:00:00Z",
        "updatedAt":"2026-09-05T10:00:01Z"
      }
    ]'::jsonb
  ),
  1,
  'callback finalizes one connection atomically'
);
select is(
  (
    select sync_status
    from public.smartcar_connect_sessions
    where id = '30000000-0000-0000-0000-000000000001'
      and consumed_at is not null
      and completed_at is not null
  ),
  'completed',
  'successful callback consumes and completes its session'
);
select is(
  (
    select count(*)::integer
    from public.vehicle_connections as connection
    join public.vehicles as vehicle on vehicle.id = connection.vehicle_id
    where connection.smartcar_connection_id =
      'smartcar-connection-finalize'
      and vehicle.smartcar_vehicle_id = 'smartcar-vehicle-finalize'
  ),
  1,
  'successful callback persists its vehicle and connection'
);

insert into public.smartcar_connect_sessions (
  id,
  user_id,
  state_hash,
  mode,
  expires_at
)
values (
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  repeat('b', 64),
  'simulated',
  now() + interval '10 minutes'
);

select lives_ok(
  $sql$
  select *
  from public.begin_smartcar_connect_sync(
    '30000000-0000-0000-0000-000000000002',
    'smartcar-user-rollback'
  )
  $sql$,
  'rollback test session starts'
);
select throws_ok(
  $sql$
  select public.finalize_smartcar_connect(
    '30000000-0000-0000-0000-000000000002',
    'smartcar-user-rollback',
    '[
      {
        "connectionId":"smartcar-connection-rolled-back",
        "smartcarVehicleId":"smartcar-vehicle-rolled-back",
        "externalId":"10000000-0000-0000-0000-000000000001",
        "permissions":[],
        "make":"TEST",
        "model":"ROLLBACK",
        "year":2026,
        "mode":"simulated",
        "createdAt":"2026-09-05T10:00:00Z"
      },
      {
        "connectionId":"",
        "smartcarVehicleId":"invalid",
        "externalId":"10000000-0000-0000-0000-000000000001",
        "permissions":[],
        "make":"TEST",
        "model":"INVALID",
        "year":2026,
        "mode":"simulated"
      }
    ]'::jsonb
  )
  $sql$,
  'P0001',
  'Smartcar connection payload is invalid',
  'invalid callback data rolls the transaction back'
);
select ok(
  (
    select consumed_at is null
    from public.smartcar_connect_sessions
    where id = '30000000-0000-0000-0000-000000000002'
  ),
  'failed callback leaves its session retryable'
);
select is(
  (
    select count(*)::integer
    from public.vehicles
    where smartcar_vehicle_id = 'smartcar-vehicle-rolled-back'
  ),
  0,
  'failed callback leaves no partial vehicle writes'
);

select * from finish();

rollback;
