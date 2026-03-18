import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/blog/data";
import { getCanonicalUrl } from "@/lib/blog/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: getCanonicalUrl("/"),
      changeFrequency: "daily",
      priority: 0.8
    },
    {
      url: getCanonicalUrl("/blog"),
      changeFrequency: "hourly",
      priority: 1
    }
  ];

  const posts = getPublishedPosts().map((post) => ({
    url: getCanonicalUrl(`/blog/${post.slug}`),
    lastModified: post.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7
  }));

  return [...staticRoutes, ...posts];
}
