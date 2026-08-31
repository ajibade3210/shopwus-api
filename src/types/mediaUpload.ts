export type ResourceType = "image" | "video" | "raw" | "auto";

export interface UploadOptions {
  folder?: string;
  public_id?: string;
  resource_type?: ResourceType;
  overwrite?: boolean;
  mimetype?: string;
}

export interface UploadResult {
  url: string;
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
}
