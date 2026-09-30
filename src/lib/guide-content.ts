// Contenu du guide d'utilisation : source unique pour la page Aide et pour le guide PDF téléchargeable.
// Les positions des repères (x, y) sont en pourcentage de la capture ; elles ont été mesurées sur
// l'application (voir scripts/capture-guide-screenshots.mjs).

export type GuideMarker = {
  x: number;
  y: number;
  label: string;
  description: string;
};

export type GuideBlock =
  | { type: "text"; text: string }
  | {
      type: "screenshot";
      src: string;
      alt: string;
      width: number;
      height: number;
      narrow?: boolean;
      markers: GuideMarker[];
    }
  | { type: "tip"; title: string; text: string };

export type GuideSection = { id: string; title: string; blocks: GuideBlock[] };

export const GUIDE_TITLE = "Guide d'utilisation";

export const GUIDE_INTRO =
  "Ces captures viennent directement de l'application. Chaque numéro entoure un élément de l'écran et vous renvoie vers son explication juste en dessous.";

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "tableau-de-bord",
    title: "Tableau de bord",
    blocks: [
      {
        type: "text",
        text: "C'est la page d'accueil après connexion : un résumé de la journée et un accès rapide à tout le reste.",
      },
      {
        type: "screenshot",
        src: "/guide/dashboard.png",
        alt: "Capture du tableau de bord de l'application",
        width: 1440,
        height: 1367,
        narrow: false,
        markers: [
          {
            x: 38.8,
            y: 2.3,
            label: "Boutique active",
            description:
              "Nom de la boutique connectée ; cliquez pour changer de boutique si vous en gérez plusieurs.",
          },
          {
            x: 50.0,
            y: 6.4,
            label: "Barre de navigation",
            description:
              "Accès à toutes les sections (Vente, Clients, Stock, Inventaires, Finances…). Elle défile horizontalement sur petit écran.",
          },
          {
            x: 85.9,
            y: 2.3,
            label: "Profil",
            description:
              "Vos initiales : cliquez pour voir votre compte ou vous déconnecter.",
          },
          {
            x: 21.6,
            y: 18.2,
            label: "Actions rapides",
            description:
              "Raccourcis vers les opérations fréquentes : nouvelle vente, encaisser une dette, nouveau produit…",
          },
          {
            x: 35.7,
            y: 18.2,
            label: "Toutes les applications",
            description: "Grille d'accès à tous les modules de l'application.",
          },
          {
            x: 25.5,
            y: 41.2,
            label: "Alerte stock bas",
            description:
              "S'affiche dès qu'un article passe sous son seuil d'alerte, avec un lien direct vers le stock.",
          },
          {
            x: 20.7,
            y: 46.7,
            label: "Indicateurs clés",
            description:
              "Ventes du jour (retours déduits), dépenses sur 30 jours, alertes stock et nombre de produits actifs.",
          },
          {
            x: 82.2,
            y: 46.7,
            label: "Crédits clients",
            description:
              "Total des ventes à crédit restant à encaisser. Cliquez pour voir les clients qui doivent de l'argent.",
          },
          {
            x: 30.9,
            y: 59.9,
            label: "Chiffre d'affaires",
            description:
              "Évolution des ventes sur les 14 derniers jours, retours déduits.",
          },
        ],
      },
    ],
  },
  {
    id: "vente",
    title: "Vente (caisse)",
    blocks: [
      {
        type: "text",
        text: "L'écran de caisse pour encaisser un client, produit par produit. Ici, une vente à crédit : le client verse un acompte et le reste s'ajoute à sa dette.",
      },
      {
        type: "screenshot",
        src: "/guide/vente.png",
        alt: "Capture de l'écran de vente, avec une vente à crédit en cours",
        width: 1440,
        height: 690,
        narrow: false,
        markers: [
          {
            x: 58.1,
            y: 26.4,
            label: "Recherche produit",
            description:
              "Tapez un nom, une référence ou scannez un code-barres pour ajouter un article au panier.",
          },
          {
            x: 62.1,
            y: 26.4,
            label: "Scanner",
            description:
              "Ouvre la caméra pour scanner un code-barres ou QR code.",
          },
          {
            x: 27.6,
            y: 34.2,
            label: "Liste des produits",
            description:
              "Cliquez sur une carte produit pour l'ajouter au panier.",
          },
          {
            x: 69.8,
            y: 24.2,
            label: "Panier",
            description:
              "Récapitule les articles, le sous-total, la taxe et le total à payer.",
          },
          {
            x: 84.4,
            y: 55.1,
            label: "Client",
            description:
              "« Client de passage » par défaut. Choisissez un client enregistré pour suivre ses achats ou lui faire crédit ; sa dette actuelle s'affiche à côté de son nom.",
          },
          {
            x: 87.2,
            y: 55.1,
            label: "Nouveau client",
            description:
              "Crée un client sans quitter la caisse ; il est sélectionné automatiquement.",
          },
          {
            x: 86.9,
            y: 63.8,
            label: "Vente à crédit",
            description:
              "À cocher si le client ne paie pas tout maintenant. Refusé si le client dépasse son plafond de crédit.",
          },
          {
            x: 86.6,
            y: 66.7,
            label: "Payé maintenant",
            description:
              "L'acompte versé aujourd'hui (0 si rien). Le reste dû est calculé automatiquement et s'ajoute à la dette du client.",
          },
          {
            x: 87.2,
            y: 80.9,
            label: "Mode de paiement",
            description:
              "Espèces, mobile money (M-Pesa, Airtel Money, CinetPay…), carte ou virement. Pour une vente à crédit, seul l'acompte est encaissé.",
          },
          {
            x: 87.2,
            y: 88.4,
            label: "Encaisser",
            description:
              "Valide la vente et ouvre la facture à imprimer. Fonctionne aussi hors connexion : la vente se synchronise dès le retour du réseau.",
          },
        ],
      },
    ],
  },
  {
    id: "clients",
    title: "Clients & ventes à crédit",
    blocks: [
      {
        type: "text",
        text: "La liste de vos clients et de ce qu'ils vous doivent. Accessible à toute l'équipe, vendeurs compris.",
      },
      {
        type: "screenshot",
        src: "/guide/clients.png",
        alt: "Capture de la liste des clients",
        width: 1440,
        height: 392,
        narrow: false,
        markers: [
          {
            x: 33.1,
            y: 51.6,
            label: "Recherche",
            description: "Retrouvez un client par son nom ou son téléphone.",
          },
          {
            x: 46.8,
            y: 55.9,
            label: "Avec dette uniquement",
            description:
              "N'affiche que les clients qui doivent encore de l'argent.",
          },
          {
            x: 88.6,
            y: 36.8,
            label: "Nouveau client",
            description:
              "Crée une fiche client : nom, téléphone, adresse et plafond de crédit (facultatif).",
          },
          {
            x: 23.4,
            y: 44.5,
            label: "Total à encaisser",
            description: "Somme de toutes les dettes clients de la liste.",
          },
          {
            x: 24.0,
            y: 79.1,
            label: "Fiche client",
            description:
              "Cliquez sur un nom pour voir ses achats, ses remboursements et encaisser un paiement.",
          },
          {
            x: 83.8,
            y: 79.1,
            label: "Reste dû",
            description:
              "Ce que le client doit encore, toutes ventes à crédit confondues.",
          },
        ],
      },
      {
        type: "text",
        text: "La fiche d'un client : c'est ici que vous encaissez le remboursement d'une dette.",
      },
      {
        type: "screenshot",
        src: "/guide/client.png",
        alt: "Capture de la fiche d'un client avec sa dette et ses remboursements",
        width: 1440,
        height: 610,
        narrow: false,
        markers: [
          {
            x: 18.2,
            y: 41.5,
            label: "Reste dû",
            description: "Dette actuelle du client et son plafond de crédit.",
          },
          {
            x: 51.3,
            y: 49.1,
            label: "Montant",
            description:
              "Somme remise par le client. Le bouton « Tout » remplit la dette complète.",
          },
          {
            x: 70.7,
            y: 49.1,
            label: "Mode",
            description:
              "Comment le client a payé : espèces, mobile money, carte ou virement.",
          },
          {
            x: 50.9,
            y: 61.8,
            label: "Enregistrer le paiement",
            description:
              "Le paiement règle d'abord les ventes les plus anciennes. Un montant supérieur à la dette est refusé.",
          },
          {
            x: 17.1,
            y: 77.3,
            label: "Achats",
            description:
              "Toutes les ventes du client, avec ce qui reste à payer sur chacune (lien vers la facture).",
          },
          {
            x: 64.3,
            y: 77.3,
            label: "Remboursements reçus",
            description:
              "Historique des paiements de la dette : date, mode et personne qui a encaissé.",
          },
          {
            x: 88.6,
            y: 22.7,
            label: "Modifier",
            description:
              "Changer les coordonnées ou le plafond de crédit du client.",
          },
        ],
      },
    ],
  },
  {
    id: "retours",
    title: "Retours et annulations",
    blocks: [
      {
        type: "text",
        text: "Depuis l'historique des ventes, cliquez sur un numéro de facture pour l'ouvrir. Les gestionnaires et administrateurs peuvent y enregistrer un retour ou annuler la vente.",
      },
      {
        type: "screenshot",
        src: "/guide/facture.png",
        alt: "Capture d'une facture avec un retour d'article",
        width: 1440,
        height: 895,
        narrow: false,
        markers: [
          {
            x: 21.1,
            y: 22.6,
            label: "Retour d'articles",
            description:
              "Le client rend une partie des articles (réservé aux gestionnaires et administrateurs).",
          },
          {
            x: 30.9,
            y: 22.6,
            label: "Annuler la vente",
            description:
              "Annule toute la vente avec un motif : articles remis en stock, vente retirée du chiffre d'affaires. La facture reste consultable avec la mention « annulée ».",
          },
          {
            x: 39.0,
            y: 22.6,
            label: "Imprimer / PDF",
            description: "Imprime la facture ou la télécharge en PDF.",
          },
          {
            x: 20.9,
            y: 45.2,
            label: "Client",
            description:
              "Lien vers la fiche du client pour encaisser sa dette.",
          },
          {
            x: 26.6,
            y: 56.6,
            label: "Quantité rendue",
            description:
              "Indique combien d'unités de cet article ont déjà été retournées.",
          },
          {
            x: 39.8,
            y: 76.9,
            label: "Reste à payer",
            description:
              "Montant encore dû sur cette vente à crédit (après acompte, remboursements et retours).",
          },
          {
            x: 17.5,
            y: 85.6,
            label: "Historique des retours",
            description:
              "Chaque retour : date, articles, motif, montant déduit de la dette et montant remboursé au client.",
          },
        ],
      },
      {
        type: "text",
        text: "La fenêtre qui s'ouvre avec « Retour d'articles » :",
      },
      {
        type: "screenshot",
        src: "/guide/retour.png",
        alt: "Capture de la fenêtre de retour d'articles",
        width: 544,
        height: 477,
        narrow: true,
        markers: [
          {
            x: 90.4,
            y: 34.2,
            label: "Quantité rendue",
            description:
              "Pour chaque article, la quantité que le client rapporte (au maximum ce qui reste retournable).",
          },
          {
            x: 92.6,
            y: 58.9,
            label: "Motif",
            description: "Obligatoire : article défectueux, erreur de taille…",
          },
          {
            x: 48.8,
            y: 71.1,
            label: "Valeur du retour",
            description:
              "Montant taxe comprise. Sur une vente à crédit, il réduit d'abord la dette ; le surplus est à rendre au client.",
          },
          {
            x: 92.6,
            y: 85.3,
            label: "Valider le retour",
            description:
              "Remet les articles en stock et déduit le montant du chiffre d'affaires.",
          },
        ],
      },
    ],
  },
  {
    id: "stock",
    title: "Stock & produits",
    blocks: [
      {
        type: "text",
        text: "Gérez vos produits, leurs quantités et leurs seuils d'alerte.",
      },
      {
        type: "screenshot",
        src: "/guide/stock.png",
        alt: "Capture de la page stock et produits",
        width: 1440,
        height: 454,
        narrow: false,
        markers: [
          {
            x: 33.1,
            y: 41.9,
            label: "Recherche",
            description:
              "Recherchez un produit par nom, référence ou code-barres.",
          },
          {
            x: 46.5,
            y: 45.6,
            label: "Stock bas uniquement",
            description: "N'affiche que les produits sous leur seuil d'alerte.",
          },
          {
            x: 88.6,
            y: 30.5,
            label: "Nouveau produit",
            description:
              "Ajoute un nouvel article au catalogue de la boutique.",
          },
          {
            x: 76.1,
            y: 42.1,
            label: "Inventaire physique",
            description:
              "Comptez le stock réel en rayon et corrigez les écarts (voir la section Inventaire).",
          },
          {
            x: 88.6,
            y: 42.1,
            label: "Mouvements de stock",
            description:
              "Historique des entrées et sorties : réceptions, ventes, retours, annulations, ajustements d'inventaire.",
          },
          {
            x: 58.2,
            y: 65.7,
            label: "Tableau des produits",
            description:
              "Les quantités en rouge sont sous le seuil d'alerte défini pour ce produit.",
          },
          {
            x: 85.3,
            y: 65.7,
            label: "Gérer",
            description:
              "Ouvre la fiche du produit pour modifier son prix, son stock ou son seuil.",
          },
        ],
      },
    ],
  },
  {
    id: "inventaire",
    title: "Inventaire physique",
    blocks: [
      {
        type: "text",
        text: "Pour compter ce qui est réellement en rayon et corriger le stock. Démarrez-le depuis Stock → « Inventaire physique » (gestionnaires et administrateurs). Vous pouvez continuer à vendre pendant le comptage : les ventes ne faussent pas les écarts.",
      },
      {
        type: "screenshot",
        src: "/guide/inventaire.png",
        alt: "Capture d'un inventaire en cours de comptage",
        width: 1440,
        height: 644,
        narrow: false,
        markers: [
          {
            x: 18.1,
            y: 39.3,
            label: "Avancement",
            description: "Nombre de produits déjà comptés sur le total.",
          },
          {
            x: 42.6,
            y: 39.3,
            label: "Écarts",
            description:
              "Produits dont la quantité comptée diffère du stock théorique.",
          },
          {
            x: 65.6,
            y: 39.3,
            label: "Valeur des écarts",
            description:
              "Manquants et surplus valorisés au prix d'achat : utile pour repérer les pertes ou les vols.",
          },
          {
            x: 33.1,
            y: 52.8,
            label: "Recherche et scan",
            description:
              "Retrouvez un produit par son nom, ou scannez son code-barres avec la caméra pour aller directement à sa ligne.",
          },
          {
            x: 48.2,
            y: 53.0,
            label: "Filtre",
            description:
              "Tous les produits, seulement ceux pas encore comptés, ou seulement ceux en écart.",
          },
          {
            x: 66.5,
            y: 68.4,
            label: "Quantité comptée",
            description:
              "Tapez la quantité réellement présente en rayon : elle est enregistrée dès que vous quittez la case (ou appuyez sur Entrée).",
          },
          {
            x: 72.4,
            y: 70.4,
            label: "Écart",
            description:
              "Compté moins théorique : en rouge un manquant, en vert un surplus.",
          },
          {
            x: 88.6,
            y: 21.5,
            label: "Valider l'inventaire",
            description:
              "Applique les écarts au stock (les produits non comptés ne changent pas). Chaque correction est tracée dans les mouvements de stock.",
          },
          {
            x: 78.0,
            y: 21.5,
            label: "Abandonner",
            description: "Annule l'inventaire sans toucher au stock.",
          },
        ],
      },
    ],
  },
  {
    id: "utilisateurs",
    title: "Utilisateurs & accès",
    blocks: [
      {
        type: "text",
        text: "Créez des comptes pour votre équipe et choisissez ce que chaque personne a le droit de faire.",
      },
      {
        type: "screenshot",
        src: "/guide/utilisateurs.png",
        alt: "Capture de la page utilisateurs",
        width: 1440,
        height: 411,
        narrow: false,
        markers: [
          {
            x: 88.6,
            y: 33.6,
            label: "Ajouter un utilisateur",
            description:
              "Ouvre un formulaire pour créer un compte (nom, email, mot de passe temporaire, rôle).",
          },
          {
            x: 20.2,
            y: 61.4,
            label: "Nom et email",
            description: "Identité et identifiant de connexion de la personne.",
          },
          {
            x: 72.5,
            y: 61.4,
            label: "Rôle",
            description:
              "Administrateur (accès total), Gestionnaire (gestion courante, retours, inventaires) ou Vendeur (caisse et clients).",
          },
          {
            x: 76.9,
            y: 61.5,
            label: "Statut",
            description:
              "Cliquez pour activer ou désactiver l'accès de la personne sans la supprimer.",
          },
          {
            x: 85.3,
            y: 61.4,
            label: "Retirer",
            description: "Retire définitivement cette personne de la boutique.",
          },
        ],
      },
    ],
  },
  {
    id: "bon-a-savoir",
    title: "Bon à savoir",
    blocks: [
      {
        type: "tip",
        title: "Retour ou annulation ?",
        text: "Le retour concerne une partie des articles ; l'annulation efface toute la vente (erreur de saisie, par exemple). Dans les deux cas, les articles reviennent en stock et le chiffre d'affaires est corrigé.",
      },
      {
        type: "tip",
        title: "Remboursements :",
        text: "l'application calcule le montant à rendre au client mais ne le renvoie pas automatiquement sur son mobile money ou sa carte : faites-le vous-même.",
      },
      {
        type: "tip",
        title: "Ventes à crédit :",
        text: "elles comptent dans le chiffre d'affaires dès la vente. Le montant restant à encaisser est suivi à part (« Crédits clients » sur le tableau de bord, « Créances clients » dans Finances).",
      },
      {
        type: "tip",
        title: "Hors connexion :",
        text: "la caisse continue de fonctionner, y compris pour un client enregistré si la page était chargée avant la coupure. Les clients, retours et inventaires demandent une connexion.",
      },
      {
        type: "tip",
        title: "Lecteur de codes-barres :",
        text: "à la caisse, cliquez dans la recherche et scannez : le produit s'ajoute tout seul au panier (scannez-le de nouveau pour augmenter la quantité).",
      },
      {
        type: "tip",
        title: "Prix négocié :",
        text: "les gestionnaires et administrateurs peuvent changer le prix d'un article dans le panier ; une alerte s'affiche s'il passe sous le prix d'achat. Les vendeurs vendent au prix du catalogue.",
      },
      {
        type: "tip",
        title: "Mon compte :",
        text: "menu du profil (vos initiales, en haut à droite) → « Mon compte » pour changer votre nom, votre email de connexion ou votre mot de passe. L'administrateur peut corriger le nom ou l'email d'un employé (Utilisateurs → « Modifier ») et réinitialiser un mot de passe oublié (« Mot de passe »).",
      },
      {
        type: "tip",
        title: "Clôture de caisse :",
        text: "en fin de journée, ouvrez « Clôture de caisse », saisissez le fond de caisse du matin et les espèces comptées dans le tiroir : l'application calcule ce qui devrait y être et affiche l'écart. Enregistrez la clôture pour garder une trace (historique en bas de page).",
      },
      {
        type: "tip",
        title: "Ticket ou reçu (en plus de la facture) :",
        text: "après une vente, à la caisse, « 🧾 Ticket / reçu » ; aussi sur la facture et dans l'historique. Trois formats : ticket 80 mm ou 58 mm (imprimante thermique) ou reçu A5 (imprimante normale). À la caisse, « Imprimer après encaissement » l'ouvre tout seul après chaque vente.",
      },
      {
        type: "tip",
        title: "Reçu de paiement :",
        text: "quand un client rembourse une dette, cliquez sur « 🧾 Imprimer le reçu » (ou sur 🧾 dans la liste des remboursements de sa fiche) : le reçu indique le montant reçu et ce qu'il reste à payer.",
      },
      {
        type: "tip",
        title: "Sauvegarde :",
        text: "Paramètres → « Télécharger l'export complet » : toutes vos données dans un fichier Excel. Faites-le régulièrement et gardez le fichier en lieu sûr.",
      },
      {
        type: "tip",
        title: "Que commander ?",
        text: "Stock → « À réapprovisionner » calcule, d'après le rythme de vos ventes, combien de jours de stock il vous reste et la quantité à commander, puis crée la commande fournisseur en un clic.",
      },
      {
        type: "tip",
        title: "Ce qui rapporte le plus :",
        text: "Finances → « Par produit » classe vos produits par chiffre d'affaires ou par marge et signale ceux dont la marge est trop faible.",
      },
      {
        type: "tip",
        title: "WhatsApp :",
        text: "sur la fiche d'un client qui vous doit de l'argent, « Relancer par WhatsApp » prépare un message de rappel poli ; sur une facture, « WhatsApp » envoie le récapitulatif au client. Vous relisez et envoyez vous-même depuis WhatsApp.",
      },
      {
        type: "tip",
        title: "Qui peut faire quoi :",
        text: "les vendeurs vendent, voient le stock et gèrent les clients et leurs paiements ; les gestionnaires ajoutent les retours, annulations, inventaires, finances et fournisseurs ; les administrateurs ont tous les droits.",
      },
    ],
  },
];
