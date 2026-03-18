import { prisma } from "@/lib/prisma";

/**
 * Year-close job: runs on January 1st at 00:00 (Europe/Berlin).
 * For each active user, calculates unused vacation days from the closing year
 * and adds them to vacationDaysCarryOver.
 */
export async function yearCloseJob() {
  const closingYear = new Date().getFullYear() - 1;
  const yearStart = new Date(`${closingYear}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${closingYear}-12-31T23:59:59.999Z`);

  console.log(`[cron] Starting year-close job for year ${closingYear}`);

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, vacationDaysPerYear: true, vacationDaysCarryOver: true },
  });

  for (const user of users) {
    const result = await prisma.vacationRequest.aggregate({
      where: {
        userId: user.id,
        status: "APPROVED",
        startDate: { gte: yearStart, lte: yearEnd },
      },
      _sum: { workingDaysRequested: true },
    });

    const usedThisYear = result._sum.workingDaysRequested ?? 0;
    const unusedDays = Math.max(0, user.vacationDaysPerYear - usedThisYear);

    await prisma.user.update({
      where: { id: user.id },
      data: { vacationDaysCarryOver: user.vacationDaysCarryOver + unusedDays },
    });

    console.log(
      `[cron] User ${user.id}: used=${usedThisYear}, unused=${unusedDays}, new carryOver=${user.vacationDaysCarryOver + unusedDays}`
    );
  }

  console.log(`[cron] Year-close job for ${closingYear} completed. ${users.length} users processed.`);
}
