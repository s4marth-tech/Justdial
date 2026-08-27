"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquarePlus, Phone, PhoneCall } from "lucide-react";
import { createLead } from "@/lib/actions/lead";
import { leadSchema, type LeadFormValues } from "@/lib/validations/lead";
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

type LeadType = "ENQUIRY" | "CALLBACK_REQUEST" | "CALL";

// Shown after an enquiry/callback/number-reveal submission completes, so the
// visitor has somewhere to go next instead of a dead-end confirmation.
function PostSubmitActions() {
  return (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1" nativeButton={false} render={<Link href="/search" />}>
        Search more
      </Button>
      <Button className="flex-1" nativeButton={false} render={<Link href="/account" />}>
        Go to my account
      </Button>
    </div>
  );
}

function LeadForm({
  businessId,
  type,
  showMessageField,
  includeHoneypot = false,
  submitLabel,
  onSuccess,
}: {
  businessId: string;
  type: LeadType;
  showMessageField: boolean;
  includeHoneypot?: boolean;
  submitLabel: string;
  onSuccess: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { businessId, type, name: "", phone: "", message: "", honeypot: "" },
  });

  const onSubmit = (values: LeadFormValues) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createLead(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      onSuccess();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <input type="hidden" {...register("businessId")} />
      <input type="hidden" {...register("type")} />
      {includeHoneypot && (
        <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
          <label htmlFor={`${type}-company`}>Company</label>
          <input
            id={`${type}-company`}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register("honeypot")}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${type}-name`}>Your name</Label>
        <Input id={`${type}-name`} autoComplete="name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${type}-phone`}>Your phone number</Label>
        <Input id={`${type}-phone`} autoComplete="tel" {...register("phone")} />
        {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
      </div>
      {showMessageField && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="enquiry-message">Message (optional)</Label>
          <Textarea id="enquiry-message" rows={3} {...register("message")} />
        </div>
      )}
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" disabled={isPending} className="mt-1 w-full">
        {isPending ? "Please wait..." : submitLabel}
      </Button>
    </form>
  );
}

function LeadDialog({
  businessId,
  type,
  title,
  description,
  triggerLabel,
  triggerIcon,
  triggerVariant,
}: {
  businessId: string;
  type: "ENQUIRY" | "CALLBACK_REQUEST";
  title: string;
  description: string;
  triggerLabel: string;
  triggerIcon: React.ReactNode;
  triggerVariant: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSuccess(false);
      }}
    >
      <DialogTrigger render={<Button size="sm" variant={triggerVariant} />}>
        {triggerIcon}
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Thanks! The business will get in touch with you soon.
            </p>
            <PostSubmitActions />
          </div>
        ) : (
          <LeadForm
            businessId={businessId}
            type={type}
            showMessageField={type === "ENQUIRY"}
            includeHoneypot
            submitLabel="Send"
            onSuccess={() => setSuccess(true)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function LeadActions({ businessId }: { businessId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <LeadDialog
        businessId={businessId}
        type="ENQUIRY"
        title="Enquire Now"
        description="Share your details and the business will reach out to you."
        triggerLabel="Enquire Now"
        triggerIcon={<MessageSquarePlus className="size-4" />}
        triggerVariant="default"
      />
      <LeadDialog
        businessId={businessId}
        type="CALLBACK_REQUEST"
        title="Request a Callback"
        description="Leave your number and the business will call you back."
        triggerLabel="Request Callback"
        triggerIcon={<PhoneCall className="size-4" />}
        triggerVariant="outline"
      />
    </div>
  );
}

export function PhoneReveal({ businessId, phone }: { businessId: string; phone: string }) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setRevealed(false);
      }}
    >
      <DialogTrigger render={<button type="button" className="flex items-center gap-2 hover:underline" />}>
        <Phone className="size-4 text-muted-foreground" />
        Show Number
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Get the number</DialogTitle>
          <DialogDescription>
            Share your details and we&apos;ll show you the number to call.
          </DialogDescription>
        </DialogHeader>
        {revealed ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col items-center gap-1 py-2">
              <a href={`tel:${phone}`} className="text-lg font-semibold hover:underline">
                {phone}
              </a>
              <p className="text-sm text-muted-foreground">Tap the number to call.</p>
            </div>
            <PostSubmitActions />
          </div>
        ) : (
          <LeadForm
            businessId={businessId}
            type="CALL"
            showMessageField={false}
            submitLabel="Show Number"
            onSuccess={() => setRevealed(true)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
