import { cookies } from "next/headers";
import {
  formatters,
  LOCALE_COOKIE,
  type Locale,
  toLocale,
  translator,
} from "@/lib/ejad/i18n/core";

/** The visitor's language, from the ejad_locale cookie. */
export async function getLocale(): Promise<Locale> {
  return toLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

/** Translator and formatters for a Server Component. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: translator(locale), format: formatters(locale) };
}
