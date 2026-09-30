const base = () => (process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

async function token() {
  const auth = Buffer.from(`${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("PayPal auth failed");
  return (await res.json()).access_token as string;
}

export async function createPayPalOrder(totalCents: number, currency: string, referenceId: string, description: string) {
  const res = await fetch(`${base()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}`, "content-type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        { reference_id: referenceId, description: description.slice(0, 120), amount: { currency_code: currency, value: (totalCents / 100).toFixed(2) } },
      ],
    }),
  });
  if (!res.ok) throw new Error(`PayPal create order failed: ${await res.text()}`);
  return (await res.json()) as { id: string };
}

export async function capturePayPalOrder(orderId: string) {
  const res = await fetch(`${base()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}`, "content-type": "application/json" },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`PayPal capture failed: ${JSON.stringify(json)}`);
  const unit = json.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  return {
    status: json.status as string,
    captureId: capture?.id as string | undefined,
    amount: capture?.amount?.value as string | undefined,
    currency: capture?.amount?.currency_code as string | undefined,
  };
}
