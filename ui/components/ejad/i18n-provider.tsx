"use client";

import { Direction } from "radix-ui";
import * as React from "react";
import {
  DEFAULT_LOCALE,
  direction,
  type Formatters,
  formatters,
  type Locale,
  localizeText,
  type Translate,
  translator,
} from "@/lib/ejad/i18n/core";

type I18n = {
  locale: Locale;
  t: Translate;
  format: Formatters;
  /** Translates a fixed English sentence from lib/ejad or an API route. */
  localize: (english: string) => string;
};

function makeI18n(locale: Locale): I18n {
  return {
    locale,
    t: translator(locale),
    format: formatters(locale),
    localize: (english) => localizeText(locale, english),
  };
}

const I18nContext = React.createContext<I18n>(makeI18n(DEFAULT_LOCALE));

/** Provides the page language to client components (set from the cookie). */
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => makeI18n(locale), [locale]);
  return (
    <I18nContext.Provider value={value}>
      <Direction.Provider dir={direction(locale)}>
        {children}
      </Direction.Provider>
    </I18nContext.Provider>
  );
}

/** `const { t, format, locale } = useI18n()` */
export function useI18n() {
  return React.useContext(I18nContext);
}

/** Shortcut for components that only need text. */
export function useT() {
  return React.useContext(I18nContext).t;
}

/**
 * Shows English, left-to-right content (the Atom Administration pages)
 * inside an Arabic page.
 */
export function EnglishOnly({ children }: { children: React.ReactNode }) {
  const value = React.useMemo(() => makeI18n(DEFAULT_LOCALE), []);
  return (
    <I18nContext.Provider value={value}>
      <Direction.Provider dir="ltr">
        <div dir="ltr" lang="en" className="contents">
          {children}
        </div>
      </Direction.Provider>
    </I18nContext.Provider>
  );
}
