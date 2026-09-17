import { loadStripe, type Stripe } from "@stripe/stripe-js";

export type StripeEnvironment = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function getStripeEnvironment(): StripeEnvironment {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Stripe payments are not configured for this build. Complete Stripe go-live to enable checkout.",
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    getStripeEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}