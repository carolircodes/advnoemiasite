update public.ecosystem_catalog_items
set
  title = 'Circulo Essencial',
  subtitle = 'Biblioteca estrategica privada para quem entra na primeira jornada premium do ecossistema.',
  description = 'Oferta ancora da primeira jornada premium: leitura curada, organizacao de beneficios, trilha reservada e comunidade conectada em beta privado e elegante.',
  availability_status = 'private_beta',
  portal_workspace = 'ecosystem_hub',
  visibility_scope = 'beta_invited_only',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'phase', '12.2',
    'anchor_offer', true,
    'anchor_plan_code', 'circulo_essencial',
    'anchor_track_slug', 'trilha-clareza-estrategica',
    'anchor_community_slug', 'circulo-reservado',
    'primary_cta', 'Entrar no Circulo Essencial',
    'beta_mode', 'controlled_private'
  )
where slug = 'biblioteca-estrategica-premium';

update public.ecosystem_plan_tiers
set
  headline = 'Entrada privada e curada para a primeira experiencia premium continua do ecossistema.',
  description = 'Plano-base da jornada ancora. Organiza beneficios, acesso beta, conteudo reservado e comunidade inicial sem acionar cobranca recorrente operacional.',
  status = 'private_beta',
  portal_workspace = 'plans_benefits',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'phase', '12.2',
    'anchor_plan', true,
    'beta_mode', 'manual_curated_access',
    'billing_mode', 'not_live'
  )
where code = 'circulo_essencial';

update public.ecosystem_plan_tiers
set
  headline = 'Camada superior ainda reservada para evolucao futura do ecossistema.',
  description = 'Mantido em draft para evitar abertura prematura de escopo.',
  status = 'draft',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'phase', '12.2',
    'kept_in_draft', true
  )
where code = 'circulo_reserva';

update public.ecosystem_plan_benefits
set
  status = case
    when plan_tier_id in (
      select id from public.ecosystem_plan_tiers where code = 'circulo_essencial'
    ) then 'private_beta'::public.ecosystem_availability_status
    else status
  end,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('phase', '12.2')
where plan_tier_id in (
  select id from public.ecosystem_plan_tiers where code in ('circulo_essencial', 'circulo_reserva')
);

update public.ecosystem_content_tracks
set
  title = 'Biblioteca de Clareza Estrategica',
  subtitle = 'Trilha inaugural da jornada premium em beta privado.',
  description = 'Conteudo premium inicial que ancora a experiencia de valor continuo do Circulo Essencial.',
  status = 'private_beta',
  portal_workspace = 'premium_content',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'phase', '12.2',
    'anchor_track', true,
    'access_mode', 'grant_required'
  )
where slug = 'trilha-clareza-estrategica';

update public.ecosystem_content_modules
set
  title = 'Primeira Leitura Reservada',
  description = 'Modulo inicial da jornada premium, com leitura curada e framing de valor.',
  status = 'private_beta',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('phase', '12.2')
where slug = 'fundacao-editorial';

update public.ecosystem_content_units
set
  title = 'Boas-vindas ao Circulo Essencial',
  teaser = 'Uma leitura reservada para situar a cliente dentro da primeira camada premium do ecossistema.',
  body_markdown = 'Esta unidade marca a ativacao controlada da primeira jornada premium do ecossistema. O acesso existe por grant manual, com framing nobre e escopo contido.',
  status = 'private_beta',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('phase', '12.2')
where slug = 'boas-vindas-curadas';

update public.ecosystem_content_assets
set
  title = 'Mapa reservado de leitura',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('phase', '12.2', 'anchor_asset', true)
where title = 'Mapa de leitura premium';

update public.ecosystem_communities
set
  title = 'Sala Reservada do Circulo',
  description = 'Extensao comunitaria da jornada premium inicial, com entrada controlada e linguagem de permanencia sofisticada.',
  status = 'private_beta',
  onboarding_copy = 'Sua entrada na Sala Reservada do Circulo acontece de forma curada, como extensao natural da biblioteca premium e da trilha inaugural.',
  offboarding_copy = 'A saida da comunidade preserva historico, respeito e fronteira clara com o atendimento juridico principal.',
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'phase', '12.2',
    'anchor_community', true,
    'beta_mode', 'controlled_private'
  )
where slug = 'circulo-reservado';

with target_profile as (
  select id
  from public.profiles
  where role = 'cliente'
    and is_active = true
    and first_login_completed_at is not null
  order by created_at asc
  limit 1
),
anchor_catalog as (
  select id
  from public.ecosystem_catalog_items
  where slug = 'biblioteca-estrategica-premium'
),
anchor_plan as (
  select id
  from public.ecosystem_plan_tiers
  where code = 'circulo_essencial'
),
anchor_track as (
  select id
  from public.ecosystem_content_tracks
  where slug = 'trilha-clareza-estrategica'
),
anchor_community as (
  select id
  from public.ecosystem_communities
  where slug = 'circulo-reservado'
)
insert into public.ecosystem_subscriptions (
  profile_id,
  plan_tier_id,
  origin_catalog_item_id,
  status,
  cadence,
  renewal_mode,
  current_period_started_at,
  current_period_ends_at,
  metadata
)
select
  target_profile.id,
  anchor_plan.id,
  anchor_catalog.id,
  'active',
  'monthly',
  'manual_beta',
  timezone('utc', now()),
  timezone('utc', now()) + interval '30 days',
  jsonb_build_object(
    'phase', '12.2',
    'source', 'controlled_beta_activation',
    'billing_live', false
  )
