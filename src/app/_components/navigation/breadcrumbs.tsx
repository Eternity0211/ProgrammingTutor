"use client";

import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/app/_components/ui/breadcrumb";
import { generateBreadcrumbs } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

interface BreadcrumbItem {
  href: string;
  label: string;
  isLast: boolean;
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  useEffect(() => {
    const fetchBreadcrumbs = async () => {
      const items = await generateBreadcrumbs(pathname);
      setBreadcrumbs(items);
    };

    fetchBreadcrumbs();
  }, [pathname]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb) => (
          <Fragment key={breadcrumb.href}>
            <li className="hidden md:inline-flex items-center">
              {breadcrumb.isLast ? (
                <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={breadcrumb.href}>
                  {breadcrumb.label}
                </BreadcrumbLink>
              )}
            </li>
            {!breadcrumb.isLast && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
