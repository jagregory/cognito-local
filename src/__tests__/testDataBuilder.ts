import { v4 } from "uuid";
import { Group, User } from "../services/userPoolClient";

export const id = (prefix: string, number?: number) =>
  `${prefix}${number ?? Math.floor(Math.random() * 100000)}`;

export const group = (partial?: Partial<Group>): Group => ({
  CreationDate: partial?.CreationDate ?? new Date().getTime(),
  Description: partial?.Description ?? undefined,
  GroupName: partial?.GroupName ?? id("Group"),
  LastModifiedDate: partial?.LastModifiedDate ?? new Date().getTime(),
  Precedence: partial?.Precedence ?? undefined,
  RoleArn: partial?.RoleArn ?? undefined,
});

export const user = (partial?: Partial<User>): User => ({
  Attributes: partial?.Attributes ?? [
    { Name: "sub", Value: v4() },
    { Name: "email", Value: `${id("example")}@example.com` },
  ],
  ConfirmationCode: partial?.ConfirmationCode ?? undefined,
  Enabled: partial?.Enabled ?? true,
  MFACode: partial?.MFACode ?? undefined,
  MFAOptions: partial?.MFAOptions ?? undefined,
  Password: partial?.Password ?? "Password123!",
  UserCreateDate: partial?.UserCreateDate ?? new Date().getTime(),
  UserLastModifiedDate: partial?.UserLastModifiedDate ?? new Date().getTime(),
  Username: partial?.Username ?? id("User"),
  UserStatus: partial?.UserStatus ?? "CONFIRMED",
});