export const CLASS_TABS = ["assignments", "people", "settings"] as const;

export type ClassTab = (typeof CLASS_TABS)[number];

export function resolveClassTab(value: string | null | undefined): ClassTab {
  return CLASS_TABS.includes(value as ClassTab)
    ? (value as ClassTab)
    : "assignments";
}

export function buildClassTabHref(
  pathname: string,
  currentSearch: string,
  tab: ClassTab,
): string {
  const params = new URLSearchParams(currentSearch);
  params.set("tab", tab);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
