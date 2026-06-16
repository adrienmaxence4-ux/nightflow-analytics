<div align="center">

# 🌙 Nightflow Analytics

### *Votre copilote IA pour piloter votre e-commerce.*

Un SaaS d'analytics e-commerce qui ne se contente pas d'afficher des chiffres :
il vous dit **ce qui se passe**, **pourquoi**, et **quoi faire** — en moins de 30 secondes.

Identité **Cyber Tokyo Night** · Next.js 14 · TypeScript · Tailwind · Framer Motion · Recharts · Supabase

</div>

---

## ✨ La promesse produit

Au lieu de dire :

> « Le taux de conversion est de 2,4 % »

Nightflow dit :

> « Votre conversion a baissé de 15 %. La cause principale est la chute du trafic
> mobile. Optimisez la page produit mobile. → Récupération estimée : +€2 400/sem. »

Chaque écran répond à **3 questions** : *Que se passe-t-il ? · Pourquoi ? · Que dois-je faire ?*

---

## 🧱 Stack technique

| Couche       | Technologie                                |
| ------------ | ------------------------------------------ |
| Framework    | Next.js 14 (App Router) + React 18         |
| Langage      | TypeScript (strict)                        |
| Styling      | TailwindCSS + design system maison         |
| UI           | Composants style shadcn/ui (`components/ui`) |
| Animations   | Framer Motion                              |
| Graphiques   | Recharts                                    |
| Auth & DB    | Supabase (optionnel — mode démo intégré)   |
| Hébergement  | Vercel (auto-deploy via GitHub)            |

---

## 📁 Architecture

```
nightflow-analytics/
├── app/
│   ├── (app)/                 # Espace authentifié (sidebar + topbar)
│   │   ├── dashboard/         # 1. Dashboard — KPI, charts, funnel, copilot
│   │   ├── analytics/         # 2. Analytics — canaux, appareils
│   │   ├── products/          # 3. Products — table + détail
│   │   ├── marketing/         # 4. Marketing — campagnes & ROAS
│   │   ├── copilot/           # 5. AI Copilot — insights + chat
│   │   ├── notifications/     # 6. Alertes intelligentes
│   │   ├── settings/          # 7. Profil & intégrations
│   │   ├── billing/           # 8. Plans & facturation
│   │   └── layout.tsx         # Shell + garde d'authentification
│   ├── (auth)/                # 9. login / signup
│   ├── onboarding/            # 10. Flow d'accueil multi-étapes
│   ├── api/                   # analytics · copilot · health
│   ├── layout.tsx             # Root + starfield + providers
│   └── globals.css
├── components/
│   ├── ui/                    # Primitives (button, card, badge, sheet, dialog…)
│   ├── layout/                # Sidebar, Topbar, MobileNav, Starfield…
│   └── auth/                  # AuthCard
├── features/                  # Modules métier
│   ├── dashboard/             # KpiCard, RevenueChart, Funnel, ProductBars…
│   ├── copilot/               # InsightCard (Quoi/Pourquoi/Action), CopilotPanel
│   └── products/              # ProductTable, ProductDrawer
├── services/                  # Couche données (point de swap pour vraies API)
│   ├── analytics.service.ts
│   ├── copilot.service.ts
│   ├── products.service.ts
│   └── mock/data.ts
├── hooks/                     # use-auth, use-toast, use-range
├── lib/                       # utils, env, nav, supabase/{client,server}
├── types/                     # Types métier partagés
├── utils/                     # Formatters
├── supabase/schema.sql        # Schéma DB Phase 2
└── middleware.ts              # Refresh session Supabase (no-op en démo)
```

---

## 🚀 Démarrage local

```bash
# 1. Installer
npm install

# 2. (Optionnel) configurer l'environnement
cp .env.example .env.local      # laissez vide pour le MODE DÉMO

# 3. Lancer
npm run dev
```

➡️ Ouvrez **http://localhost:3000** — vous arrivez sur l'écran de connexion.
En **mode démo** (aucune clé requise), cliquez simplement sur *Se connecter* pour entrer.

> Le projet **tourne immédiatement après le clone**, sans aucune configuration.
> Les clés (Supabase, IA) ne sont nécessaires que pour passer en production réelle.

### Scripts

| Commande            | Action                          |
| ------------------- | ------------------------------- |
| `npm run dev`       | Serveur de développement        |
| `npm run build`     | Build de production             |
| `npm run start`     | Serveur de production           |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | Vérification TypeScript         |

---

## 🔑 Variables d'environnement

Voir [`.env.example`](.env.example). Toutes sont **optionnelles** en démo.

| Variable                          | Rôle                                    |
| --------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | URL projet Supabase (auth + DB)         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Clé publique Supabase                   |
| `SUPABASE_SERVICE_ROLE_KEY`       | Clé serveur (jamais exposée au client)  |
| `ANTHROPIC_API_KEY`               | IA réelle pour le Copilot (Phase 2)     |
| `NEXT_PUBLIC_SITE_URL`            | URL publique (redirections auth)        |

