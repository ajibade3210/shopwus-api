import { NotFoundError } from "../../../lib/errors";
import type { BlogPostDto } from "../dto/blog.dto";

const EDITORIAL_POSTS: BlogPostDto[] = [
  {
    slug: "pricing-luxury-creative-services-nigeria",
    title:
      "How to Price Bespoke Creative & Production Engagements in West Africa",
    excerpt:
      "A strategic playbook on value-based pricing, retainer structuring, and protecting margins against inflation.",
    content:
      "When running a high-end atelier or production studio, pricing on time-and-materials severely caps your valuation. Transitioning to milestone-based deliverables with structured deposit retainers elevates brand authority and cashflow stability...",
    category: "pricing-strategy",
    categoryLabel: "Pricing Strategy",
    readTime: "6 min read",
    publishDate: "2026-08-15",
    author: {
      name: "Elena Vance",
      role: "Creative Director",
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
    },
    featuredImage:
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    tags: ["Pricing", "Retainers", "Luxury", "Valuation"],
  },
  {
    slug: "streamlining-inbound-client-inquiries-with-3d-storefronts",
    title:
      "Why Modern Studios Are Replacing Static PDFs with Interactive Storefronts",
    excerpt:
      "How immersive digital portfolios and direct inquiry funnels double lead qualification rates.",
    content:
      "Client attention spans are fleeting. Directing discerning VIP clients to an interactive, beautifully styled storefront with real-time package booking creates immediate brand distinction...",
    category: "storefront",
    categoryLabel: "Storefront & 3D Cards",
    readTime: "4 min read",
    publishDate: "2026-08-20",
    author: {
      name: "Tariq Adeleke",
      role: "Head of Product",
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
    },
    featuredImage:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
    tags: ["Storefront", "Lead Capture", "Brand Authority"],
  },
  {
    slug: "automating-invoices-and-cashflow-for-event-studios",
    title:
      "The Zero-Deficit Cashflow Architecture for Event & Floral Architects",
    excerpt:
      "Eliminate delayed payments and bad debt with automated reminders and instant PDF invoicing.",
    content:
      "Unpaid invoices stall production outlays. Setting Net-14 milestones with automated delivery notifications ensures seamless liquidity throughout large-scale production cycles...",
    category: "invoicing",
    categoryLabel: "Invoicing & Operations",
    readTime: "5 min read",
    publishDate: "2026-08-24",
    author: {
      name: "Elena Vance",
      role: "Creative Director",
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
    },
    featuredImage:
      "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800&q=80",
    tags: ["Invoicing", "Cashflow", "Operations"],
  },
];

export async function listBlogPostsService(
  category?: string,
): Promise<BlogPostDto[]> {
  if (!category || category === "all") {
    return EDITORIAL_POSTS;
  }
  return EDITORIAL_POSTS.filter((p) => p.category === category);
}

export async function getBlogPostBySlugService(
  slug: string,
): Promise<BlogPostDto> {
  const post = EDITORIAL_POSTS.find(
    (p) => p.slug === slug.toLowerCase().trim(),
  );
  if (!post) {
    throw new NotFoundError(`Blog post '${slug}' not found`);
  }
  return post;
}

export async function getRelatedBlogPostsService(
  currentSlug: string,
  limit = 2,
): Promise<BlogPostDto[]> {
  return EDITORIAL_POSTS.filter(
    (p) => p.slug !== currentSlug.toLowerCase().trim(),
  ).slice(0, limit);
}
