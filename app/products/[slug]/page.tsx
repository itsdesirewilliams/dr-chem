import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";
import type { ProductDetail } from "@/lib/types";
import { Breadcrumbs } from "@/components/ui";
import {
  ProductHeader,
  ProductInfoTable,
  DescriptionSection,
  PropertiesSection,
  SafetySection,
  PackingsSection,
  SynonymsSection,
  RelatedSection,
  EnquiryRail,
  MobileStickyBar,
} from "@/components/product/ProductSections";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, 6);

  return (
    <div className="pb-6 sm:pb-16">
      <div className="container-site pt-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Products", href: "/products" },
            ...(product.primaryCategoryName
              ? [{ label: product.primaryCategoryName, href: `/categories/${product.primaryCategorySlug}` }]
              : []),
            { label: product.name },
          ]}
        />
      </div>

      <ProductHeader product={product} />

      <div className="container-site grid grid-cols-1 gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="min-w-0 space-y-10">
          <ProductInfoTable product={product} />
          <DescriptionSection product={product} />
          <PropertiesSection properties={product.properties} />
          <SafetySection product={product} />
          <PackingsSection packings={product.packings} />
          <SynonymsSection synonyms={product.synonyms ?? []} />
          {related.length > 0 ? <RelatedSection related={related} /> : null}
        </div>
        <div className="hidden lg:block">
          <EnquiryRail product={product} />
        </div>
      </div>

      <MobileStickyBar product={product} />
    </div>
  );
}