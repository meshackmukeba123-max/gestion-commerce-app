import { AnnotatedScreenshot } from "@/components/guide/AnnotatedScreenshot";

export default function GuidePage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Guide d&apos;utilisation</h1>
        <p className="text-sm text-neutral-500">
          Ces captures viennent directement de l&apos;application. Chaque numéro entoure un élément de l&apos;écran et vous
          renvoie vers son explication juste en dessous.
        </p>
        <ol className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <li>
            <a href="#tableau-de-bord" className="text-emerald-600 hover:underline dark:text-emerald-400">
              1. Tableau de bord
            </a>
          </li>
          <li>
            <a href="#vente" className="text-emerald-600 hover:underline dark:text-emerald-400">
              2. Vente (caisse)
            </a>
          </li>
          <li>
            <a href="#clients" className="text-emerald-600 hover:underline dark:text-emerald-400">
              3. Clients &amp; ventes à crédit
            </a>
          </li>
          <li>
            <a href="#retours" className="text-emerald-600 hover:underline dark:text-emerald-400">
              4. Retours et annulations
            </a>
          </li>
          <li>
            <a href="#stock" className="text-emerald-600 hover:underline dark:text-emerald-400">
              5. Stock &amp; produits
            </a>
          </li>
          <li>
            <a href="#inventaire" className="text-emerald-600 hover:underline dark:text-emerald-400">
              6. Inventaire physique
            </a>
          </li>
          <li>
            <a href="#utilisateurs" className="text-emerald-600 hover:underline dark:text-emerald-400">
              7. Utilisateurs &amp; accès
            </a>
          </li>
          <li>
            <a href="#bon-a-savoir" className="text-emerald-600 hover:underline dark:text-emerald-400">
              8. Bon à savoir
            </a>
          </li>
        </ol>
      </div>

      <section id="tableau-de-bord" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold">1. Tableau de bord</h2>
        <p className="text-sm text-neutral-500">
          C&apos;est la page d&apos;accueil après connexion : un résumé de la journée et un accès rapide à tout le reste.
        </p>
        <AnnotatedScreenshot
          src="/guide/dashboard.png"
          alt="Capture du tableau de bord de l'application"
          aspectRatio={1440 / 1367}
          markers={[
            { id: 1, x: 38.8, y: 2.3, label: "Boutique active", description: "Nom de la boutique connectée ; cliquez pour changer de boutique si vous en gérez plusieurs." },
            { id: 2, x: 50, y: 6.4, label: "Barre de navigation", description: "Accès à toutes les sections (Vente, Clients, Stock, Inventaires, Finances…). Elle défile horizontalement sur petit écran." },
            { id: 3, x: 85.9, y: 2.3, label: "Profil", description: "Vos initiales : cliquez pour voir votre compte ou vous déconnecter." },
            { id: 4, x: 21.6, y: 18.2, label: "Actions rapides", description: "Raccourcis vers les opérations fréquentes : nouvelle vente, encaisser une dette, nouveau produit…" },
            { id: 5, x: 35.7, y: 18.2, label: "Toutes les applications", description: "Grille d'accès à tous les modules de l'application." },
            { id: 6, x: 25.5, y: 41.2, label: "Alerte stock bas", description: "S'affiche dès qu'un article passe sous son seuil d'alerte, avec un lien direct vers le stock." },
            { id: 7, x: 20.7, y: 46.7, label: "Indicateurs clés", description: "Ventes du jour (retours déduits), dépenses sur 30 jours, alertes stock et nombre de produits actifs." },
            { id: 8, x: 82.2, y: 46.7, label: "Crédits clients", description: "Total des ventes à crédit restant à encaisser. Cliquez pour voir les clients qui doivent de l'argent." },
            { id: 9, x: 30.9, y: 59.9, label: "Chiffre d'affaires", description: "Évolution des ventes sur les 14 derniers jours, retours déduits." },
          ]}
        />
      </section>

      <section id="vente" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold">2. Vente (caisse)</h2>
        <p className="text-sm text-neutral-500">
          L&apos;écran de caisse pour encaisser un client, produit par produit. Ici, une vente à crédit : le client
          verse un acompte et le reste s&apos;ajoute à sa dette.
        </p>
        <AnnotatedScreenshot
          src="/guide/vente.png"
          alt="Capture de l'écran de vente, avec une vente à crédit en cours"
          aspectRatio={1440 / 690}
          markers={[
            { id: 1, x: 58.1, y: 26.4, label: "Recherche produit", description: "Tapez un nom, une référence ou scannez un code-barres pour ajouter un article au panier." },
            { id: 2, x: 62.1, y: 26.4, label: "Scanner", description: "Ouvre la caméra pour scanner un code-barres ou QR code." },
            { id: 3, x: 27.6, y: 34.2, label: "Liste des produits", description: "Cliquez sur une carte produit pour l'ajouter au panier." },
            { id: 4, x: 69.8, y: 24.2, label: "Panier", description: "Récapitule les articles, le sous-total, la taxe et le total à payer." },
            { id: 5, x: 84.4, y: 55.1, label: "Client", description: "« Client de passage » par défaut. Choisissez un client enregistré pour suivre ses achats ou lui faire crédit ; sa dette actuelle s'affiche à côté de son nom." },
            { id: 6, x: 87.2, y: 55.1, label: "Nouveau client", description: "Crée un client sans quitter la caisse ; il est sélectionné automatiquement." },
            { id: 7, x: 86.9, y: 63.8, label: "Vente à crédit", description: "À cocher si le client ne paie pas tout maintenant. Refusé si le client dépasse son plafond de crédit." },
            { id: 8, x: 86.6, y: 66.7, label: "Payé maintenant", description: "L'acompte versé aujourd'hui (0 si rien). Le reste dû est calculé automatiquement et s'ajoute à la dette du client." },
            { id: 9, x: 87.2, y: 80.9, label: "Mode de paiement", description: "Espèces, mobile money (M-Pesa, Airtel Money, CinetPay…), carte ou virement. Pour une vente à crédit, seul l'acompte est encaissé." },
            { id: 10, x: 87.2, y: 88.4, label: "Encaisser", description: "Valide la vente et ouvre la facture à imprimer. Fonctionne aussi hors connexion : la vente se synchronise dès le retour du réseau." },
          ]}
        />
      </section>

      <section id="clients" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold">3. Clients &amp; ventes à crédit</h2>
        <p className="text-sm text-neutral-500">
          La liste de vos clients et de ce qu&apos;ils vous doivent. Accessible à toute l&apos;équipe, vendeurs compris.
        </p>
        <AnnotatedScreenshot
          src="/guide/clients.png"
          alt="Capture de la liste des clients"
          aspectRatio={1440 / 392}
          markers={[
            { id: 1, x: 33.1, y: 51.6, label: "Recherche", description: "Retrouvez un client par son nom ou son téléphone." },
            { id: 2, x: 46.8, y: 55.9, label: "Avec dette uniquement", description: "N'affiche que les clients qui doivent encore de l'argent." },
            { id: 3, x: 88.6, y: 36.8, label: "Nouveau client", description: "Crée une fiche client : nom, téléphone, adresse et plafond de crédit (facultatif)." },
            { id: 4, x: 23.4, y: 44.5, label: "Total à encaisser", description: "Somme de toutes les dettes clients de la liste." },
            { id: 5, x: 24, y: 79.1, label: "Fiche client", description: "Cliquez sur un nom pour voir ses achats, ses remboursements et encaisser un paiement." },
            { id: 6, x: 83.8, y: 79.1, label: "Reste dû", description: "Ce que le client doit encore, toutes ventes à crédit confondues." },
          ]}
        />
        <p className="pt-4 text-sm text-neutral-500">
          La fiche d&apos;un client : c&apos;est ici que vous encaissez le remboursement d&apos;une dette.
        </p>
        <AnnotatedScreenshot
          src="/guide/client.png"
          alt="Capture de la fiche d'un client avec sa dette et ses remboursements"
          aspectRatio={1440 / 610}
          markers={[
            { id: 1, x: 18.2, y: 41.5, label: "Reste dû", description: "Dette actuelle du client et son plafond de crédit." },
            { id: 2, x: 51.3, y: 49.1, label: "Montant", description: "Somme remise par le client. Le bouton « Tout » remplit la dette complète." },
            { id: 3, x: 70.7, y: 49.1, label: "Mode", description: "Comment le client a payé : espèces, mobile money, carte ou virement." },
            { id: 4, x: 50.9, y: 61.8, label: "Enregistrer le paiement", description: "Le paiement règle d'abord les ventes les plus anciennes. Un montant supérieur à la dette est refusé." },
            { id: 5, x: 17.1, y: 77.3, label: "Achats", description: "Toutes les ventes du client, avec ce qui reste à payer sur chacune (lien vers la facture)." },
            { id: 6, x: 64.3, y: 77.3, label: "Remboursements reçus", description: "Historique des paiements de la dette : date, mode et personne qui a encaissé." },
            { id: 7, x: 88.6, y: 22.7, label: "Modifier", description: "Changer les coordonnées ou le plafond de crédit du client." },
          ]}
        />
      </section>

      <section id="retours" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold">4. Retours et annulations</h2>
        <p className="text-sm text-neutral-500">
          Depuis l&apos;historique des ventes, cliquez sur un numéro de facture pour l&apos;ouvrir. Les gestionnaires et
          administrateurs peuvent y enregistrer un retour ou annuler la vente.
        </p>
        <AnnotatedScreenshot
          src="/guide/facture.png"
          alt="Capture d'une facture avec un retour d'article"
          aspectRatio={1440 / 895}
          markers={[
            { id: 1, x: 21.1, y: 22.6, label: "Retour d'articles", description: "Le client rend une partie des articles (réservé aux gestionnaires et administrateurs)." },
            { id: 2, x: 30.9, y: 22.6, label: "Annuler la vente", description: "Annule toute la vente avec un motif : articles remis en stock, vente retirée du chiffre d'affaires. La facture reste consultable avec la mention « annulée »." },
            { id: 3, x: 39, y: 22.6, label: "Imprimer / PDF", description: "Imprime la facture ou la télécharge en PDF." },
            { id: 4, x: 20.9, y: 45.2, label: "Client", description: "Lien vers la fiche du client pour encaisser sa dette." },
            { id: 5, x: 26.6, y: 56.6, label: "Quantité rendue", description: "Indique combien d'unités de cet article ont déjà été retournées." },
            { id: 6, x: 39.8, y: 76.9, label: "Reste à payer", description: "Montant encore dû sur cette vente à crédit (après acompte, remboursements et retours)." },
            { id: 7, x: 17.5, y: 85.6, label: "Historique des retours", description: "Chaque retour : date, articles, motif, montant déduit de la dette et montant remboursé au client." },
          ]}
        />
        <p className="pt-4 text-sm text-neutral-500">La fenêtre qui s&apos;ouvre avec « Retour d&apos;articles » :</p>
        <div className="max-w-xl">
          <AnnotatedScreenshot
            src="/guide/retour.png"
            alt="Capture de la fenêtre de retour d'articles"
            aspectRatio={544 / 477}
            markers={[
              { id: 1, x: 90.4, y: 34.2, label: "Quantité rendue", description: "Pour chaque article, la quantité que le client rapporte (au maximum ce qui reste retournable)." },
              { id: 2, x: 92.6, y: 58.9, label: "Motif", description: "Obligatoire : article défectueux, erreur de taille…" },
              { id: 3, x: 48.8, y: 71.1, label: "Valeur du retour", description: "Montant taxe comprise. Sur une vente à crédit, il réduit d'abord la dette ; le surplus est à rendre au client." },
              { id: 4, x: 92.6, y: 85.3, label: "Valider le retour", description: "Remet les articles en stock et déduit le montant du chiffre d'affaires." },
            ]}
          />
        </div>
      </section>

      <section id="stock" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold">5. Stock &amp; produits</h2>
        <p className="text-sm text-neutral-500">Gérez vos produits, leurs quantités et leurs seuils d&apos;alerte.</p>
        <AnnotatedScreenshot
          src="/guide/stock.png"
          alt="Capture de la page stock et produits"
          aspectRatio={1440 / 454}
          markers={[
            { id: 1, x: 33.1, y: 41.9, label: "Recherche", description: "Recherchez un produit par nom, référence ou code-barres." },
            { id: 2, x: 46.5, y: 45.6, label: "Stock bas uniquement", description: "N'affiche que les produits sous leur seuil d'alerte." },
            { id: 3, x: 88.6, y: 30.5, label: "Nouveau produit", description: "Ajoute un nouvel article au catalogue de la boutique." },
            { id: 4, x: 76.1, y: 42.1, label: "Inventaire physique", description: "Comptez le stock réel en rayon et corrigez les écarts (voir la section Inventaire)." },
            { id: 5, x: 88.6, y: 42.1, label: "Mouvements de stock", description: "Historique des entrées et sorties : réceptions, ventes, retours, annulations, ajustements d'inventaire." },
            { id: 6, x: 58.2, y: 65.7, label: "Tableau des produits", description: "Les quantités en rouge sont sous le seuil d'alerte défini pour ce produit." },
            { id: 7, x: 85.3, y: 65.7, label: "Gérer", description: "Ouvre la fiche du produit pour modifier son prix, son stock ou son seuil." },
          ]}
        />
      </section>

      <section id="inventaire" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold">6. Inventaire physique</h2>
        <p className="text-sm text-neutral-500">
          Pour compter ce qui est réellement en rayon et corriger le stock. Démarrez-le depuis Stock → « Inventaire
          physique » (gestionnaires et administrateurs). Vous pouvez continuer à vendre pendant le comptage : les ventes
          ne faussent pas les écarts.
        </p>
        <AnnotatedScreenshot
          src="/guide/inventaire.png"
          alt="Capture d'un inventaire en cours de comptage"
          aspectRatio={1440 / 644}
          markers={[
            { id: 1, x: 18.1, y: 39.3, label: "Avancement", description: "Nombre de produits déjà comptés sur le total." },
            { id: 2, x: 42.6, y: 39.3, label: "Écarts", description: "Produits dont la quantité comptée diffère du stock théorique." },
            { id: 3, x: 65.6, y: 39.3, label: "Valeur des écarts", description: "Manquants et surplus valorisés au prix d'achat : utile pour repérer les pertes ou les vols." },
            { id: 4, x: 33.1, y: 52.8, label: "Recherche et scan", description: "Retrouvez un produit par son nom, ou scannez son code-barres avec la caméra pour aller directement à sa ligne." },
            { id: 5, x: 48.2, y: 53, label: "Filtre", description: "Tous les produits, seulement ceux pas encore comptés, ou seulement ceux en écart." },
            { id: 6, x: 66.5, y: 68.4, label: "Quantité comptée", description: "Tapez la quantité réellement présente en rayon : elle est enregistrée dès que vous quittez la case (ou appuyez sur Entrée)." },
            { id: 7, x: 72.4, y: 70.4, label: "Écart", description: "Compté moins théorique : en rouge un manquant, en vert un surplus." },
            { id: 8, x: 88.6, y: 21.5, label: "Valider l'inventaire", description: "Applique les écarts au stock (les produits non comptés ne changent pas). Chaque correction est tracée dans les mouvements de stock." },
            { id: 9, x: 78, y: 21.5, label: "Abandonner", description: "Annule l'inventaire sans toucher au stock." },
          ]}
        />
      </section>

      <section id="utilisateurs" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold">7. Utilisateurs &amp; accès</h2>
        <p className="text-sm text-neutral-500">
          Créez des comptes pour votre équipe et choisissez ce que chaque personne a le droit de faire.
        </p>
        <AnnotatedScreenshot
          src="/guide/utilisateurs.png"
          alt="Capture de la page utilisateurs"
          aspectRatio={1440 / 411}
          markers={[
            { id: 1, x: 88.6, y: 33.6, label: "Ajouter un utilisateur", description: "Ouvre un formulaire pour créer un compte (nom, email, mot de passe temporaire, rôle)." },
            { id: 2, x: 20.2, y: 61.4, label: "Nom et email", description: "Identité et identifiant de connexion de la personne." },
            { id: 3, x: 72.5, y: 61.4, label: "Rôle", description: "Administrateur (accès total), Gestionnaire (gestion courante, retours, inventaires) ou Vendeur (caisse et clients)." },
            { id: 4, x: 76.9, y: 61.5, label: "Statut", description: "Cliquez pour activer ou désactiver l'accès de la personne sans la supprimer." },
            { id: 5, x: 85.3, y: 61.4, label: "Retirer", description: "Retire définitivement cette personne de la boutique." },
          ]}
        />
      </section>

      <section id="bon-a-savoir" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold">8. Bon à savoir</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>
            <b>Retour ou annulation ?</b> Le retour concerne une partie des articles ; l&apos;annulation efface toute la
            vente (erreur de saisie, par exemple). Dans les deux cas, les articles reviennent en stock et le chiffre
            d&apos;affaires est corrigé.
          </li>
          <li>
            <b>Remboursements :</b> l&apos;application calcule le montant à rendre au client mais ne le renvoie pas
            automatiquement sur son mobile money ou sa carte : faites-le vous-même.
          </li>
          <li>
            <b>Ventes à crédit :</b> elles comptent dans le chiffre d&apos;affaires dès la vente. Le montant restant à
            encaisser est suivi à part (« Crédits clients » sur le tableau de bord, « Créances clients » dans Finances).
          </li>
          <li>
            <b>Hors connexion :</b> la caisse continue de fonctionner, y compris pour un client enregistré si la page
            était chargée avant la coupure. Les clients, retours et inventaires demandent une connexion.
          </li>
          <li>
            <b>Que commander ?</b> Stock → « À réapprovisionner » calcule, d&apos;après le rythme de vos ventes, combien de
            jours de stock il vous reste et la quantité à commander, puis crée la commande fournisseur en un clic.
          </li>
          <li>
            <b>Ce qui rapporte le plus :</b> Finances → « Par produit » classe vos produits par chiffre d&apos;affaires ou
            par marge et signale ceux dont la marge est trop faible.
          </li>
          <li>
            <b>WhatsApp :</b> sur la fiche d&apos;un client qui vous doit de l&apos;argent, « Relancer par WhatsApp » prépare un
            message de rappel poli ; sur une facture, « WhatsApp » envoie le récapitulatif au client. Vous relisez et
            envoyez vous-même depuis WhatsApp.
          </li>
          <li>
            <b>Qui peut faire quoi :</b> les vendeurs vendent, voient le stock et gèrent les clients et leurs
            paiements ; les gestionnaires ajoutent les retours, annulations, inventaires, finances et fournisseurs ;
            les administrateurs ont tous les droits.
          </li>
        </ul>
      </section>
    </div>
  );
}
