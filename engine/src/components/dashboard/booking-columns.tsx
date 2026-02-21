"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import Link from "next/link";

export type BookingRow = {
  _id: string;
  userId: { name: string; email: string } | null;
  facilityId: { name: string } | null;
  venueName: { name: string } | null;
  startTime: string;
  endTime: string;
  status: string;
  purpose?: string;
  attendees?: number;
  contactName?: string;
  contactEmail?: string;
  notes?: string;
  amenities?: string[];
  basePrice?: number;
  amenitySurcharge?: number;
  totalPrice?: number;
  bookingRef?: string;
  createdAt: string;
  statusHistory?: {
    status: string;
    changedBy: string;
    changedAt: string;
    reason?: string;
  }[];
  paymentStatus?: string;          
  paymentMethod?: string;
  paidAmount?: number;
  paymentDate?: string;
};

export const columns: ColumnDef<BookingRow>[] = [
  {
    accessorKey: "bookingRef",
    header: "Booking Ref",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/bookings/${row.original._id}`}
        className="text-primary hover:underline"
      >
        {row.original.bookingRef || "—"}
      </Link>
    ),
  },
  {
    accessorKey: "facilityId.name",
    header: "Facility",
    cell: ({ row }) => row.original.facilityId?.name || "—",
  },
  {
    accessorKey: "venueName",
    header: "Venue",
    cell: ({ row }) => row.original.venueName || "—",
  },
  {
    accessorKey: "startTime",
    header: "Start",
    cell: ({ row }) => new Date(row.original.startTime).toLocaleString(),
  },
  {
    accessorKey: "endTime",
    header: "End",
    cell: ({ row }) => new Date(row.original.endTime).toLocaleString(),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      let variant: "default" | "secondary" | "destructive" | "outline" = "default";
      if (status === "pending") variant = "secondary";
      if (status === "confirmed") variant = "default";
      if (status === "cancelled" || status === "rejected") variant = "destructive";

      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: "contactName",
    header: "Contact",
    cell: ({ row }) => row.original.contactName || "—",
  },
  {
    accessorKey: "totalPrice",
    header: "Total (SBD)",
    cell: ({ row }) => row.original.totalPrice?.toFixed(2) || "—",
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment",
    cell: ({ row }) => {
      const status = row.original.paymentStatus || "pending";
      const variant = status === "paid" ? "default" : "secondary";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const booking = row.original;

      const handleAction = async (action: "confirm" | "reject" | "cancel") => {
        if (!confirm(`Are you sure you want to ${action} this booking?`)) return;

        try {
          const res = await fetch(`/api/bookings/${booking._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed");
          }

          toast.success(`Booking ${action}ed`);
          window.location.reload(); // simple refresh for now
        } catch (err: any) {
          toast.error(err.message || `Failed to ${action} booking`);
        }
      };

      const viewHistory = () => {
        if (!booking.statusHistory || booking.statusHistory.length === 0) {
          toast.info("No status history available");
          return;
        }

        const historyText = booking.statusHistory
          .map(h => `${new Date(h.changedAt).toLocaleString()} - ${h.status.toUpperCase()} by ${h.changedBy}${h.reason ? ` (${h.reason})` : ""}`)
          .join("\n");

        alert(`Status History:\n\n${historyText}`);
      };

      const markAsPaid = async (bookingId: string) => {
        const amount = prompt("Enter paid amount (SBD):", booking.totalPrice?.toString() || "");
        if (!amount) return;

        const method = prompt("Payment method (cash / bank_transfer / other):", "cash") || "cash";

        try {
          const res = await fetch(`/api/bookings/${bookingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "mark-paid",
              paidAmount: parseFloat(amount),
              paymentMethod: method,
            }),
          });

          if (res.ok) {
            toast.success("Payment marked as paid");
            window.location.reload();
          } else {
            toast.error("Failed to update payment");
          }
        } catch (err) {
          toast.error("Error");
        }
      };



      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => markAsPaid(booking._id)}
              disabled={booking.paymentStatus === "paid"}
            >
              Mark as Paid
            </DropdownMenuItem>

            <DropdownMenuItem onClick={viewHistory}>
              <Eye className="mr-2 h-4 w-4" />
              View History
            </DropdownMenuItem>


            {booking.status === "pending" && (
              <>
                <DropdownMenuItem onClick={() => handleAction("confirm")}>
                  Confirm
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction("reject")}>
                  Reject
                </DropdownMenuItem>
              </>
            )}
            {booking.status !== "cancelled" && booking.status !== "rejected" && (
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10"
                onClick={() => handleAction("cancel")}
              >
                Cancel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];