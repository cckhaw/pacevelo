import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const PASSWORD_REQUIREMENTS_HINT =
  "At least 12 characters, with an uppercase letter, a lowercase letter, a number, and a symbol.";

// The password policy - applies to both HR admins and employees, anywhere
// a NEW password is being set (signup, reset, change). Never used to
// validate a password submitted for login (checked against an existing
// bcrypt hash) - see loginPasswordSchema - since that would lock out any
// account whose password predates this policy.
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol");

// For validating a password on the way IN at login, before it's checked
// against the stored hash - deliberately not the complexity policy above.
export const loginPasswordSchema = z.string().min(1, "Enter your password");

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

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: emailSchema,
  // Combined "+<dial code> <local number>" from the contact form's country
  // dropdown + number input - digits, spaces, hyphens and parentheses only,
  // no letters.
  phone: z
    .string()
    .trim()
    .min(6, "Enter a valid phone number")
    .max(30)
    .regex(/^\+[0-9][0-9\s\-()]*$/, "Phone number can only contain numbers"),
  message: z.string().trim().min(10, "Tell us a bit more (at least 10 characters)").max(2000),
});

export const companySchema = z.object({
  name: z.string().trim().min(2, "Company name is too short").max(120),
  slackWebhookUrl: z
    .union([z.string().trim().url("Enter a valid URL").startsWith("https://hooks.slack.com/"), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
});

export const METRIC_TYPES = ["total_distance_km", "active_time_mins", "elevation_m", "total_steps"] as const;
export const ACTIVITY_TYPES = ["Run", "Ride", "Walk"] as const;
export const CHALLENGE_DATA_SOURCES = ["strava", "google_health"] as const;

export const METRIC_TYPE_LABELS: Record<(typeof METRIC_TYPES)[number], string> = {
  total_distance_km: "Total distance (km)",
  active_time_mins: "Active time (mins)",
  elevation_m: "Elevation gain (m)",
  total_steps: "Total steps",
};

/**
 * Which leaderboard metrics make sense for a given set of allowed activities:
 * - Ride mixed with Run and/or Walk -> distance/elevation aren't comparable across those activity types, so only active time works.
 * - Ride alone -> distance, active time, or elevation all make sense for cycling.
 * - Run and/or Walk without Ride -> distance or active time (elevation isn't a meaningful differentiator on foot).
 */
export function allowedMetricTypesFor(
  activities: readonly (typeof ACTIVITY_TYPES)[number][],
): (typeof METRIC_TYPES)[number][] {
  const hasRide = activities.includes("Ride");
  const hasOther = activities.includes("Run") || activities.includes("Walk");

  if (hasRide && hasOther) return ["active_time_mins"];
  if (hasRide) return ["total_distance_km", "active_time_mins", "elevation_m"];
  return ["total_distance_km", "active_time_mins"];
}

export const challengeSchema = z
  .object({
    title: z.string().trim().min(3, "Give the challenge a title").max(160),
    dataSource: z.enum(CHALLENGE_DATA_SOURCES).default("strava"),
    metricType: z.enum(METRIC_TYPES),
    allowedActivities: z.array(z.enum(ACTIVITY_TYPES)).default([]),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    targetDepartments: z.array(z.string().trim().min(1)).optional(),
    prizes: z.array(z.string().trim().min(1, "Prize description can't be empty").max(200)).max(20, "That's a lot of prizes - 20 max").optional(),
    emailDomain: emailDomainSchema,
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after the start date",
    path: ["endDate"],
  })
  .superRefine((data, ctx) => {
    if (data.dataSource === "strava") {
      if (data.allowedActivities.length === 0) {
        ctx.addIssue({ code: "custom", message: "Select at least one activity type", path: ["allowedActivities"] });
        return;
      }
      if (!allowedMetricTypesFor(data.allowedActivities).includes(data.metricType)) {
        ctx.addIssue({
          code: "custom",
          message: "That leaderboard metric isn't available for the selected activities.",
          path: ["metricType"],
        });
      }
    } else if (data.metricType !== "total_steps") {
      ctx.addIssue({
        code: "custom",
        message: "Google Health challenges are always ranked by total steps.",
        path: ["metricType"],
      });
    }
  });

export type CompanyInput = z.infer<typeof companySchema>;
export type ChallengeInput = z.infer<typeof challengeSchema>;
