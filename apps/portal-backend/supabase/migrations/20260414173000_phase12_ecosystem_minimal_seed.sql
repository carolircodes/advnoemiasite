insert into public.ecosystem_catalog_items (
  slug,
  title,
  subtitle,
  description,
  vertical,
  catalog_kind,
  delivery_kind,
  access_model,
  availability_status,
  brand_scope,
  legal_boundary,
  portal_workspace,
  visibility_scope,
  metadata
)
select
  'biblioteca-estrategica-premium',
  'Biblioteca Estrategica Premium',
  'Fundacao privada do ecossistema premium',
  'Hub inicial para materiais premium, trilhas curadas e comunidade adjacente ao atendimento juridico principal.',
  'membership',
  'membership',
  'portal_content',
  'subscription',
  'draft',
  'shared_brand',
  'adjacent_ecosystem',
  'ecosystem_hub',
  'internal',
  jsonb_build_object(
    'seed_origin', 'phase12_1',
    'visibility', 'internal_only',
    'governance', 'minimal_elegant_seed'
  )
where not exists (
  select 1
  from public.ecosystem_catalog_items
  where slug = 'biblioteca-estrategica-premium'
);

insert into public.ecosystem_plan_tiers (
  code,
  name,
  headline,
  description,
  cadence,
  status,
  brand_scope,
  legal_boundary,
  portal_workspace,
  price_amount,
  metadata
)
select
  'circulo_essencial',
  'Circulo Essencial',
  'Entrada privada e controlada do ecossistema premium',
  'Plano-base em estado draft para organizar beneficios, acesso premium e leitura de recorrencia sem ativacao comercial publica.',
  'monthly',
  'draft',
  'shared_brand',
  'adjacent_ecosystem',
  'plans_benefits',
  null,
  jsonb_build_object('seed_origin', 'phase12_1', 'visibility', 'internal_only')
where not exists (
  select 1
  from public.ecosystem_plan_tiers
  where code = 'circulo_essencial'
);

insert into public.ecosystem_plan_tiers (
  code,
  name,
  headline,
  description,
  cadence,
  status,
  brand_scope,
  legal_boundary,
  portal_workspace,
  price_amount,
  metadata
)
select
  'circulo_reserva',
  'Circulo Reserva',
  'Camada superior de curadoria, conteudo e comunidade',
  'Plano premium em draft para estruturar beneficios superiores, comunidade reservada e evolucao futura do ecossistema.',
  'annual',
  'draft',
  'future_subbrand',
  'adjacent_ecosystem',
  'plans_benefits',
  null,
  jsonb_build_object('seed_origin', 'phase12_1', 'visibility', 'internal_only')
where not exists (
  select 1
  from public.ecosystem_plan_tiers
  where code = 'circulo_reserva'
);

insert into public.ecosystem_plan_benefits (
  plan_tier_id,
  benefit_key,
  title,
  description,
  benefit_type,
  delivery_kind,
  access_scope,
  position,
  status,
  metadata
)
select
  plan.id,
  benefit.benefit_key,
  benefit.title,
  benefit.description,
  benefit.benefit_type,
  benefit.delivery_kind::public.ecosystem_delivery_kind,
  benefit.access_scope,
  benefit.position,
  'draft',
  jsonb_build_object('seed_origin', 'phase12_1')
from public.ecosystem_plan_tiers as plan
cross join (
  values
    (
      'circulo_essencial',
      'catalogo_fundacao',
      'Acesso ao hub premium em fundacao',
      'Base para entrada controlada em catalogo, materiais e leitura de beneficios.',
      'access',
      'portal_content',
      'foundation',
      10
    ),
    (
      'circulo_essencial',
      'fila_comunidade_reservada',
      'Fila prioritaria da comunidade reservada',
      'Mantem a comunidade preparada sem liberar interacao publica prematura.',
      'community',
      'community_access',
      'waitlist',
      20
    ),
    (
      'circulo_reserva',
      'curadoria_estrategica',
      'Curadoria premium de conteudo e beneficios',
      'Camada superior para trilhas, materiais e experiencia mais aprofundada.',
      'curation',
      'hybrid',
      'expanded',
      10
    ),
    (
      'circulo_reserva',
      'sala_reservada',
      'Sala reservada da comunidade premium',
      'Prepara a futura comunidade fechada sem mistura com a operacao juridica principal.',
      'community',
      'community_access',
      'private_room',
      20
    )
) as benefit(plan_code, benefit_key, title, description, benefit_type, delivery_kind, access_scope, position)
where plan.code = benefit.plan_code
  and not exists (
    select 1
    from public.ecosystem_plan_benefits existing
    where existing.plan_tier_id = plan.id
      and existing.benefit_key = benefit.benefit_key
  );

