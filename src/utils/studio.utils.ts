export function normalizeButtonRadius(radius?: string | null): string {
  if (!radius) return "Subtle";
  switch (radius.toLowerCase().trim()) {
    case "0px":
    case "square":
    case "none":
      return "Square";
    case "12px":
    case "16px":
    case "rounded":
      return "Rounded";
    case "9999px":
    case "pill":
    case "full":
      return "Pill";
    default:
      return "Subtle";
  }
}

export function getBusinessTypeSubjectPrefix(
  businessType?: string | null,
): string {
  const bType = businessType?.toLowerCase().trim() || "sales";
  switch (bType) {
    case "service":
      return "New Consultation Request";
    case "retail":
      return "New Purchase Request";
    case "ecommerce":
      return "New Store Order";
    default:
      return "New Order Request";
  }
}

