import { CURRENCY_SYMBOL, PRODUCT_NAME, getBundle, parseAmount } from "./offer";

export interface TrackingOrderInput {
  pack: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  postalCode: string;
  street: string;
  apartment?: string;
  city: string;
  phone?: string;
  orderNumber?: string;
}

export async function sendPaidOrderToTracking(data: TrackingOrderInput) {
  const webhookUrl = process.env["TRACKING_WEBHOOK_URL"];
  const bundle = getBundle(data.pack);
  const total = parseAmount(bundle.price);
  const orderNumber = data.orderNumber ?? `NG-${Date.now().toString(36).toUpperCase()}`;

  const payload = {
    event: "payment_approved",
    order: {
      order_number: orderNumber,
      status: "paid",
      payment_status: "approved",
      currency: "GBP",
      currency_symbol: CURRENCY_SYMBOL,
      total,
      total_formatted: bundle.price,
      created_at: new Date().toISOString(),
      items: [
        {
          name: bundle.productName ?? PRODUCT_NAME,
          variant: bundle.variant ?? bundle.title,
          quantity: bundle.quantity ?? 1,
          price: total,
        },
        ...bundle.gifts.map((gift) => ({
          name: gift.label.replace(/^\+\s*/, ""),
          variant: "Free gift",
          quantity: 1,
          price: 0,
        })),
      ],
    },
    customer: {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      name: `${data.firstName} ${data.lastName}`.trim(),
      phone: data.phone ?? "",
    },
    shipping_address: {
      first_name: data.firstName,
      last_name: data.lastName,
      street: data.street,
      complement: data.apartment ?? "",
      city: data.city,
      postal_code: data.postalCode,
      country: data.country,
      phone: data.phone ?? "",
    },
  };

  if (!webhookUrl) {
    console.error("TRACKING_WEBHOOK_URL is not configured");
    return { ok: false as const, orderNumber, tracking: false as const };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`Tracking webhook failed: ${response.status} ${await response.text()}`);
      return { ok: true as const, orderNumber, tracking: false as const };
    }
  } catch (error) {
    console.error(error);
    return { ok: true as const, orderNumber, tracking: false as const };
  }

  return { ok: true as const, orderNumber, tracking: true as const };
}