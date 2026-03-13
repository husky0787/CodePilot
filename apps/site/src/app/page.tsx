import type { Metadata } from "next";
import { CloudLauncher } from "@/components/cloud/CloudLauncher";

export const metadata: Metadata = {
  title: "CodePilot Cloud — Claude Code in Your Browser",
  description:
    "Get a complete Claude Code development environment in your browser. No installation required.",
};

export default function CloudEntryPage() {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground min-h-screen">
        <main className="flex min-h-screen flex-col items-center">
          {/* Hero */}
          <section className="flex w-full max-w-2xl flex-col items-center gap-6 px-4 pt-20 pb-12 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              CodePilot Cloud
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Get a complete Claude Code development environment in your
              browser&nbsp;&mdash; no installation required.
            </p>
          </section>

          {/* Cloud Launch Area */}
          <section className="flex w-full max-w-2xl flex-col items-center gap-6 px-4 pb-16">
            <CloudLauncher />
          </section>

          {/* Features */}
          <section className="w-full border-t border-border bg-muted/30 py-16">
            <div className="mx-auto max-w-2xl px-4">
              <h2 className="mb-8 text-center text-xl font-semibold">
                Why CodePilot Cloud?
              </h2>
              <ul className="grid gap-6 sm:grid-cols-2">
                <FeatureItem
                  title="Zero Setup"
                  description="No local installation, no dependency headaches. Just paste your API key and start coding."
                />
                <FeatureItem
                  title="Full Environment"
                  description="A complete Linux sandbox with Claude Code pre-installed, ready for real development."
                />
                <FeatureItem
                  title="Secure by Design"
                  description="Your API key is sent directly to the sandbox and never stored on our servers."
                />
                <FeatureItem
                  title="Instant Resume"
                  description="Come back and pick up right where you left off with automatic session restore."
                />
              </ul>
            </div>
          </section>

          {/* Footer */}
          <footer className="w-full border-t border-border py-8 text-center text-sm text-muted-foreground">
            <a href="/en" className="hover:text-foreground underline underline-offset-2">
              Documentation
            </a>
          </footer>
        </main>
      </body>
    </html>
  );
}

function FeatureItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <li className="space-y-1">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </li>
  );
}
