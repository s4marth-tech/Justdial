"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users } from "lucide-react";
import { createBroadcastLead } from "@/lib/actions/lead";
import { broadcastLeadSchema, type BroadcastLeadFormValues } from "@/lib/validations/lead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function BroadcastLeadDialog({
  category,
  categoryLabel,
  city,
}: {
  category: string;
  categoryLabel: string;
  city: string;
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [matchedCount, setMatchedCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultValues: BroadcastLeadFormValues = {
    category,
    city,
    name: "",
    phone: "",
    message: "",
    honeypot: "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BroadcastLeadFormValues>({
    resolver: zodResolver(broadcastLeadSchema),
    defaultValues,
  });

  const onSubmit = (values: BroadcastLeadFormValues) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createBroadcastLead(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      setMatchedCount(result.matchedCount ?? 0);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setMatchedCount(null);
          setServerError(null);
          reset(defaultValues);
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Users className="size-4" />
        Get quotes from multiple businesses
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Get quotes from multiple businesses</DialogTitle>
          <DialogDescription>
            One enquiry, sent to several {categoryLabel} businesses in {city} at once — they compete to
            respond.
          </DialogDescription>
        </DialogHeader>
        {matchedCount !== null ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {matchedCount > 0
                ? `Sent to ${matchedCount} business${matchedCount === 1 ? "" : "es"}. They'll reach out to you directly.`
                : "Thanks! We've got your request."}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" nativeButton={false} render={<Link href="/search" />}>
                Search more
              </Button>
              <Button className="flex-1" nativeButton={false} render={<Link href="/account" />}>
                Go to my account
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <input type="hidden" {...register("category")} />
            <input type="hidden" {...register("city")} />
            <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
              <label htmlFor="broadcast-company">Company</label>
              <input
                id="broadcast-company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                {...register("honeypot")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="broadcast-name">Your name</Label>
              <Input id="broadcast-name" autoComplete="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="broadcast-phone">Your phone number</Label>
              <Input id="broadcast-phone" autoComplete="tel" {...register("phone")} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="broadcast-message">What do you need? (optional)</Label>
              <Textarea id="broadcast-message" rows={3} {...register("message")} />
            </div>
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <Button type="submit" disabled={isPending} className="mt-1 w-full">
              {isPending ? "Sending..." : "Send to multiple businesses"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
