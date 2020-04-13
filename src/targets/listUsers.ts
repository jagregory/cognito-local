import { Services } from "../services";
import { UserAttribute } from "../services/userPool";

interface Input {
  UserPoolId: string;
  AttributesToGet?: string[]; // TODO: filter returned attributes
  Filter?: string; // TODO: filter users before returning
  Limit?: number; // TODO: limit number of returned users
  PaginationToken?: string; // TODO: support pagination
}

export interface DynamoDBUserRecord {
  Username: string;
  UserCreateDate: number;
  UserLastModifiedDate: number;
  Enabled: boolean;
  UserStatus: "CONFIRMED" | "UNCONFIRMED" | "RESET_REQUIRED";
  Attributes: readonly UserAttribute[];
}

interface Output {
  PaginationToken?: string;
  Users: readonly DynamoDBUserRecord[];
}

export type ListUsersTarget = (body: Input) => Promise<Output>;

export const ListUsers = ({
  userPool,
}: Services): ListUsersTarget => async () => {
  const users = await userPool.listUsers();

  return {
    Users: users.map((user) => ({
      Username: user.Username,
      UserCreateDate: user.UserCreateDate,
      UserLastModifiedDate: user.UserLastModifiedDate,
      Enabled: user.Enabled,
      UserStatus: user.UserStatus,
      Attributes: user.Attributes,
    })),
  };
};
