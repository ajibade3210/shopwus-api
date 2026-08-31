export interface QRCodeOptions {
  logoUrl?: string;
  name: string;
  width?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}
