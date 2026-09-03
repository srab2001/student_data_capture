import Link from "next/link";
import { getCurrentStaff } from "@/lib/auth/session";
import { SignOutButton } from "@/components/SignOutButton";
import { ClassroomColorGuide } from "@/components/ClassroomColorGuide";
import { canOpenAdmin } from "@/lib/auth/authz";

export async function Header() {
  const current = await getCurrentStaff();

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">
        IEP Capture Pilot
      </Link>

      {current ? (
        <div className="ml-auto flex items-center gap-4">
          {current.canRecordData && <Link href="/entry">Entry</Link>}
          {current.canViewReports && <Link href="/summary">Summary</Link>}
          {canOpenAdmin(current) && <Link href="/admin">Admin</Link>}
          <ClassroomColorGuide />
          <Link href="/help">Guide</Link>
          <span className="text-muted hidden text-xs sm:inline">
            {current.name} · {current.role}
          </span>
          <SignOutButton />
        </div>
      ) : (
        <div className="ml-auto flex items-center gap-4">
          <Link href="/help">Guide</Link>
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
        </div>
      )}
    </nav>
  );
}
