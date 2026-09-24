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
11. [Intégration continue (CI)](#intégration-continue-ci)
12. [Suivi des erreurs (Sentry)](#suivi-des-erreurs-sentry)
13. [Limites connues](#limites-connues)

## Fonctionnalités

- **Gestion du stock** : entrées/sorties, suivi en temps réel, alertes de seuil critique, dates
  d'expiration (utile pour une pharmacie), scan et impression de codes-barres/QR.
- **Vente en caisse (POS)** : recherche ou scan produit, panier, paiement espèces / carte /
  virement / mobile money, calcul automatique de la taxe.
- **Annulation de ventes** (Gestionnaire/Administrateur) : avec motif obligatoire, les articles
  sont remis en stock, la vente sort du chiffre d'affaires et la facture reste consultable avec
  la mention « annulée » (numérotation sans trou, traçabilité complète).
- **Retours partiels** (Gestionnaire/Administrateur) : le client rend une partie des articles ;
  ils reviennent en stock, le montant (taxe comprise, au prorata) est déduit du chiffre
  d'affaires, et sur une vente à crédit il réduit d'abord la dette avant tout remboursement.
- **Clients & ventes à crédit** : fiche client (téléphone, plafond de crédit), vente avec
  acompte ou paiement différé depuis la caisse, suivi du « reste dû » par facture, encaissement
  des remboursements (répartis automatiquement sur les dettes les plus anciennes). Le total des
  créances apparaît sur le tableau de bord et dans les rapports.
- **Clôture de caisse** (menu « Clôture de caisse », tous les rôles) : encaissements du jour par
  mode de paiement (ventes, dettes remboursées, sommes rendues aux clients), crédit accordé, retours ;
  saisie du fond de caisse et des espèces comptées, calcul des espèces attendues et de l'écart,
  impression et historique des clôtures.
- **Ticket de caisse** pour imprimante thermique (80 mm ou 58 mm), depuis la facture ou
  automatiquement après l'encaissement (choix « Imprimer après encaissement » mémorisé sur l'appareil).
- **Alertes** : clients en retard de paiement (dette de plus de 30 jours) sur le tableau de bord et
  dans la liste des clients ; filtre « Périmés ou expirant sous 30 jours » dans le stock.
- **Export complet** (Paramètres ou Finances) : toutes les données de la boutique dans un seul
  fichier Excel, un onglet par type de donnée, à conserver comme sauvegarde.
- **Analyse par produit** (Finances → « Par produit ») : quantités vendues, chiffre d'affaires,
  coût d'achat et marge de chaque produit sur la période choisie (retours déduits), produits à
  marge faible signalés, export Excel.
- **Réapprovisionnement** (Stock → « À réapprovisionner ») : produits sous le seuil d'alerte ou qui
  risquent la rupture, jours de stock restants d'après le rythme des ventes, quantité conseillée,
  et création de la commande fournisseur en un clic.
- **WhatsApp** : relance d'un client qui doit de l'argent (fiche client ou liste des clients) et
  envoi du récapitulatif d'une facture, en message pré-rempli (le numéro local est complété avec
  l'indicatif du numéro de la boutique, 243 par défaut).
- **Inventaire physique** (Gestionnaire/Administrateur) : comptage produit par produit (saisie
  ou scan), écarts valorisés au prix d'achat, puis validation qui ajuste le stock et trace chaque
  ajustement dans les mouvements. Les ventes faites pendant l'inventaire ne créent pas de faux
  écart (le stock théorique est relu au moment de chaque comptage).
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
├── scripts/
│   └── generate-icons.js      # Régénère public/icons/icon-*.png (sans dépendance externe)
└── README.md
```

## Tests

Une suite de tests automatisés (Vitest) couvre la logique métier critique : calcul de la taxe,
permissions par rôle (RBAC), validation des formulaires (zod).

```bash
npm test
```

## Rôles et permissions

| Fonctionnalité | Vendeur | Gestionnaire | Administrateur |
|---|:---:|:---:|:---:|
| Effectuer une vente | ✅ | ✅ | ✅ |
| Annuler une vente / enregistrer un retour | ❌ | ✅ | ✅ |
| Clients, ventes à crédit, encaisser une dette | ✅ | ✅ | ✅ |
| Inventaire physique | ❌ | ✅ | ✅ |
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
  de vente. Paiement simulé réussi instantanément.
- **CINETPAY** (recommandé) : intégration **réelle** via l'agrégateur
  [CinetPay](https://cinetpay.com), qui donne accès à Orange Money, Airtel Money, MTN Money,
  Moov Money et carte bancaire avec **une seule inscription** — pas besoin d'accord marchand
  séparé avec chaque opérateur. Voir ci-dessous.
- **MPESA** : intégration **réelle** directe (API Daraja de Safaricom, STK Push / "Lipa Na
  M-Pesa Online") — voir ci-dessous.
- **AIRTEL_MONEY**, **ORANGE_MONEY** : intégrations **réelles** directes, pour les commerçants
  qui ont déjà un accord marchand avec l'opérateur (voir "Limites connues" — l'API Orange Money
  n'est en général **pas** accessible en libre-service via un simple compte developer.orange.com ;
  préférez CinetPay si vous n'avez pas déjà cet accord).

Pour tous, tant que les clés d'API ne sont pas configurées dans `.env`, un message d'erreur
clair s'affiche à la caisse (pas de crash) — le mode MOCK reste disponible pour tester le
parcours de vente sans aucune configuration.

### CinetPay — configuration (recommandé pour Orange Money / Airtel Money / MTN Money)

✅ **Testé de bout en bout contre le vrai sandbox CinetPay** : authentification, génération du
lien de paiement (`https://secure.cinetpay.net/checkout/...`) et suivi de statut fonctionnent.

Comme Orange Money direct, CinetPay génère un **lien de paiement** que le client ouvre
lui-même — la page CinetPay lui propose alors de choisir son opérateur (Orange Money, Airtel
Money, MTN Money…) et de valider. La confirmation arrive via webhook
(`/api/payments/mobile-money/cinetpay-callback`), qui **re-vérifie activement** le statut auprès
de CinetPay (`GET /v1/payment/{id}`) avant de le considérer fiable — CinetPay déconseille
explicitement de faire confiance au contenu brut du webhook.

L'API CinetPay v1 utilise une **authentification par jeton** : chaque appel commence par un
`POST /v1/oauth/login` avec `api_key`/`api_password` pour obtenir un jeton, envoyé ensuite en
`Authorization: Bearer` — tout est déjà géré par le code, vous n'avez qu'à fournir les
identifiants.

1. Créez un compte gratuit sur [cinetpay.com](https://cinetpay.com) (mode test/sandbox
   disponible immédiatement, sans dossier marchand complet).
2. Dans le tableau de bord → **Développeur → Accès API**, copiez votre `APIKEY`.
3. Sur la même page, cliquez **"Définir le mot de passe API"** — le mot de passe ne s'affiche
   **qu'une seule fois** après création, copiez-le immédiatement.
4. Renseignez `CINETPAY_APIKEY` et `CINETPAY_API_PASSWORD` dans `.env` (`CINETPAY_ENV=sandbox`
   par défaut).
5. Renseignez `CINETPAY_NOTIFY_URL` avec une URL **publique HTTPS**, ex:
   `https://votre-app.vercel.app/api/payments/mobile-money/cinetpay-callback` (comme pour
   M-Pesa, `localhost` ne fonctionne pas — utilisez ngrok en local).
6. ⚠️ **Liste blanche IP** : même si le tableau de bord affiche "Aucune IP configurée = accès
   libre", l'API a en pratique refusé nos appels tant qu'aucune IP n'était explicitement
   ajoutée (`API & sécurité → Liste Blanche IP`). Ajoutez l'IP sortante de votre machine pour
   tester en local. **En production sur Vercel, les IP sortantes ne sont pas fixes par défaut**
   — contactez le support CinetPay pour désactiver la restriction ou obtenir une solution d'IP
   fixe avant de mettre en production.
7. Sur la page **Vente (caisse)**, choisissez "Mobile Money" → fournisseur "CinetPay". CinetPay
   exige en plus **le nom et l'email du client** (champs affichés uniquement pour ce
   fournisseur) — saisissez-les, puis ouvrez le lien de paiement généré pour tester.

**Passer en mode réel :** complétez le dossier marchand CinetPay (KYC) depuis leur tableau de
bord, puis définissez `CINETPAY_ENV=production` — le domaine de l'API change aussi
(`api.cinetpay.net` en sandbox → `api.cinetpay.co` en production, attention au TLD différent).
Un compte `api_key`/`api_password` est rattaché à **un seul pays** : pour opérer dans plusieurs
pays, un compte marchand dédié par pays est nécessaire (à demander à CinetPay).

### M-Pesa (Daraja) — configuration

Contrairement au mode démo, un paiement M-Pesa réel est **asynchrone** : la requête envoie une
invite de paiement sur le téléphone du client (statut `EN_ATTENTE`), qui doit valider avec son
code PIN. La confirmation arrive ensuite via un webhook Safaricom
(`/api/payments/mobile-money/mpesa-callback`), et le frontend interroge
`/api/payments/mobile-money/status/[id]` toutes les 2 secondes jusqu'à résolution
(`REUSSI`/`ECHEC`, ou échec après ~60 secondes sans réponse).

**Tester gratuitement en sandbox (aucun compte marchand requis) :**

1. Créez un compte gratuit sur [developer.safaricom.co.ke](https://developer.safaricom.co.ke) et
   une "app" — vous obtenez immédiatement un `Consumer Key` et un `Consumer Secret` de test.
2. Renseignez-les dans `.env` : `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET` (laissez
   `MPESA_ENV=sandbox`, `MPESA_SHORTCODE` et `MPESA_PASSKEY` vides — des valeurs de test
   publiques sont déjà utilisées par défaut).
3. Renseignez `MPESA_CALLBACK_URL` avec une URL **publique HTTPS** :
   - En production (Vercel) : `https://votre-app.vercel.app/api/payments/mobile-money/mpesa-callback`.
   - En local : Safaricom ne peut pas appeler `localhost` — utilisez un tunnel, ex.
     `npx ngrok http 3000`, et mettez l'URL ngrok générée.
4. Sur la page **Vente (caisse)**, choisissez "Mobile Money" → fournisseur "M-Pesa", saisissez un
   [numéro de test sandbox](https://developer.safaricom.co.ke/Documentation) (ex. `254708374149`).

**Passer en production :** demandez un shortcode marchand (Paybill/Till) à Safaricom, définissez
`MPESA_ENV=production`, et renseignez votre `MPESA_SHORTCODE` / `MPESA_PASSKEY` réels.

### Airtel Money (OpenAPI) — configuration

Même principe que M-Pesa (invite USSD envoyée sur le téléphone du client, statut asynchrone).
Airtel Money n'ayant pas systématiquement de webhook fiable selon les comptes, le statut est
ré-interrogé activement auprès d'Airtel à chaque fois que le frontend vérifie la transaction
(pas de configuration de callback nécessaire).

**Tester gratuitement en sandbox (UAT, aucun compte marchand requis) :**

1. Créez un compte gratuit sur [developers.airtel.africa](https://developers.airtel.africa) et
   une "app" — vous obtenez un `Client ID` / `Client Secret` pour l'environnement UAT.
2. Renseignez-les dans `.env` : `AIRTEL_CLIENT_ID`, `AIRTEL_CLIENT_SECRET`.
3. Ajustez `AIRTEL_COUNTRY` / `AIRTEL_COUNTRY_CODE` / `AIRTEL_CURRENCY_DEFAULT` selon votre pays
   (par défaut : RD Congo — `CD` / `243` / `CDF`).
4. Sur la page **Vente (caisse)**, choisissez "Mobile Money" → fournisseur "Airtel Money", avec
   un numéro de test fourni par la documentation Airtel UAT.

**Passer en production :** obtenez un compte marchand actif auprès d'Airtel, définissez
`AIRTEL_ENV=production`.

### Orange Money (Web Payment, intégration directe) — configuration

⚠️ **Constaté en pratique** : l'API Orange Money Web Payment n'apparaît pas dans le catalogue
en libre-service de [developer.orange.com](https://developer.orange.com) (recherche "Orange
Money" / "Payment" / "Collect" infructueuse) — l'accès semble nécessiter un accord commercial
direct avec l'équipe Orange Money de votre pays, pas juste un compte développeur gratuit.
**Utilisez CinetPay ci-dessus** en attendant, il couvre Orange Money sans cet accord séparé. Le
code ci-dessous reste disponible pour le jour où vous obtiendrez cet accès direct.

Contrairement à M-Pesa/Airtel, Orange Money (API standard) ne pousse pas d'invite directement
sur le téléphone : la requête génère un **lien de paiement** que le client doit ouvrir
lui-même (affiché à la caisse sous forme de bouton "🔗 Ouvrir le lien de paiement", à faire
scanner ou ouvrir sur le téléphone du client). La confirmation arrive ensuite via le webhook
Orange (`/api/payments/mobile-money/orange-callback`), suivi de la même façon que les autres.

1. Créez un compte gratuit sur [developer.orange.com](https://developer.orange.com), une "app"
   Orange Money, et récupérez `Client ID` / `Client Secret` / `merchant_key` (fournis avec votre
   compte sandbox ou marchand selon le pays).
2. Renseignez `ORANGE_MONEY_CLIENT_ID`, `ORANGE_MONEY_CLIENT_SECRET`, `ORANGE_MONEY_MERCHANT_KEY`
   dans `.env`, et `ORANGE_MONEY_COUNTRY` (ex: `cd` pour la RD Congo).
3. Renseignez `ORANGE_MONEY_NOTIF_URL` avec une URL **publique HTTPS**, ex:
   `https://votre-app.vercel.app/api/payments/mobile-money/orange-callback` (comme pour M-Pesa,
   `localhost` ne fonctionne pas — utilisez ngrok en local).

⚠️ Le format exact de l'API Orange Money (URLs, champs du webhook) varie selon le pays. Le code
suit le schéma standard documenté par Orange ; ajustez `src/lib/payments/mobileMoney.ts` et
`src/app/api/payments/mobile-money/orange-callback/route.ts` si votre pays utilise un format
différent — la documentation fournie avec votre compte développeur fait foi.

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
- **La base de développement est séparée de la production** : une branche Neon dédiée
  (`development`, créée avec `neonctl branches create`) est utilisée en local — c'est une copie
  indépendante des données, donc tester/développer en local ne touche jamais aux vraies données
  de production. L'environnement Vercel « Development » pointe vers cette même branche ; les
  environnements « Production » et « Preview » restent sur la branche `main` de Neon.

  Pour recréer une branche de dev si besoin :
  ```bash
  npx neonctl auth
  npx neonctl branches create --project-id lingering-frog-30890396 --name development --parent main
  # puis mettre à jour DATABASE_URL dans .env / .env.local et dans
  # l'environnement "Development" du projet Vercel (vercel env add DATABASE_URL development)
  ```

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

## Intégration continue (CI)

Un workflow GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) tourne à
chaque push et pull request sur `main` : installation des dépendances, génération du client
Prisma, vérification des types, lint, tests (`npm test`) puis build complet (`npm run build`).
Une régression est ainsi détectée avant même que Vercel ne tente de déployer.

## Suivi des erreurs (Sentry)

Le suivi d'erreurs en production ([Sentry](https://sentry.io)) est intégré via `@sentry/nextjs` :

- Toute erreur serveur renvoyée par une route API (via `handleApiError`, voir
  [`src/lib/api-helpers.ts`](src/lib/api-helpers.ts)) est remontée automatiquement.
- Les webhooks de paiement mobile money (CinetPay, M-Pesa, Orange Money) capturent aussi leurs
  erreurs explicitement, pour ne jamais laisser un paiement échouer silencieusement.
- Les erreurs de rendu React (client) sont capturées via
  [`src/app/global-error.tsx`](src/app/global-error.tsx).

**Sans configuration, le suivi est simplement désactivé** (aucun appel réseau, aucun impact sur
les performances ou le build). Pour l'activer :

1. Créez un compte gratuit sur [sentry.io](https://sentry.io) et un projet de type "Next.js".
2. Copiez son DSN et renseignez `SENTRY_DSN` et `NEXT_PUBLIC_SENTRY_DSN` (même valeur) dans les
   variables d'environnement Vercel (`vercel env add SENTRY_DSN production` etc.) ou dans
   `.env.local` en développement.
3. (Optionnel) Pour des messages d'erreur avec la vraie source du code (source maps) plutôt que du
   code minifié, ajoutez aussi `SENTRY_ORG`, `SENTRY_PROJECT` et `SENTRY_AUTH_TOKEN`
   (Organisation → Auth Tokens sur Sentry).

## Limites connues

- CinetPay, M-Pesa, Airtel Money et Orange Money sont intégrés réellement. **CinetPay a été
  testé de bout en bout contre leur sandbox réel** (authentification, lien de paiement, suivi de
  statut). M-Pesa et Airtel ont un compte test/sandbox gratuit en libre-service mais n'ont pas pu
  être testés contre un vrai paiement (pas de compte obtenu). **Orange Money direct nécessite un
  accord marchand séparé** (pas juste un compte developer.orange.com — constaté en pratique,
  voir la section Orange Money ci-dessus) : utilisez CinetPay en attendant, qui couvre Orange
  Money sans cet accord.
- **CinetPay applique une liste blanche IP** même quand le tableau de bord semble indiquer
  "aucune restriction" — voir la section CinetPay ci-dessus pour le contournement en local, et
  anticiper une solution d'IP fixe (ou contacter leur support) avant la mise en production sur
  Vercel (IP sortantes non fixes par défaut).
- Le mode hors-ligne couvre les ventes (y compris à crédit, si le client a été chargé avant la
  coupure) ; les autres actions (clients, retours, inventaire, stock, fournisseurs…) nécessitent
  une connexion.
- Les remboursements (annulation, retour) ne sont pas renvoyés automatiquement vers le mobile
  money ou la carte : l'application indique le montant à rendre, le remboursement se fait à la main.