---

## ☁️ Déploiement GitHub → Vercel (auto-deploy)

> Objectif : `git push` → mise en ligne automatique. **Aucune config complexe.**

### 1. Créer le dépôt GitHub & pousser

```bash
git init
git add .
git commit -m "feat: initial Nightflow Analytics"
git branch -M main
git remote add origin git@github.com:<vous>/nightflow-analytics.git
git push -u origin main
```

### 2. Connecter Vercel

1. Allez sur **[vercel.com/new](https://vercel.com/new)** et importez le dépôt.
2. Vercel détecte Next.js automatiquement — aucun réglage nécessaire.
3. *(Optionnel)* ajoutez vos variables d'environnement dans **Settings → Environment Variables**.
4. Cliquez sur **Deploy**.

### 3. CI/CD automatique

Désormais :

```bash
git add .
git commit -m "update"
git push
```

→ GitHub déclenche Vercel → Vercel rebuild → le site est mis à jour en ligne.
Chaque Pull Request obtient en plus une **URL de prévisualisation** unique.

---

## 🗄️ Base de données & migrations Supabase

Le schéma est **versionné** dans [`supabase/migrations/`](supabase/migrations) (source de
vérité unique). Chaque fichier est une migration idempotente et non destructive.

| Migration | Contenu |
| --------- | ------- |
| `…_init_core.sql` | `profiles`, fonctions `set_updated_at` / `handle_new_user`, RLS |
| `…_commerce.sql` | `stores`, `products`, `orders`, `order_items`, `campaigns`, `metrics_daily`, helper `owns_store()` |
| `…_intelligence.sql` | `insights`, `recommendations`, `notifications`, `integrations`, enums |

Toutes les tables ont **RLS activé** : un utilisateur n'accède qu'à ses propres
boutiques et données.

### Activer la base (Phase 2)

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Copiez `URL` + `anon key` dans `.env.local` (et dans Vercel).
3. Installez la CLI puis liez le projet :
   ```bash
   npm i -g supabase
   supabase link --project-ref <project-id>
   ```
4. Appliquez les migrations :
   ```bash
   npm run db:push        # pousse supabase/migrations vers le projet lié
   ```
5. (Optionnel) régénérez les types TypeScript depuis la base :
   ```bash
   npm run gen:types      # écrit types/database.ts
   ```

### Workflow de migration

- **Créer** une migration : `supabase migration new <nom>` (ou `npm run db:diff -- <nom>`
  pour la générer à partir d'un changement local), puis éditez le SQL.
- **Tester en local** : `npm run db:reset` (rejoue toutes les migrations + `seed.sql`
  MoonStore).
- **Déployer** : commitez le fichier dans `supabase/migrations/` et `git push`.
  Le workflow [`supabase-migrations.yml`](.github/workflows/supabase-migrations.yml)
  exécute automatiquement `supabase db push` (voir secrets ci-dessous).

> ⚠️ Ne modifiez jamais une migration déjà déployée — créez-en une nouvelle.

---

## ⚙️ CI/CD — GitHub Actions

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) s'exécute **à chaque push et PR** :

1. `npm ci` → 2. **TypeScript** (`typecheck`) → 3. **ESLint** (`lint`) →
4. **Tests** (`vitest`) → 5. **Build** (`next build`).

[`.github/workflows/supabase-migrations.yml`](.github/workflows/supabase-migrations.yml)
pousse les migrations vers Supabase à chaque push sur `main` modifiant
`supabase/migrations/`.

### Secrets GitHub requis pour les migrations auto

| Secret | Où le trouver |
| ------ | ------------- |
| `SUPABASE_ACCESS_TOKEN` | account.supabase.com → Access Tokens |
| `SUPABASE_PROJECT_ID` | Project Settings → General → Reference ID |
| `SUPABASE_DB_PASSWORD` | Project Settings → Database |

Sans ces secrets, le job de migration **s'ignore proprement** (le pipeline reste vert).

---

## 🤖 Brancher la vraie IA (Phase 2)

Le Copilot est isolé dans [`services/copilot.service.ts`](services/copilot.service.ts).
Ajoutez `ANTHROPIC_API_KEY`, puis remplacez le bloc mock par un appel à l'API
Claude — le reste de l'app reste inchangé.

---

## 🎨 Design system

| Token                | Valeur                          |
| -------------------- | ------------------------------- |
| `bg-night-950`       | Nuit profonde `#070B1A`         |
| `bg-night-900`       | Bleu nuit `#0B1026`             |
| `text-neon-cyan`     | Cyan néon `#3df2ff`             |
| `text-neon-pink`     | Rose néon `#ff5cae`             |
| `text-neon-violet`   | Violet cosmique `#9a6bff`       |
| `.glass-card`        | Carte glassmorphism             |
| `shadow-glow`        | Halo néon cyan                  |
| `.night-bg`          | Fond galaxie animé              |

---

<div align="center">

Construit avec ✦ pour le ciel nocturne de Tokyo.

</div>
