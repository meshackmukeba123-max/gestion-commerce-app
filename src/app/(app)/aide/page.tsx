import { AnnotatedScreenshot } from "@/components/guide/AnnotatedScreenshot";

export default function GuidePage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold">Guide d&apos;utilisation</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Ces captures viennent directement de l&apos;application en ligne. Chaque numéro entoure un élément de
          l&apos;écran et vous renvoie vers son explication ci-dessous.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Tableau de bord</h2>
        <p className="text-sm text-neutral-500">
          C&apos;est la page d&apos;accueil après connexion : un résumé de la journée et un accès rapide à tout le reste.
        </p>
        <AnnotatedScreenshot
          src="/guide/dashboard.png"
          alt="Capture du tableau de bord de l'application"
          aspectRatio={1440 / 1228}
          markers={[
            { id: 1, x: 31, y: 2.4, label: "Boutique active", description: "Nom de la boutique connectée ; cliquez pour changer de boutique si vous en gérez plusieurs." },
            { id: 2, x: 43, y: 7, label: "Barre de navigation", description: "Accès à toutes les sections (Vente, Stock, Finances...). Elle défile horizontalement sur petit écran." },
            { id: 3, x: 86, y: 2.4, label: "Profil", description: "Vos initiales : cliquez pour voir votre compte ou vous déconnecter." },
            { id: 4, x: 18, y: 26, label: "Actions rapides", description: "Raccourcis vers les opérations les plus fréquentes (nouvelle vente, nouveau produit...)." },
            { id: 5, x: 60, y: 24, label: "Toutes les applications", description: "Grille d'accès à tous les modules de l'application." },
            { id: 6, x: 49, y: 39, label: "Alerte stock bas", description: "S'affiche dès qu'un article passe sous son seuil d'alerte, avec un lien direct vers le stock." },
            { id: 7, x: 20, y: 49, label: "Indicateurs clés", description: "Ventes du jour, dépenses sur 30 jours, alertes stock et nombre de produits actifs." },
            { id: 8, x: 49, y: 69, label: "Chiffre d'affaires", description: "Évolution des ventes sur les 14 derniers jours." },
            { id: 9, x: 49, y: 91, label: "Alertes & activité récente", description: "Produits à réapprovisionner et dernières ventes enregistrées." },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. Vente (caisse)</h2>
        <p className="text-sm text-neutral-500">
          C&apos;est l&apos;écran de caisse utilisé pour encaisser un client, produit par produit.
        </p>
        <AnnotatedScreenshot
          src="/guide/vente.png"
          alt="Capture de l'écran de vente / caisse"
          aspectRatio={1440 / 520}
          markers={[
            { id: 1, x: 35, y: 38, label: "Recherche produit", description: "Tapez un nom, une référence ou scannez un code-barres pour ajouter un article au panier." },
            { id: 2, x: 61, y: 38, label: "Scanner", description: "Ouvre la caméra pour scanner un code-barres ou QR code." },
            { id: 3, x: 19, y: 52, label: "Liste des produits", description: "Cliquez sur une carte produit pour l'ajouter au panier." },
            { id: 4, x: 76, y: 44, label: "Panier", description: "Récapitule les articles sélectionnés, le sous-total, la taxe et le total à payer." },
            { id: 5, x: 76, y: 67, label: "Nom du client", description: "Champ optionnel, utile pour le suivi ou un reçu personnalisé." },
            { id: 6, x: 76, y: 76, label: "Mode de paiement", description: "Espèces, mobile money (M-Pesa, Airtel Money, CinetPay...) ou autre." },
            { id: 7, x: 76, y: 86, label: "Encaisser", description: "Valide la vente. Fonctionne aussi hors connexion : la vente se synchronise dès le retour du réseau." },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. Stock &amp; produits</h2>
        <p className="text-sm text-neutral-500">Gérez vos produits, leurs quantités et leurs seuils d&apos;alerte.</p>
        <AnnotatedScreenshot
          src="/guide/stock.png"
          alt="Capture de la page stock et produits"
          aspectRatio={1440 / 460}
          markers={[
            { id: 1, x: 22, y: 45, label: "Recherche", description: "Recherchez un produit par nom, référence ou code-barres." },
            { id: 2, x: 35, y: 45, label: "Stock bas uniquement", description: "Filtre pour n'afficher que les produits sous leur seuil d'alerte." },
            { id: 3, x: 84, y: 33, label: "Nouveau produit", description: "Ajoute un nouvel article au catalogue de la boutique." },
            { id: 4, x: 83, y: 45, label: "Mouvements de stock", description: "Historique des entrées et sorties de stock (réceptions, ajustements, ventes)." },
            { id: 5, x: 49, y: 70, label: "Tableau des produits", description: "Les quantités affichées en rouge sont sous le seuil d'alerte défini pour ce produit." },
            { id: 6, x: 83, y: 65, label: "Gérer", description: "Ouvre la fiche du produit pour modifier son prix, son stock ou son seuil." },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. Utilisateurs &amp; accès</h2>
        <p className="text-sm text-neutral-500">
          Créez des comptes pour votre équipe et choisissez ce que chaque personne a le droit de faire.
        </p>
        <AnnotatedScreenshot
          src="/guide/utilisateurs.png"
          alt="Capture de la page utilisateurs"
          aspectRatio={1440 / 420}
          markers={[
            { id: 1, x: 83, y: 37, label: "Ajouter un utilisateur", description: "Ouvre un formulaire pour créer un compte (nom, email, mot de passe temporaire, rôle)." },
            { id: 2, x: 21, y: 60, label: "Nom et email", description: "Identité et identifiant de connexion de la personne." },
            { id: 3, x: 61, y: 60, label: "Rôle", description: "Administrateur (accès total), Gestionnaire (gestion courante) ou Vendeur (caisse uniquement)." },
            { id: 4, x: 74, y: 60, label: "Statut", description: "Cliquez pour activer ou désactiver l'accès de la personne sans la supprimer." },
            { id: 5, x: 83, y: 60, label: "Retirer", description: "Retire définitivement cette personne de la boutique." },
          ]}
        />
      </section>
    </div>
  );
}
