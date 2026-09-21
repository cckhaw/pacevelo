import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export function passwordsMatch(password: FormDataEntryValue | null, confirmPassword: FormDataEntryValue | null) {
  return password === confirmPassword;
}

// Accepts "acme.com", "@acme.com", or someone pasting "https://acme.com/".
export const emailDomainSchema = z
  .union([
    z
      .string()
      .trim()
      .toLowerCase()
      .transform((v) => v.replace(/^@/, "").replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
      .refine((v) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(v), "Enter a domain like acme.com"),
    z.literal(""),
  ])
  .optional()
  .transform((v) => (v ? v : null));

export const companySchema = z.object({
  name: z.string().trim().min(2, "Company name is too short").max(120),
  slackWebhookUrl: z
    .union([z.string().trim().url("Enter a valid URL").startsWith("https://hooks.slack.com/"), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
});

export const METRIC_TYPES = ["total_distance_km", "active_time_mins", "elevation_m"] as const;
export const ACTIVITY_TYPES = ["Run", "Ride", "Walk"] as const;

export const METRIC_TYPE_LABELS: Record<(typeof METRIC_TYPES)[number], string> = {
  total_distance_km: "Total distance (km)",
  active_time_mins: "Active time (mins)",
  elevation_m: "Elevation gain (m)",
};

export const challengeSchema = z
  .object({
    title: z.string().trim().min(3, "Give the challenge a title").max(160),
    metricType: z.enum(METRIC_TYPES),
    allowedActivities: z.array(z.enum(ACTIVITY_TYPES)).min(1, "Select at least one activity type"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    targetDepartments: z.array(z.string().trim().min(1)).optional(),
    emailDomain: emailDomainSchema,
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

export type CompanyInput = z.infer<typeof companySchema>;
export type ChallengeInput = z.infer<typeof challengeSchema>;
