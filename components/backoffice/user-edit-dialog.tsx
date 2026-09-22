"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/submit-button";
import { updateUserDetails, type UpdateUserDetailsState } from "@/app/backoffice/companies/[id]/users/actions";

const initialState: UpdateUserDetailsState = {};

export function UserEditDialog({
  companyId,
  user,
}: {
  companyId: string;
  user: { id: string; fullName: string; email: string; department: string | null };
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(updateUserDetails.bind(null, user.id, companyId), initialState);

  // Closes the dialog once the action succeeds, tracked during render (per
  // React's "adjusting state when a prop changes" pattern) instead of an
  // effect, so there's no extra render/flash before the dialog dismisses.
  // Compares the whole state object (not just .success) since useActionState
  // returns a fresh object on every completion, including repeat successes.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user details</DialogTitle>
          <DialogDescription>Changes take effect immediately.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Name</Label>
            <Input id="fullName" name="fullName" defaultValue={user.fullName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={user.email} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input id="department" name="department" defaultValue={user.department ?? ""} />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <DialogFooter>
            <SubmitButton>Save changes</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
