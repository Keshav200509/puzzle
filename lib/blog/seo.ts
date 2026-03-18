import type { BlogPost } from "@/lib/blog/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
const SITE_NAME = "The Corporate Blog";

export function getCanonicalUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function getPostTitle(post: BlogPost): string {
  return post.seoTitle ?? post.title;
}

export function getPostDescription(post: BlogPost): string {
  return post.seoDescription ?? post.excerpt;
}

export function buildArticleJsonLd(post: BlogPost) {
  const canonical = getCanonicalUrl(`/blog/${post.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: getPostTitle(post),
    description: getPostDescription(post),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Person",
      name: post.author.name,
      url: getCanonicalUrl(`/blog/author/${post.author.slug}`)
    },
    mainEntityOfPage: canonical,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL
    }
  };
}

export function getSiteName(): string {
  return SITE_NAME;
}
