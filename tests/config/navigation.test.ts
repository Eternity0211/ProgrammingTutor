import { getNavigationConfig } from "@/config/navigation";
import { getUserClasses } from "@/server/actions/class-actions";

jest.mock("@/server/actions/class-actions", () => ({
  getUserClasses: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  getRandomEducationIcon: jest.fn(() => "BookOpenIcon"),
}));

const mockedGetUserClasses = jest.mocked(getUserClasses);

describe("navigation configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads classes in the test/development environment", async () => {
    mockedGetUserClasses.mockResolvedValue({
      status: "success",
      role: "STUDENT",
      classes: [
        {
          id: "class-1",
          name: "C++ Fundamentals",
          section: "A",
          code: "CPP101",
          inviteLink: "https://example.test/classes?join=CPP101",
          facultyName: "Teacher",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    });

    await expect(getNavigationConfig()).resolves.toEqual({
      status: "ready",
      navGroups: [
        {
          title: "C++ Fundamentals",
          url: "/classes/CPP101",
          icon: "BookOpenIcon",
          isActive: false,
        },
      ],
    });
    expect(mockedGetUserClasses).toHaveBeenCalledTimes(1);
  });

  it("returns an explicit unavailable state instead of a fake home item", async () => {
    mockedGetUserClasses.mockResolvedValue({ status: "failed" });

    await expect(getNavigationConfig()).resolves.toEqual({
      status: "unavailable",
      navGroups: [],
    });
  });

  it("degrades safely when loading classes throws", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockedGetUserClasses.mockRejectedValue(new Error("database unavailable"));

    await expect(getNavigationConfig()).resolves.toEqual({
      status: "unavailable",
      navGroups: [],
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