insert into public.ecosystem_content_tracks (
  slug,
  title,
  subtitle,
  description,
  status,
  access_model,
  portal_workspace,
  certification_enabled,
  estimated_duration_minutes,
  metadata
)
select
  'trilha-clareza-estrategica',
  'Trilha de Clareza Estrategica',
  'Fundacao editorial do ecossistema premium',
  'Primeira trilha draft para organizar consumo premium, progresso e materiais de apoio antes de qualquer liberacao publica.',
  'draft',
  'plan_included',
  'premium_content',
  false,
  45,
  jsonb_build_object('seed_origin', 'phase12_1', 'visibility', 'internal_only')
where not exists (
  select 1
  from public.ecosystem_content_tracks
  where slug = 'trilha-clareza-estrategica'
);

insert into public.ecosystem_content_modules (
  track_id,
  slug,
  title,
  description,
  position,
  status,
  estimated_duration_minutes,
  metadata
)
select
  track.id,
  'fundacao-editorial',
  'Fundacao Editorial',
  'Modulo inicial para estruturar a linguagem premium, o framing de valor e o consumo da nova camada.',
  10,
  'draft',
  30,
  jsonb_build_object('seed_origin', 'phase12_1')
from public.ecosystem_content_tracks as track
where track.slug = 'trilha-clareza-estrategica'
  and not exists (
    select 1
    from public.ecosystem_content_modules
    where track_id = track.id
      and slug = 'fundacao-editorial'
  );

insert into public.ecosystem_content_units (
  module_id,
  slug,
  title,
  unit_type,
  teaser,
  body_markdown,
  position,
  status,
  unlock_rule,
  estimated_duration_minutes,
  metadata
)
select
  module.id,
  'boas-vindas-curadas',
  'Boas-vindas Curadas',
  'lesson',
  'Leitura inaugural para situar a cliente dentro do ecossistema premium sem tocar no core juridico.',
  'Esta unidade existe para validar a fundacao do ecossistema premium e sua separacao semantica do atendimento juridico principal.',
  10,
  'draft',
  'included',
  15,
  jsonb_build_object('seed_origin', 'phase12_1')
from public.ecosystem_content_modules as module
where module.slug = 'fundacao-editorial'
  and not exists (
    select 1
    from public.ecosystem_content_units
    where module_id = module.id
      and slug = 'boas-vindas-curadas'
  );

insert into public.ecosystem_content_assets (
  unit_id,
  asset_type,
  title,
  delivery_url,
  file_name,
  position,
  metadata
)
select
  unit_item.id,
  'material',
  'Mapa de leitura premium',
  null,
  'mapa-leitura-premium.md',
  10,
  jsonb_build_object('seed_origin', 'phase12_1', 'placeholder', true)
from public.ecosystem_content_units as unit_item
where unit_item.slug = 'boas-vindas-curadas'
  and not exists (
    select 1
    from public.ecosystem_content_assets
    where unit_id = unit_item.id
      and title = 'Mapa de leitura premium'
  );

insert into public.ecosystem_communities (
  slug,
  title,
  description,
  status,
  access_model,
  portal_workspace,
  onboarding_copy,
  offboarding_copy,
  metadata
)
select
  'circulo-reservado',
  'Circulo Reservado',
  'Comunidade premium inicial em estado draft para organizar pertencimento, permanencia e saida com elegancia.',
  'draft',
  'plan_included',
  'community',
  'Entrada privada e controlada. A comunidade nasce primeiro como arquitetura, nao como volume.',
  'Saida respeitosa e rastreada, sem confundir comunidade com atendimento juridico.',
  jsonb_build_object('seed_origin', 'phase12_1', 'visibility', 'internal_only')
where not exists (
  select 1
  from public.ecosystem_communities
  where slug = 'circulo-reservado'
);
