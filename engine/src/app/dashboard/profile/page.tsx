"use client";

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ (async ()=>{
    const res = await fetch('/api/users/me');
    if (res.ok) { const j = await res.json(); setUser(j.user); }
    setLoading(false);
  })(); },[]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Unauthorized</div>;

  return (
    <div className="max-w-md mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>
      <div className="space-y-3">
        <div>
          <label className="block text-sm">Name</label>
          <Input defaultValue={user.name} id="name" />
        </div>
        <div>
          <label className="block text-sm">Email</label>
          <Input defaultValue={user.email} id="email" readOnly />
        </div>
        <div>
          <label className="block text-sm">Phone</label>
          <Input defaultValue={user.phone||''} id="phone" />
        </div>
        <div>
          <label className="block text-sm">New Password</label>
          <Input type="password" id="password" />
        </div>
        <div className="flex gap-2">
          <Button onClick={async ()=>{
            const name = (document.getElementById('name') as HTMLInputElement).value;
            const phone = (document.getElementById('phone') as HTMLInputElement).value;
            const password = (document.getElementById('password') as HTMLInputElement).value;
            const payload: any = { name, phone };
            if (password) payload.password = password;
            const res = await fetch('/api/users/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) { toast.success('Saved'); } else { toast.error('Failed'); }
          }}>Save Profile</Button>
        </div>
      </div>
    </div>
  );
}
