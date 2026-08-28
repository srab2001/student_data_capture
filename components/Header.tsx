import Link from "next/link";
import { getCurrentStaff } from "@/lib/auth/session";
import { SignOutButton } from "@/components/SignOutButton";

export async function Header() {
  const current = await getCurrentStaff();

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          IEP Capture Pilot
        </Link>

        {current ? (
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/entry"
              className="min-h-11 flex items-center text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Entry
            </Link>
            <Link
              href="/summary"
              className="min-h-11 flex items-center text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Summary
            </Link>
            <Link
              href="/help"
              className="min-h-11 flex items-center text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Guide
            </Link>
            <span className="hidden text-xs text-zinc-500 sm:inline dark:text-zinc-500">
              {current.name} · {current.role}
            </span>
            <SignOutButton />
          </nav>
        ) : (
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/help"
              className="min-h-11 flex items-center text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Guide
            </Link>
            <Link
              href="/login"
              className="min-h-11 flex items-center rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Sign in
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
