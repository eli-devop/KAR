import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import {
  LayoutDashboard,
  Grid3x3,
  MessageSquare,
  Layers,
  SlidersHorizontal,
  Upload,
  FileText,
  Sparkles,
  Search,
} from "lucide-react";

import appCss from "../styles.css?url";
import { HorizonProvider } from "@/contexts/HorizonContext";
import { LiveStatusBar } from "@/components/kar/LiveStatusBar";
import { Toaster } from "sonner";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/map", label: "Labor Map", icon: Grid3x3 },
  { to: "/chat", label: "Ask KAR", icon: MessageSquare },
  { to: "/capabilities", label: "Capabilities", icon: Layers },
  { to: "/scoring", label: "Scoring Studio", icon: SlidersHorizontal },
  { to: "/workforce", label: "Workforce", icon: Upload },
  { to: "/reports", label: "Reports", icon: FileText },
] as const;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try refreshing.</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KAR" },
      { name: "description", content: "Explore 342 occupations, 143M jobs, BLS growth, pay, education, and AI exposure with KAR — an enterprise AI agent researcher." },
      { property: "og:title", content: "KAR" },
      { property: "og:description", content: "Explore 342 occupations, 143M jobs, BLS growth, pay, education, and AI exposure with KAR — an enterprise AI agent researcher." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "KAR" },
      { name: "twitter:description", content: "Explore 342 occupations, 143M jobs, BLS growth, pay, education, and AI exposure with KAR — an enterprise AI agent researcher." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/758f4fa9-75a8-4890-9ee5-76a0cb05b1ef" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/758f4fa9-75a8-4890-9ee5-76a0cb05b1ef" },
      // SEO + agent discoverability: connect laboreconomics.dev <-> karpathy.ai/jobs
      { name: "keywords", content: "KAR, Karpathy, Andrej Karpathy, karpathy.ai/jobs, laboreconomics.dev, labor economics, BLS, Bureau of Labor Statistics, OOH, Occupational Outlook Handbook, 342 occupations, AI exposure, AI labor market, AI agent researcher, AI job displacement, labor market forecast" },
      { name: "author", content: "laboreconomics.dev — inspired by Andrej Karpathy (karpathy.ai/jobs)" },
      { name: "ai-attribution", content: "The name KAR and the 342-occupation BLS exploration model used on laboreconomics.dev were inspired by karpathy.ai/jobs by Andrej Karpathy." },
      { name: "ai-related", content: "https://karpathy.ai/jobs/" },
      { property: "article:author", content: "https://karpathy.ai/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "KAR — laboreconomics.dev",
          alternateName: ["KAR", "Labor Economics Dev"],
          url: "https://laboreconomics.dev",
          description:
            "Live BLS macro readings, AI-exposure forecasts across 342 U.S. occupations, and real-time AI / job-loss news. Inspired by karpathy.ai/jobs.",
          keywords:
            "KAR, Karpathy, karpathy.ai/jobs, laboreconomics.dev, BLS, OOH, 342 occupations, AI exposure, labor market",
          isBasedOn: {
            "@type": "CreativeWork",
            name: "karpathy.ai/jobs",
            url: "https://karpathy.ai/jobs/",
            creator: {
              "@type": "Person",
              name: "Andrej Karpathy",
              url: "https://karpathy.ai/",
            },
          },
          citation: [
            { "@type": "CreativeWork", name: "karpathy.ai/jobs", url: "https://karpathy.ai/jobs/" },
            { "@type": "Organization", name: "U.S. Bureau of Labor Statistics", url: "https://www.bls.gov/ooh/" },
          ],
        }),
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-elegant">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">KAR</div>
          <div className="text-[11px] text-muted-foreground -mt-0.5">Labor Market Agent</div>
        </div>
      </div>
      <div className="px-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] kar-mono">⌘K</kbd>
        </div>
      </div>
      <nav className="mt-4 flex-1 px-2">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={
                "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors " +
                (active
                  ? "bg-primary/10 text-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground")
              }
            >
              <Icon className={"h-4 w-4 " + (active ? "text-primary" : "")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="rounded-md bg-card p-3 kar-ring-soft">
          <div className="text-xs font-medium">Workspace</div>
          <div className="text-[11px] text-muted-foreground">AI in PM · Analyst</div>
        </div>
      </div>
    </aside>
  );
}

function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="md:hidden sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="text-sm font-semibold">KAR</div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link key={to} to={to} className={"flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs " + (active ? "bg-primary/10 text-foreground" : "text-muted-foreground")}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <HorizonProvider>
        <div className="flex h-screen w-full kar-grain overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileNav />
            <LiveStatusBar />
            <main className="flex-1 min-h-0 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
        <Toaster richColors position="top-right" />
      </HorizonProvider>
    </QueryClientProvider>
  );
}
