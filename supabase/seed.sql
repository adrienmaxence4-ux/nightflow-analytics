-- ═══════════════════════════════════════════════════════════════
-- Nightflow Analytics — Seed de démonstration : MoonStore
-- Exécuté par `supabase db reset` (environnement local/dev).
-- Idempotent : rattache les données au premier utilisateur Auth.
-- Ne fait rien si aucun utilisateur n'existe encore.
-- ═══════════════════════════════════════════════════════════════

do $$
declare
  v_user  uuid;
  v_store uuid := '00000000-0000-0000-0000-0000000000aa';
begin
  select id into v_user from auth.users order by created_at limit 1;

  if v_user is null then
    raise notice 'Seed ignoré : aucun utilisateur dans auth.users. Créez un compte puis relancez le reset.';
    return;
  end if;

  -- Boutique
  insert into public.stores (id, owner_id, name, slug, platform, currency)
  values (v_store, v_user, 'MoonStore', 'moonstore', 'shopify', 'EUR')
  on conflict (id) do update set name = excluded.name;

  -- Produits
  insert into public.products (store_id, external_id, name, icon, price_cents, stock, conversion, trend, delta, note) values
    (v_store, 'galaxy-lamp',    'Galaxy Lamp',        '🌌', 6000, 14,  5.10, 'up',   '+31%', '58% du CA — stock critique.'),
    (v_store, 'sakura-hoodie',  'Sakura Hoodie',      '🌸', 6000, 130, 3.60, 'up',   '+14%', 'Croissance régulière, bonne marge.'),
    (v_store, 'lunar-bottle',   'Lunar Bottle',       '🌙', 3000, 240, 3.00, 'up',   '+7%',  'Produit d''appel idéal en up-sell.'),
    (v_store, 'tokyo-poster',   'Tokyo Night Poster', '🗼', 2000, 320, 2.70, 'down', '-6%',  'Visuel mobile trop lent.'),
    (v_store, 'nebula-mug',     'Nebula Mug',         '☕', 2000, 410, 2.10, 'down', '-11%', 'Faible conversion mobile.'),
    (v_store, 'star-projector', 'Star Projector',     '✨', 8000, 76,  4.20, 'up',   '+22%', 'Pépite cachée, forte marge.')
  on conflict (store_id, external_id) do update
    set stock = excluded.stock, conversion = excluded.conversion, trend = excluded.trend, delta = excluded.delta;

  -- Campagnes
  insert into public.campaigns (store_id, channel, status, spend_cents, revenue_cents) values
    (v_store, 'TikTok Ads',    'active', 310000, 1426000),
    (v_store, 'Meta Ads',      'active', 240000, 816000),
    (v_store, 'Google Ads',    'active', 120000, 456000),
    (v_store, 'Klaviyo Email', 'active', 18000,  414000),
    (v_store, 'Influenceurs',  'paused', 90000,  126000)
  on conflict do nothing;

  -- Métriques (7 derniers jours)
  insert into public.metrics_daily (store_id, date, revenue_cents, orders, visitors, conversion)
  select v_store,
         (current_date - g),
         (550000 + g * 30000),
         (118 + g * 5),
         (2000 + g * 40),
         2.34
  from generate_series(0, 6) as g
  on conflict (store_id, date) do nothing;

  -- Insights
  insert into public.insights (store_id, severity, icon, what, why, action, impact, source) values
    (v_store, 'critical', '📦', 'La Galaxy Lamp passe sous le seuil de stock critique (14 unités).', 'Les ventes accélèrent (+31%) avec 12 j de délai de réappro.', 'Commandez 200 unités ou activez une liste d''attente.', 'Évite ~€9 800 de ventes perdues', 'Ventes × stock'),
    (v_store, 'warning',  '📉', 'Votre conversion a baissé de 14% cette semaine.', '80% de la baisse vient du mobile (fiche produit en 3,6 s).', 'Compressez les images et activez Apple Pay.', '+€2 100 / sem.', '4 200 sessions mobiles'),
    (v_store, 'positive', '✉️', 'Klaviyo affiche un ROAS de 23× pour seulement €180.', 'Canal le plus rentable, largement sous-investi.', 'Augmentez le budget email de +40%.', '+€3 400 / sem.', 'Analyse multi-canal')
  on conflict do nothing;

  -- Recommandations
  insert into public.recommendations (store_id, title, detail, impact, impact_level, cta, effort) values
    (v_store, 'Réapprovisionner la Galaxy Lamp', 'Stock critique · 14 unités', '+€9.8k', 'high', 'Prioriser', 'Faible'),
    (v_store, 'Optimiser le checkout mobile', 'Apple Pay + compression images', '+€2.1k', 'high', 'Optimiser', 'Moyen'),
    (v_store, 'Booster le budget Klaviyo +40%', 'ROAS 23× · sous-investi', '+€3.4k', 'high', 'Appliquer', 'Faible')
  on conflict do nothing;

  -- Notifications
  insert into public.notifications (user_id, store_id, type, severity, icon, title, body, read) values
    (v_user, v_store, 'stock', 'critical', '🚨', 'Rupture imminente — Galaxy Lamp', 'Il reste 14 unités. Rupture estimée dans 1,8 jour.', false),
    (v_user, v_store, 'ads',   'positive', '🎵', 'Campagne TikTok performante', 'ROAS de 4,6 sur 24h.', false)
  on conflict do nothing;

  raise notice 'Seed MoonStore appliqué pour l''utilisateur %', v_user;
end $$;
