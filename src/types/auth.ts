export type SocialProvider = "google";

export interface SocialProfile {
  providerId: string; // provider-specific sub (google UID)
  provider: SocialProvider;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
}

export type Jwk = {
  kty: string;
  kid: string;
  use?: string;
  alg: string;
  n: string;
  e: string;
};

export interface SocialJwtPayload {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
}

export interface GoogleUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  given_name?: string;
  family_name?: string;
  name?: string;
}
