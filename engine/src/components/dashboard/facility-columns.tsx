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

export type FacilityRow = {
  _id: string;
  name: string;
  location: string;
  venues: Array<{ name: string; isBookable: boolean }>;
  managerIds: string[];
};

export const columns: ColumnDef<FacilityRow>[] = [
  {
    accessorKey: "name",
    header: "Facility Name",
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "venues",
    header: "Venues",
    cell: ({ row }) => {
      const count = row.original.venues.length;
      const bookable = row.original.venues.filter(v => v.isBookable).length;
      return `${count} total (${bookable} bookable)`;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const facility = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Edit Facility</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];