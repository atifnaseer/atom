"use client";

import { TriangleAlert } from "lucide-react";
import { CopyButton } from "@/components/ejad/copy-button";
import { useI18n } from "@/components/ejad/i18n-provider";
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
  const { t } = useI18n();
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
            dir="ltr"
            className="block break-all rounded-md border bg-muted px-3 py-2 font-mono text-sm select-all"
          >
            {shown?.key}
          </code>
          <div>
            <CopyButton
              value={shown?.key ?? ""}
              label={t("devices.copySecret")}
            />
          </div>
        </div>
        {shown?.once ? (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>{t("devices.onceTitle")}</AlertTitle>
            <AlertDescription>{t("devices.onceHint")}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            {shown?.once ? t("devices.copiedSecret") : t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
