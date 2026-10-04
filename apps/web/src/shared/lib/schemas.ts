import { z } from "zod";
import {
  DEFAULT_EMAIL_WHITELIST,
  EMAIL_WHITELIST_ERROR_MESSAGE,
  isEmailDomainAllowed,
} from "./email-whitelist";
import { PASSWORD_MIN_LENGTH, validatePassword } from "./password";
import { PHONE_INVALID_USER_MESSAGE, validatePhone } from "./phone";
import { nameSchema } from "./validators";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Некорректный email")
  .refine((v) => isEmailDomainAllowed(v, DEFAULT_EMAIL_WHITELIST), {
    message: EMAIL_WHITELIST_ERROR_MESSAGE,
  });

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Минимум ${PASSWORD_MIN_LENGTH} символов`)
  .refine((v) => validatePassword(v).ok, {
    message: "Только английские символы, буквы и цифры",
  });

export const phoneSchema = z.string().transform((raw, ctx) => {
  const result = validatePhone(raw);
  if (!result.ok || !result.e164) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: PHONE_INVALID_USER_MESSAGE,
    });
    return z.NEVER;
  }
  return result.e164;
});

export const emailCodeSchema = z
  .string()
  .regex(/^\d{6}$/, "Код должен состоять из 6 цифр");

export const registerEmailRequestSchema = z.object({
  email: emailSchema,
  captchaToken: z.string().min(1).optional(),
});
export type RegisterEmailRequest = z.infer<typeof registerEmailRequestSchema>;

export const verifyEmailCodeSchema = z.object({
  email: emailSchema,
  code: emailCodeSchema,
});
export type VerifyEmailCode = z.infer<typeof verifyEmailCodeSchema>;

export const completeEmailRegistrationSchema = z.object({
  email: emailSchema,
  code: emailCodeSchema,
  password: passwordSchema,
  phone: phoneSchema,
  firstName: nameSchema,
  lastName: nameSchema,
});

export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  avatarUrl: z
    .string()
    .url("Некорректный URL аватара")
    .max(500)
    .or(z.literal(""))
    .optional(),
});
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type CompleteEmailRegistration = z.infer<
  typeof completeEmailRegistrationSchema
>;

export const loginWithEmailSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  captchaToken: z.string().min(1).optional(),
});
export type LoginWithEmail = z.infer<typeof loginWithEmailSchema>;

// 1.5.2 Восстановление пароля
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
  captchaToken: z.string().min(1).optional(),
});
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetVerifySchema = z.object({
  email: emailSchema,
  code: emailCodeSchema,
});
export type PasswordResetVerify = z.infer<typeof passwordResetVerifySchema>;

export const passwordResetCompleteSchema = z.object({
  email: emailSchema,
  code: emailCodeSchema,
  newPassword: passwordSchema,
});
export type PasswordResetComplete = z.infer<typeof passwordResetCompleteSchema>;
