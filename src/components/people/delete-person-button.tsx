"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/client/api";

export function DeletePersonButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await api<{ success: true }>(`/api/people/${id}`, { method: "DELETE" });
      toast.success(`Removed ${name}`);
      router.push("/people");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't remove, try again");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="min-h-11 w-full">
          Remove {name}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {name}?</DialogTitle>
          <DialogDescription>
            Their call history goes too. You can always add them again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => setOpen(false)} disabled={busy}>
            Keep
          </Button>
          <Button variant="destructive" className="min-h-11" onClick={remove} disabled={busy}>
            {busy ? "Removing" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
