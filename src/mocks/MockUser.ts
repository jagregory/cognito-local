import { id } from "./";
import { v4 } from "uuid";
import { User } from "../services/userPoolService";

export const MockUser = (partial?: Partial<User>): User => ({
  Attributes: partial?.Attributes ?? [
    { Name: "sub", Value: v4() },
    { Name: "email", Value: `${id("example")}@example.com` },
  ],
  AttributeVerificationCode: partial?.AttributeVerificationCode ?? undefined,
  ConfirmationCode: partial?.ConfirmationCode ?? undefined,
  Enabled: partial?.Enabled ?? true,
  MFACode: partial?.MFACode ?? undefined,
  MFAOptions: partial?.MFAOptions ?? undefined,
  Password: partial?.Password ?? "Password123!",
  UserCreateDate: partial?.UserCreateDate ?? new Date(),
  UserLastModifiedDate: partial?.UserLastModifiedDate ?? new Date(),
  Username: partial?.Username ?? id("User"),
  UserStatus: partial?.UserStatus ?? "CONFIRMED",
  RefreshTokens: [],
});
