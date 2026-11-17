"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/ejad/i18n-provider";
import { arSA } from "date-fns/locale";

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  className,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const { t, locale, format: fmt } = useI18n();
  const [open, setOpen] = React.useState(false);

  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    try {
      return parseISO(value);
    } catch {
      return undefined;
    }
  }, [value]);

  const timeString = parsedDate ? format(parsedDate, "HH:mm") : "00:00";

  function handleDaySelect(day: Date | undefined) {
    if (!day) {
      onChange("");
      return;
    }
    const [hours, minutes] = timeString.split(":").map(Number);
    const next = new Date(day);
    next.setHours(hours, minutes, 0, 0);
    onChange(next.toISOString());
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const time = e.target.value;
    if (!time) return;
    const base = parsedDate ?? new Date();
    const [hours, minutes] = time.split(":").map(Number);
    const next = new Date(base);
    next.setHours(hours, minutes, 0, 0);
    onChange(next.toISOString());
  }

  const displayValue = parsedDate
    ? locale === "en"
      ? `${format(parsedDate, "MMM d, yyyy")} at ${format(parsedDate, "HH:mm")}`
      : fmt.date(parsedDate, "dateTime")
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-start font-normal",
            !parsedDate && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="me-2 size-4 shrink-0" />
          <span className="flex-1 truncate">
            {displayValue ?? placeholder ?? t("picker.placeholder")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={parsedDate}
          onSelect={handleDaySelect}
          locale={locale === "ar" ? arSA : undefined}
          dir={locale === "ar" ? "rtl" : "ltr"}
        />
        <div className="border-t p-3 grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              {t("messages.time")}
            </Label>
            <Input
              type="time"
              value={timeString}
              onChange={handleTimeChange}
              className="h-8 text-sm"
            />
          </div>
          {parsedDate ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <X className="me-1.5 size-3.5" />
              {t("picker.clear")}
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
