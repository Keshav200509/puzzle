import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPostBySlug, getPublishedPosts } from "@/lib/blog/data";
import {
  buildArticleJsonLd,
  getCanonicalUrl,
  getPostDescription,
  getPostTitle,
  getSiteName
} from "@/lib/blog/seo";

export const revalidate = 900;

type BlogPostPageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return getPublishedPosts().map((post) => ({
    slug: post.slug
  }));
}

export function generateMetadata({ params }: BlogPostPageProps): Metadata {
  const post = getPublishedPostBySlug(params.slug);

  if (!post) {
    return {
      title: `Not Found | ${getSiteName()}`
    };
  }

  const title = getPostTitle(post);
  const description = getPostDescription(post);
  const canonical = getCanonicalUrl(`/blog/${post.slug}`);

  return {
    title,
    description,
    alternates: {
      canonical
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getPublishedPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const articleJsonLd = buildArticleJsonLd(post);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <article className="space-y-5">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">{post.category.name}</p>
          <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
          <p className="text-sm text-zinc-300">{post.excerpt}</p>
        </header>

        <div className="space-y-4 text-zinc-200">
          {post.content.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd)
        }}
      />
    </main>
  );
}
