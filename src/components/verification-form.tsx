"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitVerification } from "@/lib/actions/verification";
import {
  verificationSubmissionSchema,
  type VerificationSubmissionFormValues,
} from "@/lib/verification/submission";
import type { VerificationQuestion } from "@/lib/verification/questions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function VerificationForm({
  businessId,
  questions,
}: {
  businessId: string;
  questions: VerificationQuestion[];
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<VerificationSubmissionFormValues>({
    resolver: zodResolver(verificationSubmissionSchema),
    defaultValues: {
      businessId,
      answers: Object.fromEntries(questions.map((question) => [question.id, ""])),
    },
  });

  const onSubmit = (values: VerificationSubmissionFormValues) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitVerification(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      setSuccess(true);
    });
  };

  if (success) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <p className="font-medium">Submitted for review.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          An admin will review your answers and update your verification status soon.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {questions.map((question) => (
          <FormField
            key={question.id}
            control={form.control}
            name={`answers.${question.id}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {question.label}
                  {!question.required && (
                    <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                  )}
                </FormLabel>
                <FormControl>
                  {question.type === "textarea" ? (
                    <Textarea rows={3} placeholder={question.placeholder} {...field} />
                  ) : (
                    <Input
                      type={question.type === "number" ? "number" : "text"}
                      placeholder={question.placeholder}
                      {...field}
                    />
                  )}
                </FormControl>
                {question.description && <FormDescription>{question.description}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <Button type="submit" disabled={isPending} className="mt-2 w-full">
          {isPending ? "Submitting..." : "Submit for review"}
        </Button>
      </form>
    </Form>
  );
}
