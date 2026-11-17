"use client";

import { useT } from "@/components/ejad/i18n-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CONNECTION_TYPES, type ConnectionType } from "@/lib/ejad/connections";
import type { MessageKey } from "@/lib/ejad/i18n/messages";

const LABELS: Record<ConnectionType, { title: MessageKey; hint: MessageKey }> =
  {
    publish: { title: "connections.publish", hint: "connections.publishHint" },
    subscribe: {
      title: "connections.subscribe",
      hint: "connections.subscribeHint",
    },
  };

/** The Publish / Subscribe checkboxes. */
export function ConnectionTypePicker({
  value,
  onChange,
  available = CONNECTION_TYPES,
  idPrefix,
  disabled,
}: {
  value: ConnectionType[];
  onChange: (value: ConnectionType[]) => void;
  available?: readonly ConnectionType[];
  idPrefix: string;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-1 gap-3">
      {available.map((type) => {
        const id = `${idPrefix}-${type}`;
        return (
          <div key={type} className="flex items-start gap-3">
            <Checkbox
              id={id}
              checked={value.includes(type)}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? CONNECTION_TYPES.filter(
                        (t) => t === type || value.includes(t),
                      )
                    : value.filter((t) => t !== type),
                )
              }
            />
            <div className="grid gap-0.5 leading-none">
              <Label htmlFor={id}>{t(LABELS[type].title)}</Label>
              <p className="text-xs text-muted-foreground">
                {t(LABELS[type].hint)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
