import { NextResponse } from "next/server";
import { execute, one } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Enquiry submission — the contact-form foundation.
 *
 * Writes an `enquiries` row (channel = 'web', status = 'new') and a `lead`
 * from the same data so sales has a single pipeline entry. Guest-safe: user_id
 * stays NULL (superset of the RLS scope — the server uses the privileged pool
 * exactly like the importer). No secrets, no third party.
 */
export async function POST(request: Request) {
  let body: {
    name?: unknown;
    email?: unknown;
    company?: unknown;
    message?: unknown;
    productRef?: unknown;
    phone?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 320) : "";
  const company =
    typeof body.company === "string" ? body.company.trim().slice(0, 200) : "";
  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, 5000) : "";
  const phone =
    typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : "";
  const productRef =
    typeof body.productRef === "string" ? body.productRef.trim().slice(0, 200) : "";

  // Honeypot / cheap validation.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!name || !emailOk) {
    return NextResponse.json(
      { error: "Please provide a name and a valid email address." },
      { status: 422 },
    );
  }

  // Locate an optional product by slug or article number.
  let productId: string | null = null;
  if (productRef) {
    const product = await one<{ id: string }>(
      `SELECT id FROM products
        WHERE status = 'active'
          AND (slug = $1 OR article_number = $1)
        LIMIT 1`,
      [productRef],
    );
    productId = product?.id ?? null;
  }

  const title = `${name}${productRef ? ` — ${productRef}` : ""} — website enquiry`;

  await execute(
    `INSERT INTO enquiries
       (user_id, product_id, subject, message, channel, status, priority)
     VALUES (NULL, $1, $2, $3, 'web', 'new', 'normal')`,
    [productId, title, message],
  );

  await execute(
    `INSERT INTO leads
       (status, source, contact_name, contact_email, contact_phone,
        interest_note)
     VALUES ('new', 'enquiry', $1, $2, $3, $4)`,
    [company ? `${name} (${company})` : name, email, phone, message.slice(0, 2000)],
  );

  return NextResponse.json({ ok: true, reference: `web-${Date.now()}` });
}