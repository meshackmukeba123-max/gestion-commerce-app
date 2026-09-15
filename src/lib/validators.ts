import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const productSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  unit: z.string().default("pièce"),
  costPrice: z.coerce.number().min(0).default(0),
  sellPrice: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().min(0).default(0),
  alertThreshold: z.coerce.number().min(0).default(5),
  expirationDate: z.string().optional().nullable(),
});

export const stockMovementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["ENTREE", "SORTIE", "AJUSTEMENT"]),
  quantity: z.coerce.number(),
  reason: z.string().optional(),
});

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
});

export const saleSchema = z.object({
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  paymentMethod: z.enum(["MAGASIN", "MOBILE_MONEY", "CARTE", "VIREMENT"]).default("MAGASIN"),
  items: z.array(saleItemSchema).min(1, "Ajoutez au moins un article"),
  offlineId: z.string().optional(),
  createdAt: z.string().optional(),
});

export const expenseSchema = z.object({
  category: z.enum([
    "LOYER",
    "SALAIRES",
    "TRANSPORT",
    "ACHAT_FOURNITURES",
    "ELECTRICITE_EAU",
    "MARKETING",
    "AUTRE",
  ]),
  label: z.string().min(1, "Libellé requis"),
  amount: z.coerce.number().positive("Montant doit être positif"),
  date: z.string().optional(),
  notes: z.string().optional(),
});

export const supplierSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  items: z.array(purchaseOrderItemSchema).min(1),
  notes: z.string().optional(),
});

export const storeSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  type: z.string().default("boutique"),
  address: z.string().optional(),
  phone: z.string().optional(),
  currency: z.string().default("CDF"),
  taxRate: z.coerce.number().min(0).max(100).default(16),
});

export const userInviteSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "6 caractères minimum"),
  role: z.enum(["ADMIN", "GESTIONNAIRE", "VENDEUR"]),
  storeId: z.string().min(1),
});

export const mobileMoneyChargeSchema = z.object({
  provider: z.enum(["ORANGE_MONEY", "AIRTEL_MONEY", "MPESA", "CINETPAY", "MOCK"]),
  phone: z.string().min(6, "Numéro de téléphone invalide"),
  amount: z.coerce.number().positive(),
  saleId: z.string().optional(),
  // Requis par CinetPay uniquement.
  clientFirstName: z.string().optional(),
  clientLastName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
});
