import type { BlogPost } from "@/lib/blog/types";

const authors = {
  maya: {
    id: "a-1",
    name: "Maya Chen",
    slug: "maya-chen",
    bio: "Editor-in-Chief focused on modern platform engineering and growth content strategy."
  }
} as const;

const posts: BlogPost[] = [
  {
    id: "p-1",
    slug: "launching-seo-first-content-platform",
    title: "Launching an SEO-First Content Platform",
    excerpt:
      "How to build a publishing workflow that balances editorial velocity, search quality, and production reliability.",
    content: [
      "A production-grade corporate blog starts with contracts: data contracts, SEO contracts, and release quality contracts.",
      "The fastest path to value is an end-to-end slice: draft, publish, revalidate, and verify indexable output.",
      "Treat observability as a launch prerequisite, not a post-launch patch."
    ],
    status: "PUBLISHED",
    publishedAt: "2026-03-17T09:00:00.000Z",
    updatedAt: "2026-03-17T09:00:00.000Z",
    author: authors.maya,
    category: {
      name: "Engineering",
      slug: "engineering"
    },
    seoTitle: "SEO-First Content Platform Launch Guide",
    seoDescription:
      "A practical launch blueprint for building a secure, scalable corporate blog with strong SEO foundations."
  },
  {
    id: "p-2",
    slug: "editorial-workflows-that-scale",
    title: "Editorial Workflows That Scale",
    excerpt:
      "Designing draft and approval pipelines that keep quality high while teams move fast.",
    content: [
      "Writers should have clear guardrails and instant feedback, not hidden publishing rules.",
      "A robust CMS flow separates drafting from publishing and logs each critical action.",
      "Teams that automate quality checks ship more frequently with fewer regressions."
    ],
    status: "DRAFT",
    publishedAt: null,
    updatedAt: "2026-03-18T08:00:00.000Z",
    author: authors.maya,
    category: {
      name: "Operations",
      slug: "operations"
    }
  }
];

export function getPublishedPosts(): BlogPost[] {
  return posts
    .filter((post) => post.status === "PUBLISHED" && post.publishedAt)
    .sort((a, b) => (a.publishedAt && b.publishedAt ? b.publishedAt.localeCompare(a.publishedAt) : 0));
}

export function getPublishedPostBySlug(slug: string): BlogPost | null {
  return getPublishedPosts().find((post) => post.slug === slug) ?? null;
}
