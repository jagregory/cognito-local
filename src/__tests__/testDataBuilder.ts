import { User } from "../services/userPoolClient";

export const user = (): User => ({
  Attributes: [],
  Enabled: true,
  Password: "Password123!",
  UserCreateDate: Math.floor(new Date().getTime() / 1000),
  UserLastModifiedDate: Math.floor(new Date().getTime() / 1000),
  Username: "Username",
  UserStatus: "CONFIRMED",
});
