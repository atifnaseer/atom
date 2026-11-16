"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CONNECTION_TYPES, type ConnectionType } from "@/lib/ejad/connections";

const LABELS: Record<ConnectionType, { title: string; hint: string }> = {
  publish: { title: "Publish", hint: "The device can send messages." },
  subscribe: { title: "Subscribe", hint: "The device can receive messages." },
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
  return (
    <div className="grid gap-3">
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
              <Label htmlFor={id}>{LABELS[type].title}</Label>
              <p className="text-xs text-muted-foreground">
                {LABELS[type].hint}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
