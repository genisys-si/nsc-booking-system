"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CreditCard, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface BookingPaymentActionsProps {
  bookingId: string;
  paymentStatus: string;
  totalPrice: number;
  totalPaid: number;
  remainingBalance: number;
  payments: Array<{
    amount: number;
    method: string;
    date: string;
    notes?: string;
    recordedBy: string;
  }>;
  isAuthorized: boolean;
}

export default function BookingPaymentActions({
  bookingId,
  paymentStatus,
  totalPrice,
  totalPaid,
  remainingBalance,
  payments,
  isAuthorized,
}: BookingPaymentActionsProps) {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRecordPayment = async () => {
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) return toast.error("Invalid amount");
    if (amt > remainingBalance) return toast.error("Amount exceeds remaining balance");

    setIsLoading(true);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record-payment",
          amount: amt,
          method,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      toast.success("Payment recorded");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setIsLoading(false);
      setIsPaymentOpen(false);
      setAmount("");
      setNotes("");
    }
  };

  return (
    <>
      <div className="space-y-6">


        {/* Record Payment Button */}
        {isAuthorized && paymentStatus !== "paid" && remainingBalance > 0 && (
          <Button onClick={() => setIsPaymentOpen(true)} className="w-full">
            <DollarSign className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Remaining balance: SBD {remainingBalance.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (SBD)</label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 1000"
                min="0.01"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes (optional)</label>
              <Textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Paid in cash at office"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={isLoading}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}