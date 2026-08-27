"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClaim } from "@/lib/actions/claim";
import { claimSchema, type ClaimFormValues } from "@/lib/validations/claim";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ClaimBusinessDialog({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: { businessId, note: "" },
  });

  const onSubmit = (values: ClaimFormValues) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createClaim(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Claim this business
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Claim {businessName}</DialogTitle>
          <DialogDescription>
            An admin will review your request before this listing is transferred to your
            account — there&apos;s no automatic approval.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <input type="hidden" {...register("businessId")} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="claim-note">Why is this your business? (optional)</Label>
            <Textarea
              id="claim-note"
              rows={3}
              placeholder="e.g. I'm the owner / manager, here's how you can verify it's me..."
              {...register("note")}
            />
            {errors.note && <p className="text-sm text-destructive">{errors.note.message}</p>}
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <Button type="submit" disabled={isPending} className="mt-1 w-full">
            {isPending ? "Submitting..." : "Submit claim"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
