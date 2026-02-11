"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export type BookingRow = {
  _id: string;
  facilityId: { name: string };
  venueId: string; // you can populate venue name if needed
  startTime: Date;
  endTime: Date;
  status: string;
  contactName?: string;
  contactEmail?: string;
  purpose?: string;
};

export const columns: ColumnDef<BookingRow>[] = [
  {
    accessorKey: "facilityId.name",
    header: "Facility",
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
      const variant =
        status === "confirmed" ? "default" :
        status === "pending" ? "secondary" :
        status === "rejected" ? "destructive" : "outline";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: "contactName",
    header: "Booked By",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const booking = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {/* call API to confirm */}}
              disabled={booking.status !== "pending"}
            >
              Confirm
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {/* call API to reject */}}
              disabled={booking.status !== "pending"}
              className="text-destructive"
            >
              Reject
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {/* call API to cancel */}}
            >
              Cancel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];