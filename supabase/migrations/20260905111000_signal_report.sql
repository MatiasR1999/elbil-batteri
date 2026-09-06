begin;

create or replace function public.get_signal_coverage_report(
  p_vehicle_id uuid,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns table (
  signal_code text,
  reading_count integer,
  successful_reading_count integer,
  distinct_oem_observation_count integer,
  error_reading_count integer,
  first_received_at timestamptz,
  last_received_at timestamptz,
  first_oem_updated_at timestamptz,
  last_oem_updated_at timestamptz,
  average_interval_seconds numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    capability.signal_code,
    count(reading.id)::integer,
    count(reading.id) filter (
      where reading.quality_status = 'success'
    )::integer,
    count(distinct reading.oem_updated_at) filter (
      where reading.quality_status = 'success'
        and reading.oem_updated_at is not null
    )::integer,
    count(reading.id) filter (
      where reading.quality_status <> 'success'
    )::integer,
    min(reading.received_at),
    max(reading.received_at),
    min(reading.oem_updated_at) filter (
      where reading.quality_status = 'success'
    ),
    max(reading.oem_updated_at) filter (
      where reading.quality_status = 'success'
    ),
    case
      when count(distinct reading.oem_updated_at) filter (
        where reading.quality_status = 'success'
          and reading.oem_updated_at is not null
      ) > 1 then
        (
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
        )::numeric
      else null
    end
  from public.vehicle_capabilities as capability
  left join public.vehicle_signal_readings as reading
    on reading.vehicle_id = capability.vehicle_id
    and reading.signal_code = capability.signal_code
    and reading.received_at >= p_period_start
    and reading.received_at < p_period_end
  where capability.vehicle_id = p_vehicle_id
  group by capability.signal_code
  order by capability.signal_code;
$$;

revoke all on function public.get_signal_coverage_report(
  uuid,
  timestamptz,
  timestamptz
) from public, anon, authenticated, service_role;

grant execute on function public.get_signal_coverage_report(
  uuid,
  timestamptz,
  timestamptz
) to service_role;

commit;
