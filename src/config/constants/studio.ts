export const DEFAULT_COLOR_SCHEME = {
  primary: "#000000",
  secondary: "#0058BE",
  button: "#000000",
  pageBackground: "#FAF8F5",
  cardBackground: "#FAF6F0",
  text: "#191C1D",
};

export const DEFAULT_PORTFOLIO_CATEGORIES = [
  "Brand Identity",
  "UI/UX & Product",
  "Packaging & Print",
  "Art Direction",
];

export const DEFAULT_FOOTER_SETTINGS = {
  footerEyebrow: "Begin Your Journey",
  footerTitle: "Ready to Create Something Extraordinary?",
  footerDescription:
    "Tell us what you're planning and we'll get back to you to schedule an initial consultation with our creative directors.",
  showFooterCta: true,
};

export const DEFAULT_BUTTON_RADIUS = "Subtle";

export const DEFAULT_BUSINESS_TYPE = "sales";

export const DEFAULT_VISIBILITY_SETTINGS = {
  showServices: true,
  showPortfolio: true,
  showReviews: true,
  showFooterCta: true,
};

export const DEFAULT_SOCIAL_CHANNELS = [
  { type: "instagram", label: "Instagram", connected: false, handle: "", url: "" },
  { type: "facebook", label: "Facebook", connected: false, handle: "", url: "" },
  { type: "linkedin", label: "LinkedIn", connected: false, handle: "", url: "" },
  { type: "tiktok", label: "TikTok", connected: false, handle: "", url: "" },
  { type: "x", label: "X", connected: false, handle: "", url: "" },
  { type: "youtube", label: "YouTube", connected: false, handle: "", url: "" },
  { type: "whatsapp", label: "WhatsApp", connected: false, handle: "", url: "" },
  { type: "threads", label: "Threads", connected: false, handle: "", url: "" },
  { type: "pinterest", label: "Pinterest", connected: false, handle: "", url: "" },
  { type: "website", label: "Website", connected: false, handle: "", url: "" },
] as const;
