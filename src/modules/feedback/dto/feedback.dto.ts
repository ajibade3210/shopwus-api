export interface FeedbackRequestDto {
  id: string;
  userId?: string | null;
  businessId?: string | null;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
