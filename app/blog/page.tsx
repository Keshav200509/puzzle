import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/blog/data";
import { getCanonicalUrl, getSiteName } from "@/lib/blog/seo";

export const revalidate = 900;

export const metadata: Metadata = {
  title: `Blog | ${getSiteName()}`,
  description: "Insights on engineering, SEO, and scalable digital publishing.",
  alternates: {
    canonical: getCanonicalUrl("/blog")
  }
};

export default function BlogIndexPage() {
  const posts = getPublishedPosts();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">The Corporate Blog</h1>
        <p className="text-sm text-zinc-300">
          Production-minded articles on platform engineering, SEO, and growth operations.
        </p>
      </header>

      <section className="space-y-4" aria-label="Published posts">
        {posts.map((post) => (
          <article key={post.id} className="rounded-xl border border-zinc-700 p-5">
            <p className="text-xs uppercase tracking-wide text-zinc-400">{post.category.name}</p>
            <h2 className="mt-2 text-xl font-semibold">
              <Link href={`/blog/${post.slug}`} className="hover:underline">
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-zinc-300">{post.excerpt}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
