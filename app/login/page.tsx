import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthConfig } from "@/lib/session";
import ThemeToggle from "../theme-toggle";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in · Prospect Agent",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // No credentials configured means the app is open — nothing to sign in to.
  if (!getAuthConfig()) {
    redirect("/");
  }
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <div className="flex justify-end px-4 pt-4 sm:px-6 sm:pt-6">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm animate-fade-slide-in">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtle">
            research <span className="text-accent">→</span> signal <span className="text-accent">→</span> opener
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">Prospect Agent</h1>
          <p className="mt-2 font-mono text-[12px] text-subtle">
            <span className="text-accent">›</span> sign in to continue
            <span className="animate-blink">_</span>
          </p>
          <LoginForm failed={error === "1"} />
        </div>
      </div>
    </main>
  );
}
