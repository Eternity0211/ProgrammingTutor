"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/_components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/app/_components/ui/sidebar";
import { getIconComponent } from "@/config/icons";
import { isNavigationPathActive } from "@/lib/navigation";
import { ArrowRight01Icon } from "hugeicons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavMain({
  items,
  label,
}: {
  items: {
    title: string;
    url: string;
    icon?: string;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
  label?: string;
}) {
  const pathname = usePathname();

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="text-xs font-bold text-sidebar-primary-foreground">
          {label || "Overview"}
        </SidebarGroupLabel>
        <SidebarMenu className="text-sidebar-primary-foreground">
          {items.map((item) => {
            const IconComponent = getIconComponent(
              item.icon || "UserAccountIcon",
            );
            return item.items?.length ? (
              <Collapsible
                key={item.title}
                defaultOpen
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={
                        isNavigationPathActive(pathname, item.url) ||
                        item.items.some((subItem) =>
                          isNavigationPathActive(pathname, subItem.url),
                        )
                      }
                    >
                      {item.icon && <IconComponent size={20} />}
                      <span className="ml-1 text-sm font-medium">
                        {item.title}
                      </span>
                      <ArrowRight01Icon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuButton
                            asChild
                            tooltip={subItem.title}
                            isActive={isNavigationPathActive(
                              pathname,
                              subItem.url,
                            )}
                          >
                            <Link href={subItem.url}>
                              <span className="text-sm font-medium">
                                {subItem.title}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isNavigationPathActive(pathname, item.url)}
                  tooltip={item.title}
                >
                  <Link href={item.url}>
                    {item.icon && <IconComponent size={20} />}
                    <span className="ml-1 text-sm font-medium">
                      {item.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
