// Arabic/English support for the Ejad pages, the app shell and sign-in.
//
// The language lives in the `ejad_locale` cookie (no URL prefix, so routes
// are unchanged). Every string is in ./messages.ts with both languages side
// by side; TypeScript rejects an entry that is missing either one.

import { type MessageKey, messages } from "@/lib/ejad/i18n/messages";

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "ejad_locale";

/**
 * Intl locale per language. Arabic uses Saudi conventions (Arabic-Indic
 * digits) with the Gregorian calendar, so dates match the stored timestamps.
 * Use "ar-SA-u-ca-gregory-nu-latn" instead for Western digits.
 */
export const INTL_LOCALE: Record<Locale, string> = {
  en: "en-GB",
  ar: "ar-SA-u-ca-gregory",
};

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ar";
}

export function toLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function direction(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export type Vars = Record<string, string | number | null | undefined>;
export type Translate = (key: MessageKey, vars?: Vars) => string;

/** Text for one key. `{name}` is replaced from vars; a `count` var picks the plural form. */
export function translate(locale: Locale, key: MessageKey, vars?: Vars) {
  const entry: unknown = messages[key][locale];
  let text: string;
  if (typeof entry === "string") {
    text = entry;
  } else {
    const forms = entry as Partial<Record<Intl.LDMLPluralRule, string>> & {
      other: string;
    };
    const count = Number(vars?.count ?? 0);
    const rule = new Intl.PluralRules(INTL_LOCALE[locale]).select(count);
    text = forms[rule] ?? forms.other;
  }
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!(name in vars)) return match;
    const value = vars[name];
    if (value === null || value === undefined) return "";
    return typeof value === "number" ? formatNumber(locale, value) : value;
  });
}

let englishIndex: Map<string, MessageKey> | undefined;

/**
 * Translates a fixed English sentence produced outside the UI (an /api/ejad
 * route, a validator in lib/ejad) when messages.ts has an entry whose
 * English text is exactly that sentence. Anything else is returned as is.
 */
export function localizeText(locale: Locale, english: string) {
  if (locale === "en" || !english) return english;
  if (!englishIndex) {
    englishIndex = new Map();
    for (const [key, entry] of Object.entries(messages)) {
      if (typeof entry.en === "string" && !entry.en.includes("{")) {
        englishIndex.set(entry.en, key as MessageKey);
      }
    }
  }
  const key = englishIndex.get(english);
  return key ? translate(locale, key) : english;
}

export function translator(locale: Locale): Translate {
  return (key, vars) => translate(locale, key, vars);
}

export function formatNumber(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(INTL_LOCALE[locale], options).format(value);
}

type DateInput = Date | string | number;
const toDate = (value: DateInput) =>
  value instanceof Date ? value : new Date(value);

const DATE_STYLES = {
  /** 3 Feb 2026 */
  date: { day: "numeric", month: "short", year: "numeric" },
  /** 3 Feb 2026, 14:05 */
  dateTime: {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  },
  /** 3 Feb 2026, 14:05:09 */
  dateTimeSeconds: {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  },
  /** 3 Feb 2026, 14:05:09.123 */
  precise: {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hourCycle: "h23",
  },
  /** 3 Feb */
  dayMonth: { day: "numeric", month: "short" },
  /** 14:05 */
  time: { hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
  /** 14:05:09 */
  timeSeconds: {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateStyle = keyof typeof DATE_STYLES;

export function formatDate(
  locale: Locale,
  value: DateInput,
  style: DateStyle = "date",
) {
  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
    DATE_STYLES[style],
  ).format(toDate(value));
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

/** "5 minutes ago" / "منذ ٥ دقائق". */
export function formatRelative(
  locale: Locale,
  value: DateInput,
  now: number = Date.now(),
) {
  const seconds = Math.round((toDate(value).getTime() - now) / 1000);
  const format = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], {
    numeric: "auto",
  });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === "second") {
      return format.format(Math.trunc(seconds / size), unit);
    }
  }
  return format.format(0, "second");
}

export type Formatters = {
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  date: (value: DateInput, style?: DateStyle) => string;
  relative: (value: DateInput) => string;
};

export function formatters(locale: Locale): Formatters {
  return {
    number: (value, options) => formatNumber(locale, value, options),
    date: (value, style) => formatDate(locale, value, style),
    relative: (value) => formatRelative(locale, value),
  };
}

/**
 * The language of the current page, for code that runs outside React
 * (toasts, error mapping). Server code passes the locale explicitly.
 */
export function pageLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  return toLocale(document.documentElement.lang);
}
