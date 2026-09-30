import { expect, test } from "@playwright/test";

test("landing page exposes the primary journey", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Simplify coding education/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Get Started" }).first(),
  ).toBeVisible();
});

test("protected classroom route redirects anonymous users to login", async ({
  page,
}) => {
  await page.goto("/classes");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "登录" })).toBeVisible();
});

test("login form requires a role and credentials", async ({ page }) => {
  await page.goto("/login");

  const submit = page.getByRole("button", { name: "登录" });
  await expect(submit).toBeDisabled();

  await page.getByRole("button", { name: "学生" }).click();
  await page.getByLabel("邮箱").fill("student@example.com");
  await page.getByLabel("密码").fill("example-password");
  await expect(submit).toBeEnabled();
});

test("registration validates matching passwords in the browser", async ({
  page,
}) => {
  await page.goto("/register");

  await page.getByRole("button", { name: "老师" }).click();
  await page.getByLabel("姓名").fill("E2E Faculty");
  await page.getByLabel("邮箱").fill("faculty@example.com");
  await page.getByLabel("密码", { exact: true }).fill("password-one");
  await page.getByLabel("确认密码").fill("password-two");
  await page.getByRole("button", { name: "注册" }).click();

  await expect(page.getByText("两次输入的密码不一致")).toBeVisible();
});

test("liveness endpoint is available to deployment probes", async ({
  request,
}) => {
  const response = await request.get("/api/health/live");
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({ status: "alive" });
});
