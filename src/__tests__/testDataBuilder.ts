import { User } from "../services/userPoolClient";

export const user = (partial?: Partial<User>): User => ({
  Attributes: partial?.Attributes ?? [],
  Enabled: partial?.Enabled ?? true,
  Password: partial?.Password ?? "Password123!",
  UserCreateDate: partial?.UserCreateDate ?? new Date().getTime(),
  UserLastModifiedDate: partial?.UserLastModifiedDate ?? new Date().getTime(),
  Username: partial?.Username ?? "Username",
  UserStatus: partial?.UserStatus ?? "CONFIRMED",
});
