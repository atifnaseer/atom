import { describe, expect, it } from "vitest";
import {
  direction,
  formatDate,
  formatNumber,
  formatRelative,
  localizeText,
  toLocale,
  translate,
} from "@/lib/ejad/i18n/core";
import { messages } from "@/lib/ejad/i18n/messages";

describe("translate", () => {
  it("returns each language", () => {
    expect(translate("en", "nav.devices")).toBe("Devices");
    expect(translate("ar", "nav.devices")).toBe("الأجهزة");
  });

  it("fills in variables, with Arabic digits for numbers in Arabic", () => {
    expect(translate("en", "common.pageOf", { page: 2, pages: 10 })).toBe(
      "Page 2 of 10",
    );
    expect(translate("ar", "common.pageOf", { page: 2, pages: 10 })).toBe(
      "الصفحة ٢ من ١٠",
    );
  });

  it("picks Arabic plural forms", () => {
    const n = (count: number) =>
      translate("ar", "common.rowsSelected", { count });
    expect(n(1)).toBe("عنصر واحد محدد");
    expect(n(2)).toBe("عنصران محددان");
    expect(n(3)).toBe("٣ عناصر محددة");
    expect(n(11)).toBe("١١ عنصرًا محددًا");
    expect(n(100)).toBe("١٠٠ عنصر محدد");
    expect(translate("en", "common.rowsSelected", { count: 1 })).toBe(
      "1 selected",
    );
  });

  it("has no empty or half-translated entries", () => {
    for (const [key, entry] of Object.entries(messages)) {
      for (const text of [entry.en, entry.ar]) {
        const forms = typeof text === "string" ? [text] : Object.values(text);
        for (const form of forms) expect(form.trim(), key).not.toBe("");
      }
      // Variables must match between languages.
      const vars = (value: unknown) =>
        [...JSON.stringify(value).matchAll(/\{(\w+)\}/g)]
          .map((m) => m[1])
          .filter((v, i, all) => all.indexOf(v) === i)
          .sort();
      expect(vars(entry.ar), key).toEqual(vars(entry.en));
    }
  });
});

describe("localizeText", () => {
  it("translates exact server sentences only", () => {
    expect(localizeText("ar", "Pick a role.")).toBe("اختر دورًا.");
    expect(localizeText("ar", "Something else.")).toBe("Something else.");
    expect(localizeText("en", "Pick a role.")).toBe("Pick a role.");
  });
});

describe("formatting", () => {
  const date = new Date(Date.UTC(2026, 1, 3, 14, 5, 9));

  it("uses Arabic digits and the Gregorian calendar in Arabic", () => {
    expect(formatNumber("ar", 1234)).toBe("١٬٢٣٤");
    expect(formatNumber("en", 1234)).toBe("1,234");
    const ar = formatDate("ar", date, "date");
    expect(ar).toContain("٢٠٢٦");
    expect(ar).toContain("فبراير");
    expect(formatDate("en", date, "date")).toBe("3 Feb 2026");
  });

  it("formats relative times", () => {
    const now = date.getTime() + 5 * 60_000;
    expect(formatRelative("en", date, now)).toBe("5 minutes ago");
    expect(formatRelative("ar", date, now)).toContain("٥");
  });

  it("knows direction and falls back to English", () => {
    expect(direction("ar")).toBe("rtl");
    expect(direction("en")).toBe("ltr");
    expect(toLocale("fr")).toBe("en");
  });
});
