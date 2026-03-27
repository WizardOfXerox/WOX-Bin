import { expect, test } from "@playwright/test";

test.describe("v1.1 workspace and public browser coverage", () => {
  test("local workspace can edit, save, and anonymously publish from the browser", async ({ page }) => {
    let publishBody: Record<string, unknown> | null = null;

    await page.route("**/api/public/pastes", async (route) => {
      publishBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          paste: {
            slug: "playwright-anon-paste",
            secretMode: false
          },
          claimToken: "playwright-claim-token"
        })
      });
    });

    await page.goto("/app");
    await page.getByRole("button", { name: "New" }).click();
    await page.getByRole("textbox").first().fill("Playwright local draft");
    const editorField = page.getByRole("textbox", {
      name: /Start writing or paste code here/i
    });

    await expect(editorField).toBeVisible();

    await editorField.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("A local draft used for end-to-end workspace coverage.");
    await page.getByRole("button", { name: "Save" }).first().click();

    const showDetailsButton = page.getByRole("button", { name: "Show details sidebar" });
    if (await showDetailsButton.isVisible().catch(() => false)) {
      await showDetailsButton.click();
    }
    await page.getByRole("button", { name: "Publish anonymously" }).click();

    await expect(page.getByText("Share URL")).toBeVisible();
    await expect(page.getByText("http://127.0.0.1:3100/p/playwright-anon-paste")).toBeVisible();

    if (!publishBody) {
      throw new Error("Anonymous publish request was not captured.");
    }
    const capturedPublishBody = publishBody as unknown as {
      content?: string;
      title?: string;
    };

    expect(capturedPublishBody).toMatchObject({
      content: "A local draft used for end-to-end workspace coverage."
    });
    expect(String(capturedPublishBody.title ?? "")).toMatch(/local draft/i);
  });

  test("feed, archive, and public paste pages render a live public paste cleanly", async ({ page, request }) => {
    test.setTimeout(90_000);

    await page.goto("/feed");
    await expect(page.getByRole("heading", { name: "Fresh public pastes" })).toBeVisible();

    const feedPasteLink = page.locator('a[href^="/p/"]').first();
    await expect(feedPasteLink).toBeVisible();
    const publicPastePath = await feedPasteLink.getAttribute("href");
    expect(publicPastePath).not.toBeNull();
    const publicPasteTitle = (await feedPasteLink.innerText()).trim();

    await page.goto("/archive");
    await expect(page.getByRole("heading", { name: "Pastes archive" })).toBeVisible();
    const archivePasteLink = page.getByRole("link", { name: publicPasteTitle }).last();
    await expect(archivePasteLink).toBeVisible();
    await expect(archivePasteLink).toHaveAttribute("href", publicPastePath!);

    const publicPasteResponse = await request.get(publicPastePath!);
    expect(publicPasteResponse.ok()).toBeTruthy();

    const publicPasteHtml = await publicPasteResponse.text();
    expect(publicPasteHtml).toContain("Wrap long lines");
    expect(publicPasteHtml).toContain("Report");
    expect(publicPasteHtml).toContain("Download");
  });
});
