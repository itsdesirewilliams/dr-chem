/**
 * Shared domain types mapped from the DR-Chem PostgreSQL schema.
 * Field names intentionally mirror the database columns; nested objects are
 * the aggregated "presentation" shape assembled by lib/*.ts queries.
 */

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  articleNumber: string | null;
  summary: string | null;
  isFeatured: boolean;
  primaryCas: string | null;
  formula: string | null;
  molecularWeight: number | null;
  primaryCategorySlug: string | null;
  primaryCategoryName: string | null;
  hsCode: string | null;
  shelfLifeText: string | null;
}

export interface Packing {
  code: string;
  title: string | null;
  description: string | null;
  sizeValue: number | null;
  sizeUnit: string | null;
  price: number | null;
  currency: string | null;
}

export interface PropertyRow {
  propertyType: "spec" | "physical";
  label: string;
  valueText: string | null;
  unit: string | null;
  sortOrder: number;
}

export interface CasRow {
  casNumber: string;
  isPrimary: boolean;
  note: string | null;
}

export interface DocumentRow {
  documentType: "sds" | "tds" | "coa" | "catalogue" | "regulatory" | "other";
  title: string;
  description: string | null;
  storageKey: string;
  originalFilename: string | null;
  mimeType: string | null;
}

export interface ImageRow {
  storageKey: string | null;
  url: string | null;
  altText: string | null;
  caption: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface SourceUrlRow {
  url: string;
  sourceType: string;
  isPrimary: boolean;
  note: string | null;
}

export interface CategoryLink {
  slug: string;
  name: string;
  isPrimary: boolean;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  synonyms: string[];
  cas: CasRow[];
  packings: Packing[];
  properties: PropertyRow[];
  documents: DocumentRow[];
  images: ImageRow[];
  sourceUrls: SourceUrlRow[];
  categories: CategoryLink[];
  revisionDates: string[];
  legacyRef: string | null;
  status: string;
}

export interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  productCount: number;
  children: CategoryNode[];
}

export interface SearchResultItem {
  slug: string;
  name: string;
  articleNumber: string | null;
  summary: string | null;
  matchedTerm: string;
  sourceType: string;
  rank: number;
  primaryCas: string | null;
  formula: string | null;
}

export interface SearchPage {
  items: SearchResultItem[];
  total: number;
  nextCursor: string | null;
  usedFuzzyFallback: boolean;
}

export interface SuggestedTerm {
  productSlug: string;
  productName: string;
  term: string;
  sourceType: string;
  articleNumber: string | null;
}