import { rows } from "@/lib/db";
import type { CategoryNode } from "@/lib/types";

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  productCount: string | number;
}

/**
 * Full active category tree, each node carrying a live count of *active*
 * products (mirroring the RLS public-read stance).
 */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const raw = await rows<CategoryRow>(
    `WITH RECURSIVE sub(id, root) AS (
       SELECT id, id FROM categories WHERE is_active
       UNION ALL
       SELECT c.id, s.root
         FROM categories c
         JOIN sub s ON c.parent_id = s.root
        WHERE c.is_active
     )
     SELECT c.id, c.slug, c.name, c.description, c.parent_id,
            (SELECT COUNT(*)::int FROM product_categories pc
              JOIN products p ON p.id = pc.product_id
             WHERE p.status = 'active'
               AND pc.category_id IN (SELECT id FROM sub WHERE root = c.id)
            ) AS "productCount"
       FROM categories c
      WHERE c.is_active
      ORDER BY c.sort_order, c.name`,
  );

  const map = new Map<string, CategoryNode>();
  for (const r of raw) {
    map.set(r.id, {
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      parentId: r.parentId,
      productCount: Number(r.productCount ?? 0),
      children: [],
    });
  }

  const roots: CategoryNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRec = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

/** Flat list of active categories (all levels) with counts. */
export async function listCategories(): Promise<CategoryNode[]> {
  const roots = await getCategoryTree();
  const flat: CategoryNode[] = [];
  const walk = (nodes: CategoryNode[]) => {
    for (const n of nodes) {
      flat.push(n);
      walk(n.children);
    }
  };
  walk(roots);
  return flat;
}

/** Resolve a single category by slug (active only). */
export async function getCategoryBySlug(
  slug: string,
): Promise<CategoryNode | null> {
  const flat = await listCategories();
  return flat.find((c) => c.slug === slug) ?? null;
}