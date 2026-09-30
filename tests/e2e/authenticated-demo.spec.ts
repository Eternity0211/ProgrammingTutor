import { expect, test } from "@playwright/test";

const enabled = process.env.RUN_AUTHENTICATED_E2E === "1";
const password = process.env.DEMO_PASSWORD || "GradeitDemo!2026";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/classes$/);
}

test.describe("seeded authenticated journeys", () => {
  test.skip(
    !enabled,
    "Set RUN_AUTHENTICATED_E2E=1 after seeding the demo data",
  );

  test("faculty can open a seeded class and preserve tab URLs", async ({
    page,
  }) => {
    await login(page, "lin.faculty@gradeit.local");
    await page.getByText("C++ Fundamentals", { exact: true }).first().click();
    await expect(page).toHaveURL(/\/classes\/DEMOCPP$/);
    await page.getByRole("tab", { name: "People" }).click();
    await expect(page).toHaveURL(/\/classes\/DEMOCPP\?tab=people$/);
    await expect(page.getByText("Anna Liu", { exact: true })).toBeVisible();
  });

  test("student sees enrolled classes and can open their profile", async ({
    page,
  }) => {
    await login(page, "anna.student@gradeit.local");
    await expect(
      page.getByText("C++ Fundamentals", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Data Structures", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("link", { name: "个人中心" }).click();
    await expect(page).toHaveURL(/\/profile$/);
  });
});
