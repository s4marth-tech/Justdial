"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export function DeleteAccountSection({ businessCount }: { businessCount: number }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onDelete = () => {
    if (!window.confirm("Delete your account? This can't be undone.")) return;
    setServerError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      if (result?.error) {
        setServerError(result.error);
      }
    });
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>
          {businessCount > 0
            ? `You own ${businessCount} business${businessCount === 1 ? "" : "es"}. Delete or transfer ${
                businessCount === 1 ? "it" : "them"
              } before deleting your account.`
            : "Deleting your account is permanent and can't be undone."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {serverError && <p className="mb-3 text-sm text-destructive">{serverError}</p>}
        <Button
          type="button"
          variant="destructive"
          disabled={isPending || businessCount > 0}
          onClick={onDelete}
        >
          {isPending ? "Deleting..." : "Delete account"}
        </Button>
      </CardContent>
    </Card>
  );
}
