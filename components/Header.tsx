import Link from "next/link";
import { getCurrentStaff } from "@/lib/auth/session";
import { SignOutButton } from "@/components/SignOutButton";
import { ClassroomColorGuide } from "@/components/ClassroomColorGuide";
import { SidebarNav } from "@/components/SidebarNav";
import { canOpenAdmin } from "@/lib/auth/authz";

export async function Header() {
  const current = await getCurrentStaff();

  const links = current
    ? [
        ...(current.canRecordData ? [{ href: "/entry", label: "Entry" }] : []),
        ...(current.canViewReports ? [{ href: "/summary", label: "Summary" }] : []),
        ...(canOpenAdmin(current) ? [{ href: "/admin", label: "Admin" }] : []),
        { href: "/help", label: "Guide" },
      ]
    : [{ href: "/help", label: "Guide" }];

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-brand">
        IEP Capture Pilot
      </Link>

      <SidebarNav links={links} />

      <div className="sidebar-footer">
        {current ? (
          <>
            <ClassroomColorGuide />
            <span className="text-xs" style={{ color: "rgba(255, 255, 255, 0.75)" }}>
              {current.name} · {current.role}
            </span>
            <SignOutButton />
          </>
        ) : (
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
        )}
      </div>
    </aside>
  );
}
