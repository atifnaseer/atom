"use client";

import { CircleAlert, SearchX } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { EmptyState } from "@/components/ejad/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { errorCode, errorText, friendlyError } from "@/lib/ejad/errors";

/** An inline, plain-language error with an optional retry. */
export function ErrorAlert({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: unknown;
  onRetry?: () => void;
}) {
  const { message, detail, requestId } = friendlyError(error);
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>
          {message}
          {detail ? ` ${detail}` : ""}
        </p>
        {requestId ? (
          <p className="text-xs opacity-80">
            Reference for support:{" "}
            <code className="font-mono">{requestId}</code>
          </p>
        ) : null}
        {onRetry ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRetry}
          >
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

/** Shows a failed action as a toast, e.g. toastError(err, "Could not delete"). */
export function toastError(error: unknown, title?: string) {
  const text = errorText(error);
  if (title) toast.error(title, { description: text });
  else toast.error(text);
}

/**
 * Why a detail page has nothing to show: the object is gone (or in another
 * workspace), with a way back, or a plain-language load error.
 */
export function LoadProblem({
  what,
  error,
  notFound = false,
  back,
  onRetry,
}: {
  /** "device", "channel", ... */
  what: string;
  error: unknown;
  /** Known to be missing even without an error (e.g. wrong workspace). */
  notFound?: boolean;
  back: { href: string; label: string };
  onRetry?: () => void;
}) {
  if (notFound || errorCode(error) === "NOT_FOUND") {
    return (
      <Card>
        <EmptyState
          icon={SearchX}
          title={`This ${what} was not found`}
          description={`It may have been deleted, or it belongs to another workspace. Check the workspace selected in the sidebar.`}
          action={
            <Button asChild variant="outline">
              <Link href={back.href}>{back.label}</Link>
            </Button>
          }
        />
      </Card>
    );
  }
  return (
    <ErrorAlert
      title={`Could not load this ${what}`}
      error={error}
      onRetry={onRetry}
    />
  );
}
