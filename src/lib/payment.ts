export async function initiatePayUCheckout(
  instituteId: string,
  onStart?: () => void,
  onError?: (err: string) => void
) {
  if (!instituteId) {
    if (onError) onError("No active centre selected.");
    return;
  }
  if (onStart) onStart();
  try {
    const res = await fetch("/api/payments/payu/initiate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instituteId }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (onError) onError(data.error || "Payment initiation failed");
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = data.paymentUrl;
    Object.entries(data.fields as Record<string, string>).forEach(
      ([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
    );
    document.body.appendChild(form);
    form.submit();
  } catch (e) {
    if (onError) onError("Network error initiating payment.");
  }
}