from target_profile, anchor_plan, anchor_catalog
where not exists (
  select 1
  from public.ecosystem_subscriptions
  where profile_id = target_profile.id
    and plan_tier_id = anchor_plan.id
);

with target_profile as (
  select id
  from public.profiles
  where role = 'cliente'
    and is_active = true
    and first_login_completed_at is not null
  order by created_at asc
  limit 1
),
anchor_catalog as (
  select id
  from public.ecosystem_catalog_items
  where slug = 'biblioteca-estrategica-premium'
),
anchor_subscription as (
  select id, profile_id
  from public.ecosystem_subscriptions
  where metadata ->> 'source' = 'controlled_beta_activation'
  order by created_at asc
  limit 1
)
insert into public.ecosystem_access_grants (
  profile_id,
  catalog_item_id,
  subscription_id,
  source_type,
  grant_status,
  portal_workspace,
  access_scope,
  starts_at,
  metadata
)
select
  target_profile.id,
  anchor_catalog.id,
  anchor_subscription.id,
  'manual_beta',
  'active',
  'ecosystem_hub',
  'founding_beta',
  timezone('utc', now()),
  jsonb_build_object(
    'phase', '12.2',
    'journey', 'circulo_essencial',
    'source', 'controlled_beta_activation'
  )
from target_profile, anchor_catalog, anchor_subscription
where not exists (
  select 1
  from public.ecosystem_access_grants
  where profile_id = target_profile.id
    and catalog_item_id = anchor_catalog.id
    and access_scope = 'founding_beta'
);

with target_profile as (
  select id
  from public.profiles
  where role = 'cliente'
    and is_active = true
    and first_login_completed_at is not null
  order by created_at asc
  limit 1
),
anchor_community as (
  select id
  from public.ecosystem_communities
  where slug = 'circulo-reservado'
),
anchor_subscription as (
  select id, profile_id
  from public.ecosystem_subscriptions
  where metadata ->> 'source' = 'controlled_beta_activation'
  order by created_at asc
  limit 1
)
insert into public.ecosystem_community_memberships (
  profile_id,
  community_id,
  subscription_id,
  status,
  access_level,
  joined_at,
  last_active_at,
  metadata
)
select
  target_profile.id,
  anchor_community.id,
  anchor_subscription.id,
  'active',
  'founding_beta',
  timezone('utc', now()),
  timezone('utc', now()),
  jsonb_build_object(
    'phase', '12.2',
    'source', 'controlled_beta_activation'
  )
from target_profile, anchor_community, anchor_subscription
where not exists (
  select 1
  from public.ecosystem_community_memberships
  where profile_id = target_profile.id
    and community_id = anchor_community.id
);

with target_profile as (
  select id
  from public.profiles
  where role = 'cliente'
    and is_active = true
    and first_login_completed_at is not null
  order by created_at asc
  limit 1
),
anchor_track as (
  select id
  from public.ecosystem_content_tracks
  where slug = 'trilha-clareza-estrategica'
),
anchor_module as (
  select id
  from public.ecosystem_content_modules
  where slug = 'fundacao-editorial'
),
anchor_unit as (
  select id
  from public.ecosystem_content_units
  where slug = 'boas-vindas-curadas'
)
insert into public.ecosystem_content_progress (
  profile_id,
  track_id,
  module_id,
  unit_id,
  status,
  progress_percent,
  metadata
)
select
  target_profile.id,
  anchor_track.id,
  anchor_module.id,
  anchor_unit.id,
  'not_started',
  0,
  jsonb_build_object(
    'phase', '12.2',
    'source', 'controlled_beta_activation'
  )
from target_profile, anchor_track, anchor_module, anchor_unit
where not exists (
  select 1
  from public.ecosystem_content_progress
  where profile_id = target_profile.id
    and track_id = anchor_track.id
    and unit_id = anchor_unit.id
);

with target_profile as (
  select id
  from public.profiles
  where role = 'cliente'
    and is_active = true
    and first_login_completed_at is not null
  order by created_at asc
  limit 1
)
insert into public.product_events (
  event_key,
  event_group,
  page_path,
  profile_id,
  payload
)
select
  event.event_key,
  'ecosystem',
  event.page_path,
  target_profile.id,
  event.payload
from target_profile
cross join (
  values
    (
      'product_selected',
      '/cliente/ecossistema',
      jsonb_build_object('phase', '12.2', 'source', 'phase12_2_activation', 'journey', 'circulo_essencial')
    ),
    (
      'access_granted',
      '/cliente/ecossistema',
      jsonb_build_object('phase', '12.2', 'source', 'phase12_2_activation', 'journey', 'circulo_essencial', 'access_scope', 'founding_beta')
    ),
    (
      'content_unlocked',
      '/cliente/ecossistema/conteudo',
      jsonb_build_object('phase', '12.2', 'source', 'phase12_2_activation', 'journey', 'circulo_essencial', 'track_slug', 'trilha-clareza-estrategica')
    ),
    (
      'member_joined',
      '/cliente/ecossistema/comunidade',
      jsonb_build_object('phase', '12.2', 'source', 'phase12_2_activation', 'journey', 'circulo_essencial', 'community_slug', 'circulo-reservado')
    ),
    (
      'retention_signal',
      '/cliente/ecossistema',
      jsonb_build_object('phase', '12.2', 'source', 'phase12_2_activation', 'journey', 'circulo_essencial', 'signal', 'founding_beta_activated')
    )
) as event(event_key, page_path, payload)
where not exists (
  select 1
  from public.product_events existing
  where existing.event_group = 'ecosystem'
    and existing.event_key = event.event_key
    and existing.profile_id = target_profile.id
    and existing.payload ->> 'source' = 'phase12_2_activation'
);
