"use client";

import { useState, useTransition } from "react";
import { updateNotificationPreferences } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export function NotificationSettingsForm({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateNotificationPreferences({
        emailNotificationsEnabled: enabled,
      });
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      setSaved(true);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choose when we email you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="mt-0.5 size-4 rounded border-input"
            />
            <span>
              <span className="font-medium">Email me about new enquiries</span>
              <br />
              <span className="text-muted-foreground">
                Get an email whenever a customer enquires, requests a callback, or views your
                phone number.
              </span>
            </span>
          </label>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          {saved && <p className="text-sm text-muted-foreground">Saved.</p>}
          <Button type="submit" disabled={isPending} className="mt-1 w-fit">
            {isPending ? "Saving..." : "Save preference"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
