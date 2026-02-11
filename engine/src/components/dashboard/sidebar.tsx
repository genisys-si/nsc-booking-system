"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";       
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, ListChecks, Building2, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard/bookings", label: "Bookings", icon: ListChecks },
  { href: "/dashboard/venues", label: "Venues", icon: Calendar },
  { href: "/dashboard/facilities", label: "Facilities (Admin)", icon: Building2, adminOnly: true },
];

export default function Sidebar({ user }: { user: any }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <Card className="w-64 border-r rounded-none h-full flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold">NSC Booking Admin</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {user.name} • {user.role}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
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

      <div className="p-4 border-t">
        <Button variant="outline" className="w-full" asChild>
          <a href="/api/auth/signout">Sign Out</a>
        </Button>
      </div>
    </Card>
  );
}