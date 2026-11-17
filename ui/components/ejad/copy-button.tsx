"use client";

import { Check, Copy } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useT } from "@/components/ejad/i18n-provider";
import { Button } from "@/components/ui/button";

export function CopyButton({
  value,
  label,
  size = "sm",
  variant = "outline",
}: {
  value: string;
  label?: string;
  size?: "sm" | "icon" | "default";
  variant?: "outline" | "ghost" | "default" | "secondary";
}) {
  const t = useT();
  const text = label ?? t("common.copy");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      toast.error(t("common.copyFailed"));
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={copy}
      aria-label={text}
    >
      {copied ? <Check /> : <Copy />}
      {size === "icon" ? null : copied ? t("common.copied") : text}
    </Button>
  );
}
