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
  invoiceId?: string;
  createdAt: string;
};

export const columns: ColumnDef<BookingRow>[] = [
  {
    accessorKey: "invoiceId",
    header: "Invoice ID",
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