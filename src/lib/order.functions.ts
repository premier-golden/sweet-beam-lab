import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sendPaidOrderToTracking } from "./order.server";

const orderSchema = z.object({
  pack: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  country: z.string().min(1),
  postalCode: z.string().min(1),
  street: z.string().min(1),
  apartment: z.string().optional().default(""),
  city: z.string().min(1),
  phone: z.string().optional().default(""),
});

export type OrderInput = z.input<typeof orderSchema>;

/**
 * Fires on an approved payment: sends the full customer + order payload to the
 * tracking platform webhook so the tracking code is emailed automatically.
 */
export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    return sendPaidOrderToTracking(data);
  });
