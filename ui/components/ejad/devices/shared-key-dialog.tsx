"use client";

import { TriangleAlert } from "lucide-react";
import { CopyButton } from "@/components/ejad/copy-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ShownKey = {
  title: string;
  description: string;
  key: string;
  /** True for a freshly created key that will not be shown again. */
  once: boolean;
};

/** Shows a device secret with a copy button. */
export function SharedKeyDialog({
  shown,
  onClose,
}: {
  shown: ShownKey | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={shown !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{shown?.title}</DialogTitle>
          <DialogDescription>{shown?.description}</DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-2">
          <code
            data-testid="device-secret"
            className="block break-all rounded-md border bg-muted px-3 py-2 font-mono text-sm select-all"
          >
            {shown?.key}
          </code>
          <div>
            <CopyButton value={shown?.key ?? ""} label="Copy secret" />
          </div>
        </div>
        {shown?.once ? (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>This secret is shown only once</AlertTitle>
            <AlertDescription>
              Copy it now and store it safely. After you close this dialog it is
              not displayed again here.
            </AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            {shown?.once ? "I have copied the secret" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
