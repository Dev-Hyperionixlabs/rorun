import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { readFile } from "fs/promises";
import { join } from "path";
import { notFound } from "next/navigation";

const HELP_ARTICLES_DIR = join(process.cwd(), "content", "help");

interface HelpArticle {
  slug: string;
  title: string;
  content: string;
}

async function getArticle(slug: string): Promise<HelpArticle | null> {
  try {
    const filePath = join(HELP_ARTICLES_DIR, `${slug}.md`);
    const content = await readFile(filePath, "utf-8");
    
    // Extract title from first line (assumes format: # Title)
    const lines = content.split("\n");
    const title = lines[0].replace(/^#\s+/, "") || slug;
    
    return {
      slug,
      title,
      content,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await getArticle(params.slug);
  if (!article) {
    return {
      title: "Article Not Found – Rorun Help",
    };
  }
  return {
    title: `${article.title} – Rorun Help`,
    description: `Learn about ${article.title.toLowerCase()} in Rorun.`,
  };
}

function HelpContent({ content }: { content: string }) {
  // Simple markdown rendering without external dependencies
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let inList = false;

  lines.forEach((line, idx) => {
    if (line.startsWith("# ")) {
      if (inList) {
        elements.push(
          <ul key={`list-${idx}`} className="list-disc list-inside space-y-1 ml-4 mb-4">
            {currentList.map((item, i) => (
              <li key={i} className="text-sm text-slate-600">{item}</li>
            ))}
          </ul>
        );
        currentList = [];
        inList = false;
      }
      elements.push(
        <h2 key={idx} className="text-xl font-semibold text-slate-900 mt-6 mb-3">
          {line.replace(/^#+\s+/, "")}
        </h2>
      );
    } else if (line.startsWith("## ")) {
      if (inList) {
        elements.push(
          <ul key={`list-${idx}`} className="list-disc list-inside space-y-1 ml-4 mb-4">
            {currentList.map((item, i) => (
              <li key={i} className="text-sm text-slate-600">{item}</li>
            ))}
          </ul>
        );
        currentList = [];
        inList = false;
      }
      elements.push(
        <h3 key={idx} className="text-lg font-semibold text-slate-900 mt-4 mb-2">
          {line.replace(/^#+\s+/, "")}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      inList = true;
      currentList.push(line.replace(/^[-*]\s+/, ""));
    } else if (line.trim() === "") {
      if (inList && currentList.length > 0) {
        elements.push(
          <ul key={`list-${idx}`} className="list-disc list-inside space-y-1 ml-4 mb-4">
            {currentList.map((item, i) => (
              <li key={i} className="text-sm text-slate-600">{item}</li>
            ))}
          </ul>
        );
        currentList = [];
        inList = false;
      }
    } else if (line.trim()) {
      if (inList) {
        elements.push(
          <ul key={`list-${idx}`} className="list-disc list-inside space-y-1 ml-4 mb-4">
            {currentList.map((item, i) => (
              <li key={i} className="text-sm text-slate-600">{item}</li>
            ))}
          </ul>
        );
        currentList = [];
        inList = false;
      }
      // Simple link detection
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      while ((match = linkRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index));
        }
        parts.push(
          <a key={match.index} href={match[2]} className="text-brand hover:text-brand-dark">
            {match[1]}
          </a>
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
      }
      elements.push(
        <p key={idx} className="text-sm text-slate-600 mb-4">
          {parts.length > 0 ? parts : line}
        </p>
      );
    }
  });

  if (inList && currentList.length > 0) {
    elements.push(
      <ul key="list-final" className="list-disc list-inside space-y-1 ml-4 mb-4">
        {currentList.map((item, i) => (
          <li key={i} className="text-sm text-slate-600">{item}</li>
        ))}
      </ul>
    );
  }

  return <div>{elements}</div>;
}

export default async function HelpArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticle(params.slug);
  
  if (!article) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Rorun"
              width={80}
              height={28}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-slate-600 hover:text-slate-900">
              Home
            </Link>
            <Link href="/pricing" className="text-slate-600 hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/help" className="text-slate-600 hover:text-slate-900">
              Help
            </Link>
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6">
        <Link
          href="/help"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Help Center
        </Link>

        <article className="prose prose-slate max-w-none">
          <h1 className="text-3xl font-semibold text-slate-900 mb-6">{article.title}</h1>
          <div className="prose prose-slate prose-sm max-w-none">
            <HelpContent content={article.content} />
          </div>
        </article>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <Card className="bg-slate-50">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Was this helpful?</h2>
              <p className="text-sm text-slate-600 mb-4">
                If you still need help, <a href="mailto:support@rorun.ng" className="text-brand">contact support</a>.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 border-t border-slate-200 mt-12">
        <div className="text-center text-sm text-slate-600">
          <p>© {new Date().getFullYear()} Rorun. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

