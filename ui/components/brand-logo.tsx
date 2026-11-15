import Image from "next/image";
import {
  BRAND_ICON,
  BRAND_ICON_LIGHT,
  BRAND_LOGO,
  BRAND_LOGO_LIGHT,
  BRAND_NAME,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

const VARIANTS = {
  full: {
    light: BRAND_LOGO_LIGHT,
    dark: BRAND_LOGO,
    width: 418,
    height: 97,
    size: "h-12 w-auto",
  },
  icon: {
    light: BRAND_ICON_LIGHT,
    dark: BRAND_ICON,
    width: 64,
    height: 64,
    size: "size-8",
  },
} as const;

/**
 * Brand logo that swaps to the dark-wordmark variant on light backgrounds.
 * `variant="icon"` renders the square mark only.
 */
export function BrandLogo({
  variant = "full",
  className,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const v = VARIANTS[variant];
  const alt = `${BRAND_NAME} logo`;
  return (
    <>
      <Image
        src={v.light}
        alt={alt}
        width={v.width}
        height={v.height}
        priority
        className={cn(v.size, "dark:hidden", className)}
      />
      <Image
        src={v.dark}
        alt={alt}
        width={v.width}
        height={v.height}
        priority
        className={cn(v.size, "hidden dark:block", className)}
      />
    </>
  );
}
