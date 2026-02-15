"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface BookingFiltersProps {
  venueOptions: Array<{ _id: string; name: string; facilityName: string }>;
}

export default function BookingFilters({ venueOptions }: BookingFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [venueId, setVenueId] = useState(searchParams.get("venueId") || "all");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (status && status !== "all") params.set("status", status);
    if (venueId && venueId !== "all") params.set("venueId", venueId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    router.push(`/dashboard/bookings?${params.toString()}`);
  };

  const clearFilters = () => {
    setStatus("all");
    setVenueId("all");
    setStartDate("");
    setEndDate("");
    router.push("/dashboard/bookings");
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-end flex-wrap">
      <div>
        <label className="block text-sm mb-1">Status</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-45">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm mb-1">Venue</label>
        <Select value={venueId} onValueChange={setVenueId}>
          <SelectTrigger className="w-55">
            <SelectValue placeholder="All venues" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {venueOptions.map(v => (
              <SelectItem key={v._id} value={v._id}>
                {v.name} ({v.facilityName})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm mb-1">From Date</label>
        <Input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">To Date</label>
        <Input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={applyFilters}>Apply Filters</Button>
        <Button variant="outline" onClick={clearFilters}>Clear</Button>
      </div>
    </div>
  );
}