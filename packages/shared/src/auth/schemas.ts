import { z } from "zod";
import {
  DEFAULT_EMAIL_WHITELIST,
  EMAIL_WHITELIST_ERROR_MESSAGE,
  isEmailDomainAllowed,
} from "./email-whitelist";
import { PASSWORD_MIN_LENGTH, validatePassword } from "./password";
import {
  PHONE_INVALID_USER_MESSAGE,
  validatePhone,
} from "../phone/validation";
import { nameSchema } from "../common/validators";

/** email с проверкой по whitelist (формат + домен) */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Некорректный email")
  .refine((v) => isEmailDomainAllowed(v, DEFAULT_EMAIL_WHITELIST), {
    message: EMAIL_WHITELIST_ERROR_MESSAGE,
  });

/** пароль по требованиям 1.2.3 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Минимум ${PASSWORD_MIN_LENGTH} символов`)
  .refine((v) => validatePassword(v).ok, {
    message: "Только английские символы, буквы и цифры",
  });

/** телефон в E.164, прошедший анти-фрод (1.4) */
export const phoneSchema = z
  .string()
  .transform((raw, ctx) => {
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

/** 6-значный цифровой код из письма (1.2.2) */
export const emailCodeSchema = z
  .string()
  .regex(/^\d{6}$/, "Код должен состоять из 6 цифр");

// ——— DTO для регистрации по email ———

/** Шаг 1: пользователь вводит email → шлём код */
export const registerEmailRequestSchema = z.object({
  email: emailSchema,
  captchaToken: z.string().min(1).optional(),
});
export type RegisterEmailRequest = z.infer<typeof registerEmailRequestSchema>;

/** Шаг 2: пользователь вводит код подтверждения */
export const verifyEmailCodeSchema = z.object({
  email: emailSchema,
  code: emailCodeSchema,
});
export type VerifyEmailCode = z.infer<typeof verifyEmailCodeSchema>;

/** Шаг 3: пользователь задаёт пароль + телефон → регистрация завершена */
export const completeEmailRegistrationSchema = z.object({
  email: emailSchema,
  code: emailCodeSchema,
  password: passwordSchema,
  phone: phoneSchema,
  firstName: nameSchema,
  lastName: nameSchema,
});
export type CompleteEmailRegistration = z.infer<
  typeof completeEmailRegistrationSchema
>;

export const registerPhoneRequestCodeSchema = z.object({
  phone: phoneSchema,
});
export type RegisterPhoneRequestCode = z.infer<
  typeof registerPhoneRequestCodeSchema
>;

export const registerWithPhoneSchema = z.object({
  phone: phoneSchema,
  code: emailCodeSchema,
  password: passwordSchema,
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
});
export type RegisterWithPhone = z.infer<typeof registerWithPhoneSchema>;

/** Обновление профиля: все поля опциональны. Email/пароль/телефон — отдельно. */
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

// ——— Вход ———

export const loginWithEmailSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  captchaToken: z.string().min(1).optional(),
});
export type LoginWithEmail = z.infer<typeof loginWithEmailSchema>;

/** Запрос кода подтверждения на email для входа */
export const loginEmailRequestCodeSchema = z.object({
  email: emailSchema,
});
export type LoginEmailRequestCode = z.infer<typeof loginEmailRequestCodeSchema>;

/** Вход по email + код + пароль */
export const loginWithEmailCodeSchema = z.object({
  email: emailSchema,
  code: emailCodeSchema,
  password: z.string().min(1),
});
export type LoginWithEmailCode = z.infer<typeof loginWithEmailCodeSchema>;

/** Запрос SMS-кода для входа по телефону */
export const loginPhoneRequestCodeSchema = z.object({
  phone: phoneSchema,
});
export type LoginPhoneRequestCode = z.infer<typeof loginPhoneRequestCodeSchema>;

/** Вход по телефону + SMS-код + пароль */
export const loginWithPhoneCodeSchema = z.object({
  phone: phoneSchema,
  code: emailCodeSchema,
  password: z.string().min(1),
});
export type LoginWithPhoneCode = z.infer<typeof loginWithPhoneCodeSchema>;

// ——— 1.5.2 Восстановление пароля ———

/** Шаг 1: email → шлём код для сброса пароля */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
  captchaToken: z.string().min(1).optional(),
});
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;

/** Шаг 2: проверить код */
export const passwordResetVerifySchema = z.object({
  email: emailSchema,
  code: emailCodeSchema,
});
export type PasswordResetVerify = z.infer<typeof passwordResetVerifySchema>;

/** Шаг 3: задать новый пароль */
export const passwordResetCompleteSchema = z.object({
  email: emailSchema,
  code: emailCodeSchema,
  newPassword: passwordSchema,
});
export type PasswordResetComplete = z.infer<typeof passwordResetCompleteSchema>;
