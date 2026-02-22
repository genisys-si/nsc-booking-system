"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ResetPage() {
  const params = useParams();
  const token = (params as any)?.token;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: any) {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password too short');
    if (password !== confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed');
      toast.success('Password reset');
    } catch (err:any) {
      toast.error(err.message || 'Failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
      <form onSubmit={submit} className="space-y-4">
        <Input type="password" placeholder="New password" value={password} onChange={e=>setPassword((e.target as HTMLInputElement).value)} />
        <Input type="password" placeholder="Confirm password" value={confirm} onChange={e=>setConfirm((e.target as HTMLInputElement).value)} />
        <Button type="submit" disabled={loading}>{loading? 'Saving...':'Set new password'}</Button>
      </form>
    </div>
  );
}
