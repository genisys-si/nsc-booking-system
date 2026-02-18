"use client";

import { Button } from "@/components/ui/button";
import { CreditCard, MailIcon, FileIcon } from "lucide-react";
import { toast } from "sonner";

interface BookingActionsProps {
  bookingId: string;
  paymentStatus: string | null;
  isAuthorized: boolean;
}

export default function BookingActions({
  bookingId,
  paymentStatus,
  isAuthorized,
}: BookingActionsProps) {
  const handleMarkPaid = async () => {
    if (!isAuthorized) return toast.error("Not authorized");
    if (paymentStatus === "paid") return toast.info("Already paid");

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-paid" }),
      });

      if (res.ok) {
        toast.success("Marked as paid");
        window.location.reload();
      } else {
        toast.error("Failed to mark as paid");
      }
    } catch {
      toast.error("Error marking as paid");
    }
  };

  const handleSendInvoice = async () => {
    if (!isAuthorized) return toast.error("Not authorized");
    toast.success("Invoice sent! (Stub - implement email later)");
  };

  const handleSendReceipt = async () => {
    if (!isAuthorized) return toast.error("Not authorized");
    if (paymentStatus !== "paid") return toast.warning("Payment not complete");
    toast.success("Receipt sent! (Stub - implement email later)");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* <Button onClick={handleMarkPaid} disabled={paymentStatus === "paid"}>
        <CreditCard className="mr-2 h-4 w-4" />
        Mark as Paid
      </Button> */}
      <Button onClick={handleSendInvoice} variant="secondary">
        <FileIcon className="mr-2 h-4 w-4" />
        Send Invoice
      </Button>
      <Button onClick={handleSendReceipt} variant="secondary" disabled={paymentStatus !== "paid"}>
        <MailIcon className="mr-2 h-4 w-4" />
        Send Receipt
      </Button>
    </div>
  );
}