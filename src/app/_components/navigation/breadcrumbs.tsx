"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/app/_components/ui/breadcrumb";
import { buildBreadcrumbs } from "@/lib/breadcrumbs";
import { getBreadcrumbLabels } from "@/server/actions/breadcrumb-actions";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const [resolved, setResolved] = useState<{
    pathname: string;
    labels: Record<string, string>;
  }>({ pathname: "", labels: {} });

  useEffect(() => {
    let cancelled = false;
    getBreadcrumbLabels(pathname)
      .then((labels) => {
        if (!cancelled) setResolved({ pathname, labels });
      })
      .catch(() => {
        if (!cancelled) setResolved({ pathname, labels: {} });
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const breadcrumbs = useMemo(
    () =>
      buildBreadcrumbs(
        pathname,
        resolved.pathname === pathname ? resolved.labels : {},
      ),
    [pathname, resolved],
  );

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb) => (
          <Fragment key={breadcrumb.href}>
            <BreadcrumbItem className="hidden md:inline-flex">
              {breadcrumb.isLast ? (
                <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!breadcrumb.isLast && (
              <BreadcrumbSeparator className="hidden md:list-item" />
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
