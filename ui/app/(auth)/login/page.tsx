import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/ejad/language-switcher";
import { getRegistrationAvailability } from "@/lib/auth/registration";
import { BRAND_SHORT } from "@/lib/brand";
import type { Translate } from "@/lib/ejad/i18n/core";
import { getI18n } from "@/lib/ejad/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.signIn") };
}

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const registration = await getRegistrationAvailability();
  const { t } = await getI18n();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <LanguageSwitcher className="absolute end-4 top-4" />
      <div className="w-full max-w-md rounded-lg border bg-background p-6 pb-10">
        <BrandLogo className="mx-auto" />
        <h2 className="mt-5 text-center text-2xl font-bold leading-9 tracking-tight">
          {t("auth.brandName")}
        </h2>
        <p className="text-center font-semibold">{t("auth.signIn")}</p>

        <div className="mt-4">
          <LoginForm />
        </div>
        {registration.uiRegistrationEnabled && registration.configLoaded ? (
          <RegistrationPrompt
            enabled={registration.selfRegistrationEnabled}
            t={t}
          />
        ) : null}
      </div>
    </main>
  );
}

function RegistrationPrompt({
  enabled,
  t,
}: {
  enabled: boolean;
  t: Translate;
}) {
  if (!enabled) {
    return (
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.needAccess")}
      </p>
    );
  }

  return (
    <p className="mt-6 text-center text-sm text-muted-foreground">
      {t("auth.newTo", { brand: BRAND_SHORT })}{" "}
      <Link className="font-medium text-foreground underline" href="/register">
        {t("auth.createAccount")}
      </Link>
    </p>
  );
}
