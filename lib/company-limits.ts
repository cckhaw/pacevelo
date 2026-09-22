import "server-only";

import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, profiles } from "@/db/schema";

/**
 * Checks whether a company can take on one more employee profile. Only
 * counts role = 'employee' rows - HR admins don't count toward this limit.
 */
export async function checkEmployeeLimit(companyId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    columns: { employeeLimit: true },
  });
  if (!company) return { ok: false, error: "Company not found." };

  const [{ value: currentCount }] = await db
    .select({ value: count() })
    .from(profiles)
    .where(and(eq(profiles.companyId, companyId), eq(profiles.role, "employee")));

  if (currentCount >= company.employeeLimit) {
    return {
      ok: false,
      error: `This company has reached its limit of ${company.employeeLimit} employees. Contact your HR admin.`,
    };
  }

  return { ok: true };
}
