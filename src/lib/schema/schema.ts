import { object, string, date, InferType, boolean } from "yup";
import {
  farcasterUsernameRegex,
  telegramUsernameRegex,
  twitterUsernameRegex,
} from "../shared/utils";

export const LoginSchema = object({
  email: string()
    .email("Invalid email address.")
    .required("This field is required."),
  password: string().required("This field is required."),
  code: string()
    .min(6, "Code must be 6 characters.")
    .max(6, "Code must be 6 characters.")
    .required("This field is required."),
  iv: string().default(""),
  passwordSalt: string().default(""),
  passwordHash: string().default(""),
  authToken: object({
    value: string(),
    expiresAt: date(),
  }).optional(),
  encryptedData: string().default(""),
  authenticationTag: string().default(""),
});

export const RegisterLocationSchema = object({
  iykRef: string().optional().default(undefined),
  mockRef: string().optional().default(undefined),
  sigPk: string().optional().default(undefined),
  name: string()
    .max(64, "Location name must be less than 64 characters.")
    .required(),
  description: string()
    .max(256, "Description must be less than 256 characters.")
    .required(),
  sponsor: string()
    .max(32, "Sponsor must be less than 32 characters.")
    .required(),
  imageUrl: string().optional(),
  emailWallet: boolean().required(),
});

export const ProfileSchema = object({
  displayName: string()
    .max(20, "Display name must be less than 20 characters.")
    .trim()
    .required("This field is required."),
  twitterUsername: string()
    .matches(twitterUsernameRegex, {
      message: "Invalid Twitter username.",
      excludeEmptyString: true,
    })
    .trim()
    .optional(),
  telegramUsername: string()
    .matches(telegramUsernameRegex, {
      message: "Invalid Telegram username.",
      excludeEmptyString: true,
    })
    .trim()
    .optional(),
  bio: string().max(200, "Bio must be less than 200 characters.").optional(),
});

export const RegisterSchema = ProfileSchema.shape({
  email: string()
    .email("Invalid email address.")
    .required("This field is required."),
  code: string()
    .min(6, "Code must be 6 characters.")
    .max(6, "Code must be 6 characters.")
    .required("This field is required."),
  password: string()
    .required("Password is required.")
    .min(6, "Password must be at least 6 characters."),
  confirmPassword: string()
    .required("This field is required.")
    .test({
      name: "passwords-match",
      message: "Passwords must match.",
      test: function (value) {
        return this.parent.password === value;
      },
    }),
});

export type RegisterLocationType = InferType<typeof RegisterLocationSchema>;
export type LoginType = InferType<typeof LoginSchema>;
export type ProfileType = InferType<typeof ProfileSchema>;
export type RegisterType = InferType<typeof RegisterSchema>;
