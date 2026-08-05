"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { upsertReview } from "@/lib/actions/review";
import { reviewSchema, type ReviewFormValues } from "@/lib/validations/review";
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

export function ReviewForm({
  businessId,
  existingReview,
}: {
  businessId: string;
  existingReview: { rating: number; comment: string | null } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    handleSubmit,
    setValue,
    watch,
    register,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      businessId,
      rating: existingReview?.rating ?? 0,
      comment: existingReview?.comment ?? "",
    },
  });

  const rating = watch("rating");

  const onSubmit = (values: ReviewFormValues) => {
    setServerError(null);
    startTransition(async () => {
      const result = await upsertReview(values);
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
        {existingReview ? "Edit Your Review" : "Write a Review"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingReview ? "Edit your review" : "Write a review"}</DialogTitle>
          <DialogDescription>Share your experience with this business.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <input type="hidden" {...register("businessId")} />
          <div className="flex flex-col gap-1.5">
            <Label>Your rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  onClick={() => setValue("rating", value, { shouldValidate: true })}
                >
                  <Star
                    className={cn(
                      "size-6",
                      value <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>
            {errors.rating && <p className="text-sm text-destructive">{errors.rating.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-comment">Comment (optional)</Label>
            <Textarea id="review-comment" rows={3} {...register("comment")} />
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <Button type="submit" disabled={isPending} className="mt-1 w-full">
            {isPending ? "Saving..." : "Submit Review"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
