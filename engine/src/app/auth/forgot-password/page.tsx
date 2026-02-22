"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: any) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('If an account exists, a reset link was sent');
      setEmail('');
    } catch (err: any) {
      toast.error('Request failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold mb-4">Forgot Password</h1>
      <form onSubmit={submit} className="space-y-4">
        <Input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
        <Button type="submit" disabled={loading}>{loading? 'Sending...':'Send reset link'}</Button>
      </form>
    </div>
  );
}
