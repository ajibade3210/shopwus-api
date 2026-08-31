export interface ColorSchemeDto {
  primary: string;
  secondary: string;
  button: string;
  pageBackground?: string;
  cardBackground?: string;
  text: string;
}

export interface ServiceItemDto {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  price?: number | null;
  isFeatured?: boolean;
}

export interface PortfolioProjectDto {
  id: string;
  title: string;
  category?: string | null;
  location?: string | null;
  description?: string | null;
  image?: string | null;
  order?: number;
  isCover?: boolean;
  gallery?: string[];
  stats?: string | null;
  client?: string | null;
  year?: string | null;
}

export interface ReviewItemDto {
  id: string;
  author: string;
  role?: string | null;
  eventType?: string | null;
  rating: number;
  comment: string;
  date: string;
  avatar?: string | null;
}

export interface SocialChannelDto {
  id: string;
  type: string;
  connected: boolean;
  label?: string | null;
  handle?: string | null;
  url?: string | null;
  description?: string | null;
  lastSynced?: string | null;
}

export interface OrganizationPreviewDto {
  id: string;
  name: string;
  slug: string;
  eyebrow: string;
  tagline: string;
  logoUrl: string;
  badge: string;
}

export interface StudioStorefrontResponseDto {
  id: string;
  slug: string;
  businessName: string;
  tagline?: string | null;
  description?: string | null;
  location?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsAppNumber?: string | null;
  logoUrl?: string | null;
  businessType?: string;
  currency?: string;
  colors: ColorSchemeDto;
  buttonRadius?: string | null;
  operatingHours?: string | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  byAppointmentOnly: boolean;
  showServices: boolean;
  showPortfolio: boolean;
  showReviews: boolean;
  showFooterCta: boolean;
  footerEyebrow?: string | null;
  footerTitle?: string | null;
  footerDescription?: string | null;
  googleReviewsLink?: string | null;
  portfolioCategories?: string[];
  isPublished: boolean;
  services: ServiceItemDto[];
  portfolio: PortfolioProjectDto[];
  reviews: ReviewItemDto[];
  socialChannels: SocialChannelDto[];
  updatedAt: string;
}
