export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = (await import("node-cron")).default;
    const { yearCloseJob } = await import("./lib/cron");

    // Every January 1st at 00:00 Europe/Berlin time
    cron.schedule("0 0 1 1 *", yearCloseJob, {
      timezone: "Europe/Berlin",
    });

    console.log("[cron] Year-close job scheduled (Jan 1 at 00:00 Europe/Berlin)");
  }
}
