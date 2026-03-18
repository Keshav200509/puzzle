export type BlogPostStatus = "DRAFT" | "PUBLISHED";

export type BlogAuthor = {
  id: string;
  name: string;
  slug: string;
  bio: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  status: BlogPostStatus;
  publishedAt: string | null;
  updatedAt: string;
  author: BlogAuthor;
  category: {
    name: string;
    slug: string;
  };
  seoTitle?: string;
  seoDescription?: string;
};
