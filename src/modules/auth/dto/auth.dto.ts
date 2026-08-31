import type { Role } from "@prisma/client";

export interface AuthResponseDto {
  token: string;
  accessToken: string;
  refreshToken: string;
  isNewUser?: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    name?: string;
    role: Role;
    avatarUrl?: string | null;
    studioId?: string;
    studioName?: string;
    studioSlug?: string;
  };
  studio?: {
    id: string;
    slug: string;
    name: string;
    tagline?: string | null;
    logoUrl?: string | null;
    currency?: string;
    isPublished?: boolean;
    role: Role;
  } | null;
}
