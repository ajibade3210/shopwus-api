export interface BlogPostDto {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  categoryLabel: string;
  readTime: string;
  publishDate: string;
  author: {
    name: string;
    role: string;
    avatarUrl?: string;
  };
  featuredImage?: string;
  tags: string[];
}
