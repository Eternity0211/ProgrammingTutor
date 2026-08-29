import { UserClassroom } from "@/lib/types/class-types";
import { NavGroupInterface } from "@/lib/types/config-types";
import { getRandomEducationIcon } from "@/lib/utils";
import { getUserClasses } from "@/server/actions/class-actions";

export const getNavigationConfig = async (): Promise<{
  navGroups: NavGroupInterface[];
}> => {
  try {
    if (process.env.NODE_ENV === "development") {
      return {
        navGroups: [],
      };
    }
    const response = await getUserClasses();
    const classes: UserClassroom[] = response.classes || [];
    const iconMap: Record<string, string> = {};
    classes.forEach((classroom) => {
      iconMap[classroom.code] = getRandomEducationIcon();
    });
    return {
      navGroups: classes.map((classroom) => ({
        title: classroom.name,
        url: `/classes/${classroom.code}`,
        icon: iconMap[classroom.code] || "UserAccountIcon",
        isActive: false,
      })),
    };
  } catch (error) {
    console.error("Error fetching navigation config:", error);
    return {
      navGroups: [
        {
          title: "Home",
          url: "/",
          icon: "UserAccountIcon",
          isActive: true,
        },
      ],
    };
  }
};
