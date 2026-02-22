"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, LogOut, Users, Settings, User as UserIcon } from "lucide-react";

const navItems = [
  { href: "/dashboard/facilities", label: "My Facilities", icon: Building2 },
  { href: "/dashboard/bookings", label: "Bookings", icon: Calendar },
  { href: "/dashboard/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/dashboard/profile", label: "Profile", icon: UserIcon },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export default function Sidebar({ user }: { user: any }) {
  return (
    <div className="w-64 border-r bg-card flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold">NSC Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {user.name} • {user.role}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">


        {/* ADMIN CONTROL ONLY */}
        {navItems.map(item => {
          if (item.adminOnly && user.role !== "admin") return null;
          return (
            <Link key={item.href} href={item.href}>
              <Button variant="ghost" className="w-full justify-start">
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t mt-auto space-y-2">
        <Button variant="outline" className="w-full" asChild>
          <a href="/api/auth/signout" className="flex items-center justify-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </a>
        </Button>
      </div>
    </div>
  );
}