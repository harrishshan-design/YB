const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  fs.mkdirSync("artifacts", { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
    acceptDownloads: true,
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Run your NGO/ }).waitFor();
  await page.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  await page.goto("http://localhost:3000/demo");
  await page.getByRole("button", { name: /Organisation owner/ }).click();
  await page
    .getByRole("heading", { name: /Welcome back/ })
    .waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "Reset sample data" }).click();
  await page.screenshot({
    path: "artifacts/dashboard-desktop.png",
    fullPage: true,
  });
  const nav = (name) =>
    page
      .locator(".workspace-nav")
      .getByRole("button", { name, exact: true })
      .click();
  const dialog = () => page.getByRole("dialog");
  await nav("Members");
  await page.getByRole("button", { name: "Add member", exact: true }).click();
  await dialog()
    .getByLabel("Full name", { exact: true })
    .fill("QA Community Member");
  await dialog()
    .getByLabel("Email", { exact: true })
    .fill("qa.member@example.com");
  await dialog().getByRole("button", { name: "Save changes" }).click();
  await page
    .getByRole("textbox", { name: "Search members" })
    .fill("QA Community Member");
  await page
    .locator(".person-cell")
    .filter({ hasText: "QA Community Member" })
    .waitFor();
  await page.getByLabel("Import member CSV").setInputFiles({
    name: "qa-members.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "name,email\nQA Import First,qa.first@example.com\nQA Import Second,qa.second@example.com\n",
    ),
  });
  await dialog().getByRole("button", { name: "Import members" }).click();
  await dialog()
    .getByRole("status")
    .filter({ hasText: "2 members imported" })
    .waitFor();
  await dialog().getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("textbox", { name: "Search members" }).fill("QA Import");
  if (
    (await page
      .locator(".person-cell")
      .filter({ hasText: "QA Import" })
      .count()) !== 2
  )
    throw new Error("Sequential CSV rows were not all retained");
  await page.reload();
  await page.getByRole("heading", { name: "Members", exact: true }).waitFor();
  await page
    .getByRole("textbox", { name: "Search members" })
    .fill("QA Community Member");
  await page
    .locator(".person-cell")
    .filter({ hasText: "QA Community Member" })
    .waitFor();
  await page.getByLabel("Active organisation").selectOption("demo-youth-club");
  await page.getByRole("heading", { name: /Welcome back/ }).waitFor();
  await nav("Members");
  await page
    .getByRole("textbox", { name: "Search members" })
    .fill("QA Community Member");
  await page.getByRole("heading", { name: "No members found" }).waitFor();
  await page.getByLabel("Active organisation").selectOption("demo-hh-charity");
  await page.getByRole("heading", { name: /Welcome back/ }).waitFor();
  await nav("Programmes");
  await page
    .getByRole("button", { name: "Create programme", exact: true })
    .click();
  await dialog()
    .getByLabel("Programme name", { exact: true })
    .fill("QA Community Programme");
  await dialog()
    .getByLabel("Description", { exact: true })
    .fill("A community programme for testing the complete workflow.");
  await dialog()
    .getByLabel("Objective", { exact: true })
    .fill("Support families and record volunteer contributions.");
  await dialog().getByLabel("Location", { exact: true }).fill("Shah Alam");
  const start = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
  const end = new Date(Date.now() + 86400000 + 4 * 3600000)
    .toISOString()
    .slice(0, 16);
  await dialog().getByLabel("Start date and time").fill(start);
  await dialog().getByLabel("End date and time").fill(end);
  await dialog().getByRole("button", { name: "Save changes" }).click();
  await page
    .getByRole("heading", { name: "QA Community Programme", exact: true })
    .waitFor();
  await nav("Attendance");
  await page
    .getByLabel("Select programme for attendance")
    .selectOption({ label: "QA Community Programme" });
  const attendeeSelect = page.locator(".inline-form select");
  const attendeeOption = attendeeSelect
    .locator("option")
    .filter({ hasText: "QA Community Member" });
  await attendeeOption.waitFor({ state: "attached" });
  const attendee = await attendeeOption.getAttribute("value");
  await attendeeSelect.selectOption(attendee);
  await page.getByRole("button", { name: "Check in member" }).click();
  await page
    .getByRole("cell", { name: "QA Community Member", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Check in member" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "already checked in" })
    .waitFor();
  await page.getByRole("button", { name: "Dismiss error" }).click();
  await page.getByRole("button", { name: "Programme QR" }).click();
  await dialog()
    .getByRole("img", { name: "Scan to open programme check-in" })
    .waitFor();
  await dialog().getByRole("button", { name: "Close dialog" }).click();
  await nav("Volunteers");
  await page.getByRole("button", { name: "Log volunteer hours" }).click();
  await dialog()
    .getByLabel("Volunteer", { exact: true })
    .selectOption({ label: "QA Community Member" });
  await dialog()
    .getByLabel("Programme", { exact: true })
    .selectOption({ label: "QA Community Programme" });
  await dialog().getByLabel("Hours contributed").fill("4");
  await dialog()
    .getByLabel("Contribution", { exact: true })
    .fill("Food basket distribution");
  await dialog().getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("cell", { name: "Food basket distribution" }).waitFor();
  await nav("Programmes");
  await page
    .getByRole("button", { name: "QA Community Programme", exact: true })
    .click();
  await dialog()
    .locator("input[type=file]")
    .setInputFiles("public/images/food-aid.jpg");
  await page.getByRole("status").filter({ hasText: "File saved" }).waitFor();
  await nav("Reports & impact");
  await page
    .getByLabel("Programme", { exact: true })
    .selectOption({ label: "QA Community Programme" });
  await page
    .getByLabel("Outcomes", { exact: true })
    .fill("Distributed food baskets and recorded four volunteer hours.");
  await page
    .getByLabel("Prepared by", { exact: true })
    .fill("QA Programme Manager");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  await (await downloaded).saveAs("artifacts/qa-programme-report.pdf");
  await page.screenshot({
    path: "artifacts/report-desktop.png",
    fullPage: true,
  });
  await nav("Plans & billing");
  await page
    .getByRole("button", { name: "Choose Network", exact: true })
    .click();
  await nav("Organisation settings");
  await page.getByRole("button", { name: "Add branch", exact: true }).click();
  await dialog().getByLabel("Branch name").fill("QA Selangor Branch");
  await dialog()
    .getByRole("button", { name: "Create branch", exact: true })
    .click();
  await page
    .getByRole("cell", { name: "QA Selangor Branch", exact: true })
    .waitFor();
  await page
    .getByLabel("Active organisation")
    .selectOption({ label: "QA Selangor Branch" });
  await page.getByRole("heading", { name: /Welcome back/ }).waitFor();
  await nav("Members");
  await page
    .getByRole("textbox", { name: "Search members" })
    .fill("QA Community Member");
  await page.getByRole("heading", { name: "No members found" }).waitFor();
  await page.getByLabel("Active organisation").selectOption("demo-hh-charity");
  await page.getByRole("heading", { name: /Welcome back/ }).waitFor();
  await page.goto("http://localhost:3000/pricing");
  await page.getByRole("button", { name: /Yearly/ }).click();
  await page.getByText("390", { exact: false }).first().waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/");
  await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });
  let overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  if (overflow) throw new Error("Public home overflows on mobile");
  await page.goto("http://localhost:3000/demo");
  await page.getByRole("button", { name: /^Member / }).click();
  await page.getByRole("heading", { name: /Welcome back/ }).waitFor();
  if (
    await page
      .locator(".workspace-nav")
      .getByRole("button", { name: "Plans & billing" })
      .count()
  )
    throw new Error("Member can see billing navigation");
  await page.screenshot({
    path: "artifacts/member-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await nav("My card");
  await page.getByRole("img", { name: "Verify this membership" }).waitFor();
  await page.screenshot({
    path: "artifacts/member-card-mobile.png",
    fullPage: true,
  });
  overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  if (overflow) throw new Error("Member card overflows on mobile");
  const verification = await page
    .getByRole("link", { name: "Verify membership", exact: true })
    .getAttribute("href");
  await page.goto(verification);
  await page
    .getByText("Sample membership verification", { exact: true })
    .waitFor();
  await page.getByText("Membership no.", { exact: true }).waitFor();
  if (await page.locator("main").getByText(/@/).count())
    throw new Error("Public verification exposed private email data");
  for (const [role, label] of [
    ["COMMITTEE", "Committee member"],
    ["PROGRAMME_MANAGER", "Programme manager"],
    ["ADMIN", "Organisation admin"],
    ["PLATFORM_ADMIN", "YBNGO platform admin"],
  ]) {
    await page.goto("http://localhost:3000/demo");
    await page
      .getByRole("button", { name: new RegExp("^" + label + " ") })
      .click();
    await page.getByRole("heading", { name: /Welcome back/ }).waitFor();
    if (
      role === "COMMITTEE" &&
      (await page
        .locator(".workspace-nav")
        .getByRole("button", { name: "Plans & billing" })
        .count())
    )
      throw new Error("Committee can see owner billing");
  }
  const response = await page.request.get(
    "http://localhost:3000/api/workspace?organisationId=foreign-club",
  );
  if (response.status() !== 401)
    throw new Error("Unauthenticated workspace request was not denied");
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    JSON.stringify({
      stage: "complete",
      checks: [
        "public pages",
        "six demo roles",
        "member creation",
        "multi-row CSV import",
        "reload persistence",
        "club isolation",
        "Network branch creation and isolation",
        "programme creation",
        "attendance uniqueness",
        "QR generation",
        "public membership verification",
        "volunteer hours",
        "programme photo upload",
        "PDF export",
        "annual pricing",
        "mobile layouts",
        "API authentication",
      ],
      errors,
    }),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
