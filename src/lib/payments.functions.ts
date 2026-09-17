import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getBundle, getShippingMethod } from "./offer";
import { sendPaidOrderToTracking } from "./order.server";
import {
  createStripeClient,
  getStripeErrorMessage,
  type StripeEnv,
} from "./stripe.server";

const packPriceIds: Record<string, string> = {
  "1": "ai_essentials_first_steps",
  "3": "ai_productivity_mastery",
  "6": "ai_business_accelerator",
};

const orderInputSchema = z.object({
  pack: z.enum(["1", "3", "6"]),
  shipping: z.enum(["standard", "express"]),
  email: z.string().email(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  country: z.literal("United Kingdom"),
  postalCode: z.string().trim().min(1).max(12),
  street: z.string().trim().min(1).max(200),
  apartment: z.string().trim().max(100).optional().default(""),
  city: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30).optional().default(""),
});

const checkoutInputSchema = orderInputSchema.extend({
  returnUrl: z.string().url().max(500),
  environment: z.enum(["sandbox", "live"]),
});

type CheckoutResult = { clientSecret: string } | { error: string };

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutInputSchema.parse(data))
  .handler(async ({ data }): Promise<CheckoutResult> => {
    try {
      const stripe = createStripeClient(data.environment as StripeEnv);
      const priceId = packPriceIds[data.pack];
      if (!priceId) return { error: "The selected pack is unavailable." };

      const prices = await stripe.prices.list({ lookup_keys: [priceId], active: true, limit: 1 });
      const stripePrice = prices.data[0];
      if (!stripePrice) return { error: "The selected pack is not configured in Stripe." };

      const productId =
        typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);
      const shipping = getShippingMethod(data.shipping);
      if (!shipping) return { error: "Select a valid shipping method." };

      const orderNumber = `NG-${Date.now().toString(36).toUpperCase()}`;
      const returnUrl = new URL(data.returnUrl);
      returnUrl.searchParams.set("payment", "return");
      returnUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
      returnUrl.searchParams.set("pack", data.pack);

      const metadata = {
        pack: data.pack,
        shipping: data.shipping,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        country: data.country,
        postalCode: data.postalCode,
        street: data.street,
        apartment: data.apartment,
        city: data.city,
        phone: data.phone,
        orderNumber,
      };

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        locale: "en-GB",
        return_url: returnUrl.toString(),
        customer_email: data.email,
        billing_address_collection: "required",
        phone_number_collection: { enabled: true },
        automatic_tax: { enabled: true },
        client_reference_id: orderNumber,
        metadata,
        line_items: [
          { price: stripePrice.id, quantity: 1 },
          {
            price_data: {
              currency: "gbp",
              unit_amount: Math.round(shipping.amount * 100),
              product_data: { name: shipping.label },
              tax_behavior: "exclusive",
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          description: product.name,
          metadata: { pack: data.pack, orderNumber },
        },
      });

      if (!session.client_secret) return { error: "Stripe did not return a checkout session." };
      return { clientSecret: session.client_secret };
    } catch (error) {
      console.error("Stripe checkout session failed", getStripeErrorMessage(error));
      return { error: getStripeErrorMessage(error) };
    }
  });

const confirmInputSchema = z.object({
  sessionId: z.string().regex(/^cs_(?:test_|live_)?[A-Za-z0-9]+$/),
  environment: z.enum(["sandbox", "live"]),
});

type ConfirmationResult =
  | { status: "paid"; orderNumber: string; tracking: boolean }
  | { status: "pending" }
  | { status: "error"; error: string };

export const confirmCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => confirmInputSchema.parse(data))
  .handler(async ({ data }): Promise<ConfirmationResult> => {
    try {
      const stripe = createStripeClient(data.environment as StripeEnv);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      if (session.payment_status !== "paid") return { status: "pending" };

      const parsedOrder = orderInputSchema.safeParse({
        pack: session.metadata?.pack,
        shipping: session.metadata?.shipping,
        email: session.metadata?.email,
        firstName: session.metadata?.firstName,
        lastName: session.metadata?.lastName,
        country: session.metadata?.country,
        postalCode: session.metadata?.postalCode,
        street: session.metadata?.street,
        apartment: session.metadata?.apartment,
        city: session.metadata?.city,
        phone: session.metadata?.phone,
      });
      if (!parsedOrder.success) {
        console.error("Paid Stripe session has invalid order metadata", session.id);
        return { status: "error", error: "Payment confirmed, but order details are incomplete." };
      }

      const result = await sendPaidOrderToTracking({
        ...parsedOrder.data,
        orderNumber: session.metadata?.orderNumber || session.client_reference_id || undefined,
      });
      return { status: "paid", orderNumber: result.orderNumber, tracking: result.tracking };
    } catch (error) {
      console.error("Stripe checkout confirmation failed", getStripeErrorMessage(error));
      return { status: "error", error: getStripeErrorMessage(error) };
    }
  });