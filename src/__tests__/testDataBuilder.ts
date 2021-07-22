import { User } from "../services/userPoolClient";

export const user = (): User => ({
  Attributes: [],
  Enabled: true,
  Password: "Password123!",
  UserCreateDate: new Date().getTime(),
  UserLastModifiedDate: new Date().getTime(),
  Username: "Username",
  UserStatus: "CONFIRMED",
});
