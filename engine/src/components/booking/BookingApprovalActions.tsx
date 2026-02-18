"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, CreditCard } from "lucide-react";

interface BookingApprovalActionsProps {
  bookingId: string;
  currentStatus: string;
  paymentStatus: string;
  isAuthorized: boolean;
}

export default function BookingApprovalActions({
  bookingId,
  currentStatus,
  paymentStatus,
  isAuthorized,
}: BookingApprovalActionsProps) {
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: "confirm" | "reject" | "mark-paid", reason?: string) => {
    if (!isAuthorized) {
      toast.error("You are not authorized to perform this action");
      return;
    }

    setIsLoading(true);

    try {
      const body: any = { action };
      if (reason) body.reason = reason.trim();

      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${action} booking`);
      }

      toast.success(
        action === "confirm" ? "Booking approved" :
        action === "reject" ? "Booking rejected" :
        "Marked as paid"
      );

      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
      setIsRejectOpen(false);
      setIsApproveOpen(false);
      setRejectReason("");
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {currentStatus === "pending" && (
          <>
            <Button
              onClick={() => setIsApproveOpen(true)}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>

            <Button
              variant="destructive"
              onClick={() => setIsRejectOpen(true)}
              disabled={isLoading}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </>
        )}

       
      </div>

      {/* Approve Confirmation Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Approval</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this booking? This will change the status to "confirmed".
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleAction("confirm")}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              Yes, Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
            <DialogDescription>
              Please provide a reason (optional) for rejecting this booking.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="min-h-24 mb-4"
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction("reject", rejectReason)}
              disabled={isLoading}
            >
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}