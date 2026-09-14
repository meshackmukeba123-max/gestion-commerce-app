# Gestion Commerce — Application de gestion pour commerçants

Application web (utilisable aussi sur téléphone, installable comme une app — PWA) pour gérer une
boutique, une quincaillerie, une pharmacie ou tout autre petit commerce : stock, ventes, finances,
fournisseurs, plusieurs boutiques et utilisateurs, code-barres/QR, mode hors-ligne et paiement
mobile money.

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Technologies](#technologies)
3. [Installation (guide pas à pas)](#installation-guide-pas-à-pas)
4. [Comptes de démonstration](#comptes-de-démonstration)
5. [Structure du projet](#structure-du-projet)
6. [Rôles et permissions](#rôles-et-permissions)
7. [Mode hors-ligne](#mode-hors-ligne)
8. [Intégration Mobile Money](#intégration-mobile-money)
9. [Module fiscal](#module-fiscal)
10. [Déploiement en production](#déploiement-en-production)
11. [Limites connues](#limites-connues)

## Fonctionnalités

- **Gestion du stock** : entrées/sorties, suivi en temps réel, alertes de seuil critique, dates
  d'expiration (utile pour une pharmacie), scan et impression de codes-barres/QR.
- **Vente en caisse (POS)** : recherche ou scan produit, panier, paiement espèces / carte /
  virement / mobile money, calcul automatique de la taxe.
- **Tableau de bord financier** : chiffre d'affaires, dépenses, bénéfice net, graphique
  d'évolution, rapports mensuels/annuels exportables en **PDF** et **Excel**.
- **Multi-boutiques** : un même compte peut gérer plusieurs points de vente, chacun avec son
  propre stock, ses ventes et son taux de taxe.
- **Multi-utilisateurs avec rôles** : Administrateur, Gestionnaire, Vendeur — chacun avec des
  droits différents.
- **Fournisseurs & commandes d'achat** : carnet d'adresses, commandes, réception (met à jour le
  stock automatiquement), suivi des paiements.
- **Mode hors-ligne** : les ventes réalisées sans connexion internet sont enregistrées sur
  l'appareil puis synchronisées automatiquement dès le retour du réseau.
- **Mobile Money** : module prêt pour Orange Money, Airtel Money, M-Pesa (mode démo intégré sans
  configuration).
- **Module fiscal simplifié** : taux de taxe configurable par boutique, calcul automatique,
  résumé fiscal par période.

## Technologies

Conformément au choix "Next.js full-stack" (une seule base de code pour le site web, l'API et
la logique métier — plus simple à maintenir seul qu'un backend Express séparé) :

| Domaine | Technologie |
|---|---|
| Framework web + API | Next.js 16 (App Router, TypeScript) |
| Base de données | PostgreSQL (hébergé sur [Neon](https://neon.tech), connecté via l'intégration Vercel Marketplace), via Prisma ORM |
| Authentification | JWT (cookies httpOnly), mots de passe hachés avec bcrypt |
| Interface | React 19, Tailwind CSS |
| Graphiques | Recharts |
| Codes-barres / QR | html5-qrcode (scan caméra), jsbarcode / qrcode (génération) |
| Export | jsPDF (PDF), ExcelJS (Excel) |
| Mode hors-ligne | Service Worker + IndexedDB (idb) |

**À propos du mobile** : plutôt qu'une deuxième application React Native séparée à maintenir,
cette application est une **PWA (Progressive Web App)** : elle s'installe sur l'écran d'accueil
d'un téléphone Android ou iPhone comme une vraie application, fonctionne hors-ligne, et partage
100% du code avec la version web. C'est le choix le plus réaliste pour un commerçant seul ou une
petite équipe sans développeur mobile dédié.

## Installation (guide pas à pas)

Ce guide suppose que vous partez d'un ordinateur avec [Node.js](https://nodejs.org) (version 18
ou plus récente) déjà installé.

> **Astuce Windows/OneDrive** : si ce dossier se trouve dans OneDrive (comme c'est le cas par
> défaut ici), `npm install` peut être très lent car OneDrive synchronise chaque fichier créé
> dans `node_modules`. Pour aller plus vite, mettez OneDrive en pause pendant l'installation, ou
> déplacez le dossier `gestion-commerce-app` en dehors de OneDrive (ex. `C:\Projets\`).

### 1. Installer les dépendances

Ouvrez un terminal dans le dossier `gestion-commerce-app` puis lancez :

```bash
npm install
```

### 2. Configurer les variables d'environnement

Copiez le fichier d'exemple :

```bash
cp .env.example .env
```

Renseignez `DATABASE_URL` avec une base PostgreSQL (voir [Neon](https://neon.tech), gratuit) et
changez `JWT_SECRET` avant toute mise en production réelle. En développement, si le projet est
lié à Vercel (`vercel link` puis `vercel env pull`), un fichier `.env.local` avec une base Neon
déjà prête est généré automatiquement.

### 3. Créer la base de données et charger des données d'exemple

```bash
npm run setup
```

Cette commande crée les tables et insère deux boutiques de démonstration (une quincaillerie et
une pharmacie) avec des produits, ventes, dépenses et utilisateurs déjà prêts à l'emploi.

### 4. Démarrer l'application

```bash
npm run dev
```

Ouvrez ensuite [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### 5. Se connecter

Utilisez un des [comptes de démonstration](#comptes-de-démonstration) ci-dessous, ou créez votre
propre boutique depuis l'écran "Boutiques" une fois connecté.

## Comptes de démonstration

Mot de passe pour tous les comptes : **demo1234**

| Email | Rôle | Boutique |
|---|---|---|
| admin@demo.com | Administrateur | Quincaillerie La Bonne Affaire + Pharmacie Santé Plus |
| gestionnaire@demo.com | Gestionnaire | Quincaillerie La Bonne Affaire |
| vendeur@demo.com | Vendeur | Quincaillerie La Bonne Affaire |

## Structure du projet

```
gestion-commerce-app/
├── prisma/
│   ├── schema.prisma       # Modèle de la base de données
│   └── seed.ts             # Données de démonstration
├── public/
│   ├── manifest.json        # Manifeste PWA (icône, nom, installation)
│   └── sw.js                 # Service worker (cache hors-ligne)
├── src/
│   ├── app/
│   │   ├── (app)/            # Pages protégées (tableau de bord, stock, ventes…)
│   │   ├── api/               # Points d'API REST (produits, ventes, rapports…)
│   │   └── login/             # Page de connexion
│   ├── components/           # Composants réutilisables (formulaires, tableaux, scanner…)
│   ├── lib/
│   │   ├── auth.ts            # Sessions JWT
│   │   ├── rbac.ts            # Rôles et permissions
│   │   ├── sales.ts           # Logique de création de vente (stock, taxe)
│   │   ├── reports.ts         # Calcul des rapports financiers
│   │   ├── tax.ts             # Module fiscal
│   │   ├── payments/mobileMoney.ts  # Intégration mobile money
│   │   ├── export/            # Génération PDF / Excel
│   │   └── offline/           # File d'attente hors-ligne (IndexedDB) + synchronisation
│   └── middleware.ts          # Protection des routes (authentification)
└── README.md
```

## Rôles et permissions

| Fonctionnalité | Vendeur | Gestionnaire | Administrateur |
|---|:---:|:---:|:---:|
| Effectuer une vente | ✅ | ✅ | ✅ |
| Consulter le stock | ✅ | ✅ | ✅ |
| Modifier le stock / produits | ❌ | ✅ | ✅ |
| Finances, dépenses, rapports | ❌ | ✅ | ✅ |
| Fournisseurs, commandes d'achat | ❌ | ✅ | ✅ |
| Gérer les boutiques | ❌ | ❌ | ✅ |
| Gérer les utilisateurs | ❌ | ❌ | ✅ |

## Mode hors-ligne

La page **Vente (caisse)** fonctionne sans connexion internet :

1. Si l'appareil est hors-ligne au moment de valider une vente, celle-ci est enregistrée
   localement (IndexedDB, dans le navigateur).
2. Dès que la connexion revient, la synchronisation se déclenche automatiquement (visible dans le
   badge en haut de l'écran) et envoie les ventes en attente au serveur.
3. Le stock est décrémenté sur le serveur au moment de la synchronisation, pas au moment de la
   vente hors-ligne (pour éviter les incohérences si plusieurs appareils vendent en même temps).

**Limite connue** : seules les *ventes* sont mises en file d'attente hors-ligne. La consultation
du stock, des rapports, etc. nécessite une connexion (ou affiche la dernière version mise en
cache par le service worker).

## Intégration Mobile Money

Le fichier [`src/lib/payments/mobileMoney.ts`](src/lib/payments/mobileMoney.ts) définit une
interface commune (`chargeMobileMoney`) avec un fournisseur par opérateur :

- **MOCK** (démo) : fonctionne immédiatement, sans compte marchand, pour tester tout le parcours
  de vente.
- **ORANGE_MONEY**, **AIRTEL_MONEY**, **MPESA** : squelettes prêts à connecter à la vraie API de
  l'opérateur. Il vous faut un compte marchand auprès de l'opérateur, qui vous fournira une clé
  API à renseigner dans `.env` (`ORANGE_MONEY_API_KEY`, etc.). Complétez ensuite la méthode
  `charge()` du fournisseur correspondant avec l'appel HTTP réel documenté par l'opérateur.

## Module fiscal

Chaque boutique a un `taux de taxe` configurable (page **Paramètres**, ex. 16% pour une TVA).
Ce taux est appliqué automatiquement à chaque vente. La page **Finances** affiche un résumé par
période (chiffre d'affaires hors taxe, taxe collectée, chiffre d'affaires TTC) exportable en PDF
ou Excel pour la déclaration fiscale. Adaptez le taux et la logique dans
[`src/lib/tax.ts`](src/lib/tax.ts) selon la réglementation de votre pays.

## Déploiement en production

Ce projet est déjà déployé sur Vercel, avec une base PostgreSQL Neon connectée via
l'intégration Vercel Marketplace :

- Dépôt GitHub : https://github.com/meshackmukeba123-max/gestion-commerce-app
- La base Neon a été provisionnée avec `vercel install neon`, ce qui a automatiquement rempli
  `DATABASE_URL` (et variantes `POSTGRES_*`) dans les variables d'environnement Vercel
  (Production, Preview, Development).
- Le schéma a été appliqué avec `npx prisma db push`, et les données de démonstration chargées
  avec `npm run db:seed`.
- Chaque push sur la branche `main` du dépôt GitHub redéploie automatiquement l'application
  (intégration GitHub ↔ Vercel connectée à la création du projet).

### Reproduire ce déploiement pour un autre projet / une autre boutique

1. `vercel link` — connecte le dossier local à un projet Vercel (le crée si besoin).
2. `vercel install neon` — provisionne une base PostgreSQL Neon et remplit automatiquement les
   variables d'environnement du projet.
3. `npx prisma db push` puis `npm run db:seed` (optionnel) pour préparer les tables.
4. `vercel deploy --prod` — ou simplement `git push` si le dépôt GitHub est connecté au projet
   Vercel.

### Autres fournisseurs PostgreSQL

Sans passer par Vercel Marketplace, toute base PostgreSQL convient : créez-en une sur
[Neon](https://neon.tech), [Supabase](https://supabase.com) ou [Railway](https://railway.app),
puis renseignez son URL de connexion dans `DATABASE_URL`.

### Autres hébergeurs (Railway, Render, AWS, etc.)

L'application est un projet Next.js standard : toute plateforme supportant `npm run build` puis
`npm run start` (Node.js 18+) convient. Pensez à fournir les mêmes variables d'environnement.

## Limites connues

- Les icônes PWA fournies sont en SVG (`public/icons/icon.svg`) ; pour une publication plus
  large (certains anciens appareils Android), remplacez-les par des PNG 192×192 et 512×512.
- Les intégrations Mobile Money réelles (Orange Money, Airtel Money, M-Pesa) nécessitent un
  compte marchand actif auprès de l'opérateur — seul le mode démo est fonctionnel sans clé API.
- Le mode hors-ligne couvre les ventes ; les autres actions (gestion de stock, fournisseurs…)
  nécessitent une connexion.
