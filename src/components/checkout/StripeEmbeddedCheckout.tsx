import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";

import { createCheckoutSession } from "@/lib/payments.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";

export interface StripeCheckoutOrder {
  pack: "1" | "3" | "6";
  shipping: "standard" | "express";
  email: string;
  firstName: string;
  lastName: string;
  country: "United Kingdom";
  postalCode: string;
  street: string;
  apartment?: string;
  city: string;
  phone?: string;
}

export function StripeEmbeddedCheckout({ order }: { order: StripeCheckoutOrder }) {
  const createSession = useServerFn(createCheckoutSession);
  const fetchClientSecret = useCallback(async () => {
    const result = await createSession({
      data: {
        ...order,
        environment: getStripeEnvironment(),
        returnUrl: window.location.href,
      },
    });
    if ("error" in result) throw new Error(result.error);
    return result.clientSecret;
  }, [createSession, order]);

  return (
    <div id="checkout" className="min-h-[520px]">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}