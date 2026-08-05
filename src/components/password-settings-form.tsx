"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePassword } from "@/lib/actions/account";
import { passwordSchema, type PasswordFormValues } from "@/lib/validations/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function PasswordSettingsForm({
  hasPassword,
  googleLinked,
}: {
  hasPassword: boolean;
  googleLinked: boolean;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = (values: PasswordFormValues) => {
    setServerError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updatePassword(values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      setSaved(true);
      form.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          {googleLinked && "Google is connected to this account. "}
          {hasPassword
            ? "Change your password below."
            : "You signed up with Google and don't have a password yet — set one so you can also log in with email and password."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {hasPassword && (
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{hasPassword ? "New password" : "Password"}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm {hasPassword ? "new " : ""}password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            {saved && <p className="text-sm text-muted-foreground">Password updated.</p>}
            <Button type="submit" disabled={isPending} className="mt-1 w-fit">
              {isPending ? "Saving..." : hasPassword ? "Update password" : "Set password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
