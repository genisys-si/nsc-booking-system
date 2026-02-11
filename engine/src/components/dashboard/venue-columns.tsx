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
import { MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";

export type VenueRow = {
  _id: string;
  facilityName: string;
  name: string;
  capacity?: number;
  isBookable: boolean;
  amenitiesCount: number;
};

export const columns: ColumnDef<VenueRow>[] = [
  {
    accessorKey: "facilityName",
    header: "Facility",
  },
  {
    accessorKey: "name",
    header: "Venue Name",
  },
  {
    accessorKey: "capacity",
    header: "Capacity",
    cell: ({ row }) => row.original.capacity ?? "-",
  },
  {
    accessorKey: "isBookable",
    header: "Bookable",
    cell: ({ row }) => {
      const isBookable = row.original.isBookable;
      return isBookable ? (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Yes
        </Badge>
      ) : (
        <Badge variant="secondary" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          No
        </Badge>
      );
    },
  },
  {
    accessorKey: "amenitiesCount",
    header: "Amenities",
    cell: ({ row }) => `${row.original.amenitiesCount}`,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const venue = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit Venue</DropdownMenuItem>
            <DropdownMenuItem>
              {venue.isBookable ? "Make Unbookable" : "Make Bookable"}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];