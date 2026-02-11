import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Building2, Clock } from "lucide-react";
import dbConnect from "@/lib/db";
import Booking from "@/models/Booking";
import Facility from "@/models/Facility";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Option A: Force login for everyone (uncomment if you want strict dashboard-only access)
  // if (!session?.user) {
  //   redirect("/auth/signin");
  // }

  if (!session?.user) {
    // ───────────────────────────────────────────────
    // Public landing page (non-logged-in users)
    // ───────────────────────────────────────────────
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              National Sports Council Booking System
            </h1>
            <p className="text-xl text-muted-foreground mb-10">
              Book sports venues and facilities across Solomon Islands easily and efficiently.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="/auth/signin">Sign in to Dashboard</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/book">Make a Booking Request</a>
              </Button>
            </div>

            <div className="mt-16 grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Users className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>For Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Browse available venues and submit booking requests
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Building2 className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>For Managers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Manage your facility's bookings and availability
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Calendar className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Simple & Secure</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Real-time availability checks and approval workflow
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────
  // Authenticated user → Main Dashboard
  // ───────────────────────────────────────────────
  await dbConnect();

  // Quick stats (you can expand this later)
  const recentBookings = await Booking.find({
    // Optional: filter by manager's facility
    ...(session.user.role === "manager"
      ? { facilityId: (await Facility.findOne({ managerIds: session.user.id }))?._id }
      : {}),
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const pendingCount = await Booking.countDocuments({ status: "pending" });
  const confirmedCount = await Booking.countDocuments({ status: "confirmed" });

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {session.user.name || "Manager"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {session.user.role === "admin" ? "System Administrator" : "Facility Manager"}
          </p>
        </div>

        <div className="flex gap-3">
          <Button asChild>
            <a href="/dashboard/bookings">View All Bookings</a>
          </Button>
          {session.user.role === "admin" && (
            <Button variant="outline" asChild>
              <a href="/dashboard/facilities">Manage Facilities</a>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Bookings</CardTitle>
            <Calendar className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{confirmedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active reservations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <Badge variant="outline" className="text-base px-4 py-1">
              {session.user.role?.toUpperCase()}
            </Badge>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {session.user.role === "admin"
                ? "Full system access"
                : "Manage your assigned facilities"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Booking Activity</CardTitle>
          <CardDescription>
            Latest requests across {session.user.role === "admin" ? "all facilities" : "your facility"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No recent bookings yet.
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking: any) => (
                <div
                  key={booking._id.toString()}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">
                      {booking.purpose || "Untitled booking"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.startTime).toLocaleDateString()} •{" "}
                      {booking.status.toUpperCase()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      booking.status === "confirmed"
                        ? "default"
                        : booking.status === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}