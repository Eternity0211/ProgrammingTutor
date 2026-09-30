import { ROUTES } from "@/config/route";

export function resolveSafeCallbackPath(
  value: string | null | undefined,
  origin?: string,
): string {
  if (!value) return ROUTES.CLASSES;
  if (!value.startsWith("/") && !/^https?:\/\//i.test(value)) {
    return ROUTES.CLASSES;
  }

  try {
    const baseOrigin = origin ?? "http://localhost";
    const baseUrl = new URL(baseOrigin);
    const target = new URL(value, baseUrl);
    if (target.origin !== baseUrl.origin) return ROUTES.CLASSES;
    if (!target.pathname.startsWith("/")) return ROUTES.CLASSES;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return ROUTES.CLASSES;
  }
}
