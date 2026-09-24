import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Suppression des données existantes…");
  await db.mobileMoneyTransaction.deleteMany();
  await db.inventoryCountItem.deleteMany();
  await db.inventoryCount.deleteMany();
  await db.saleReturnItem.deleteMany();
  await db.saleReturn.deleteMany();
  await db.customerPayment.deleteMany();
  await db.saleItem.deleteMany();
  await db.sale.deleteMany();
  await db.customer.deleteMany();
  await db.stockMovement.deleteMany();
  await db.purchaseOrderItem.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.expense.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.supplier.deleteMany();
  await db.storeMembership.deleteMany();
  await db.store.deleteMany();
  await db.user.deleteMany();

  console.log("Création des utilisateurs de démonstration…");
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const admin = await db.user.create({
    data: { name: "Amina Kabongo", email: "admin@demo.com", passwordHash },
  });
  const gestionnaire = await db.user.create({
    data: { name: "Joseph Mwamba", email: "gestionnaire@demo.com", passwordHash },
  });
  const vendeur = await db.user.create({
    data: { name: "Grace Ilunga", email: "vendeur@demo.com", passwordHash },
  });

  console.log("Création des boutiques de démonstration…");
  const quincaillerie = await db.store.create({
    data: {
      name: "Quincaillerie La Bonne Affaire",
      type: "quincaillerie",
      address: "Avenue du Commerce, Lubumbashi",
      phone: "+243 970 000 001",
      currency: "CDF",
      taxRate: 16,
      memberships: {
        create: [
          { userId: admin.id, role: "ADMIN" },
          { userId: gestionnaire.id, role: "GESTIONNAIRE" },
          { userId: vendeur.id, role: "VENDEUR" },
        ],
      },
    },
  });

  const pharmacie = await db.store.create({
    data: {
      name: "Pharmacie Santé Plus",
      type: "pharmacie",
      address: "Boulevard Lumumba, Kinshasa",
      phone: "+243 970 000 002",
      currency: "CDF",
      taxRate: 0,
      memberships: { create: [{ userId: admin.id, role: "ADMIN" }] },
    },
  });

  console.log("Création des catégories et produits…");
  const [quincaillerieCat, outillage] = await Promise.all([
    db.category.create({ data: { name: "Matériaux de construction" } }),
    db.category.create({ data: { name: "Outillage" } }),
  ]);
  const medicaments = await db.category.create({ data: { name: "Médicaments" } });

  const produitsQuincaillerie = await Promise.all([
    db.product.create({
      data: {
        storeId: quincaillerie.id,
        categoryId: quincaillerieCat.id,
        name: "Ciment 50kg",
        sku: "CIM-50",
        barcode: "6001234500019",
        unit: "sac",
        costPrice: 12000,
        sellPrice: 15000,
        quantity: 120,
        alertThreshold: 20,
      },
    }),
    db.product.create({
      data: {
        storeId: quincaillerie.id,
        categoryId: quincaillerieCat.id,
        name: "Tôle ondulée 2m",
        sku: "TOL-2M",
        barcode: "6001234500026",
        unit: "pièce",
        costPrice: 18000,
        sellPrice: 23000,
        quantity: 8,
        alertThreshold: 10,
      },
    }),
    db.product.create({
      data: {
        storeId: quincaillerie.id,
        categoryId: outillage.id,
        name: "Marteau menuisier",
        sku: "MRT-01",
        barcode: "6001234500033",
        unit: "pièce",
        costPrice: 5000,
        sellPrice: 8000,
        quantity: 35,
        alertThreshold: 5,
      },
    }),
    db.product.create({
      data: {
        storeId: quincaillerie.id,
        categoryId: outillage.id,
        name: "Boîte de vis (100pcs)",
        sku: "VIS-100",
        barcode: "6001234500040",
        unit: "boîte",
        costPrice: 2000,
        sellPrice: 3500,
        quantity: 4,
        alertThreshold: 10,
      },
    }),
  ]);

  const produitsPharmacie = await Promise.all([
    db.product.create({
      data: {
        storeId: pharmacie.id,
        categoryId: medicaments.id,
        name: "Paracétamol 500mg (boîte)",
        sku: "PARA-500",
        barcode: "6009876500011",
        unit: "boîte",
        costPrice: 1500,
        sellPrice: 2500,
        quantity: 200,
        alertThreshold: 30,
        expirationDate: new Date(new Date().setMonth(new Date().getMonth() + 18)),
      },
    }),
    db.product.create({
      data: {
        storeId: pharmacie.id,
        categoryId: medicaments.id,
        name: "Amoxicilline 250mg",
        sku: "AMOX-250",
        barcode: "6009876500028",
        unit: "boîte",
        costPrice: 3000,
        sellPrice: 5000,
        quantity: 12,
        alertThreshold: 15,
        expirationDate: new Date(new Date().setDate(new Date().getDate() + 20)),
      },
    }),
    db.product.create({
      data: {
        storeId: pharmacie.id,
        categoryId: medicaments.id,
        name: "Sirop antitussif",
        sku: "SIR-TX",
        barcode: "6009876500035",
        unit: "flacon",
        costPrice: 4000,
        sellPrice: 6500,
        quantity: 5,
        alertThreshold: 8,
        expirationDate: new Date(new Date().setDate(new Date().getDate() - 5)),
      },
    }),
  ]);

  console.log("Enregistrement du stock initial…");
  for (const p of [...produitsQuincaillerie, ...produitsPharmacie]) {
    await db.stockMovement.create({
      data: { storeId: p.storeId, productId: p.id, type: "ENTREE", quantity: p.quantity, reason: "Stock initial", userId: admin.id },
    });
  }

  console.log("Création d'un fournisseur…");
  const fournisseur = await db.supplier.create({
    data: {
      storeId: quincaillerie.id,
      name: "Distributeur Matériaux Katanga",
      phone: "+243 970 111 222",
      email: "contact@dmk.cd",
      address: "Zone industrielle, Lubumbashi",
    },
  });
  await db.purchaseOrder.create({
    data: {
      storeId: quincaillerie.id,
      supplierId: fournisseur.id,
      status: "EN_ATTENTE",
      paymentStatus: "IMPAYE",
      totalAmount: 240000,
      items: { create: [{ productId: produitsQuincaillerie[0].id, quantity: 20, unitCost: 12000 }] },
    },
  });

  console.log("Création de ventes et dépenses de démonstration…");
  const sale = await db.sale.create({
    data: {
      storeId: quincaillerie.id,
      userId: vendeur.id,
      clientName: "Client comptoir",
      paymentMethod: "MAGASIN",
      subtotal: 30000,
      taxAmount: 4800,
      total: 34800,
      items: {
        create: [{ productId: produitsQuincaillerie[0].id, quantity: 2, unitPrice: 15000, total: 30000 }],
      },
    },
  });
  await db.stockMovement.create({
    data: { storeId: quincaillerie.id, productId: produitsQuincaillerie[0].id, type: "SORTIE", quantity: 2, reason: `Vente ${sale.id}`, userId: vendeur.id },
  });
  await db.product.update({ where: { id: produitsQuincaillerie[0].id }, data: { quantity: { decrement: 2 } } });

  console.log("Création de clients et d'une vente à crédit…");
  const clientCredit = await db.customer.create({
    data: { storeId: quincaillerie.id, name: "Entreprise Kasongo BTP", phone: "+243 990 111 222", creditLimit: 500000 },
  });
  await db.customer.create({ data: { storeId: quincaillerie.id, name: "Marie Tshibanda", phone: "+243 810 333 444" } });
  const creditSale = await db.sale.create({
    data: {
      storeId: quincaillerie.id,
      userId: gestionnaire.id,
      customerId: clientCredit.id,
      clientName: clientCredit.name,
      clientPhone: clientCredit.phone,
      paymentMethod: "MAGASIN",
      subtotal: 75000,
      taxAmount: 12000,
      total: 87000,
      balanceDue: 57000, // acompte de 30 000 versé
      items: {
        create: [{ productId: produitsQuincaillerie[0].id, quantity: 5, unitPrice: 15000, total: 75000 }],
      },
    },
  });
  await db.stockMovement.create({
    data: { storeId: quincaillerie.id, productId: produitsQuincaillerie[0].id, type: "SORTIE", quantity: 5, reason: `Vente ${creditSale.id}`, userId: gestionnaire.id },
  });
  await db.product.update({ where: { id: produitsQuincaillerie[0].id }, data: { quantity: { decrement: 5 } } });

  await db.expense.createMany({
    data: [
      { storeId: quincaillerie.id, category: "LOYER", label: "Loyer du mois", amount: 150000 },
      { storeId: quincaillerie.id, category: "TRANSPORT", label: "Transport marchandises", amount: 25000 },
      { storeId: pharmacie.id, category: "ELECTRICITE_EAU", label: "Facture électricité", amount: 40000 },
    ],
  });

  console.log("\nTerminé !");
  console.log("Comptes de démonstration (mot de passe: demo1234) :");
  console.log("  admin@demo.com          -> Administrateur (Quincaillerie + Pharmacie)");
  console.log("  gestionnaire@demo.com   -> Gestionnaire (Quincaillerie)");
  console.log("  vendeur@demo.com        -> Vendeur (Quincaillerie)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
