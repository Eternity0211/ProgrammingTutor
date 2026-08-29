import * as z from "zod";

const CONSTRAINTS = {
  NAME: { MAX: 50 },
  EMAIL: { MAX: 255, MIN: 3 },
  PASSWORD: { MIN: 8, MAX: 100 },
  OTP: { LENGTH: 4 },
} as const;

const baseStringSchema = (field: string) =>
  z.string().min(1, `${field} is required`).trim();

export const nameSchema = (field: string) =>
  baseStringSchema(field).max(
    CONSTRAINTS.NAME.MAX,
    `${field} must be at most ${CONSTRAINTS.NAME.MAX} characters`,
  );

export const emailSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .min(
      CONSTRAINTS.EMAIL.MIN,
      `Email must be at least ${CONSTRAINTS.EMAIL.MIN} characters`,
    )
    .max(
      CONSTRAINTS.EMAIL.MAX,
      `Email must be at most ${CONSTRAINTS.EMAIL.MAX} characters`,
    )
    .trim(),
});

export const accountUpdateSchema = z.object({
  firstName: nameSchema("First name").optional(),
  lastName: nameSchema("Last name").optional(),
  displayName: nameSchema("Display name").optional(),
  primaryEmail: emailSchema.shape.email.optional(),
  profileImageURL: z.string().optional(),
});

// export const deleteAccountSchema = z.object({
//   password: passwordSchema.or(z.string().length(0)).optional(),
// });

export type EmailSchema = z.infer<typeof emailSchema>;
export type AccountUpdateSchema = z.infer<typeof accountUpdateSchema>;
// export type DeleteAccountSchema = z.infer<typeof deleteAccountSchema>;
