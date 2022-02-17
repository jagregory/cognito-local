import { AdminAddUserToGroup } from "./adminAddUserToGroup";
import { AdminConfirmSignUp } from "./adminConfirmSignUp";
import { AdminCreateUser } from "./adminCreateUser";
import { AdminDeleteUser } from "./adminDeleteUser";

import { AdminDeleteUserAttributes } from "./adminDeleteUserAttributes";
import { AdminGetUser } from "./adminGetUser";
import { AdminInitiateAuth } from "./adminInitiateAuth";
import { AdminListGroupsForUser } from "./adminListGroupsForUser";
import { AdminRemoveUserFromGroup } from "./adminRemoveUserFromGroup";
import { AdminSetUserPassword } from "./adminSetUserPassword";
import { AdminUpdateUserAttributes } from "./adminUpdateUserAttributes";
import { ChangePassword } from "./changePassword";
import { ConfirmForgotPassword } from "./confirmForgotPassword";
import { ConfirmSignUp } from "./confirmSignUp";
import { CreateGroup } from "./createGroup";
import { CreateUserPool } from "./createUserPool";
import { CreateUserPoolClient } from "./createUserPoolClient";
import { DeleteGroup } from "./deleteGroup";
import { DeleteUser } from "./deleteUser";
import { DeleteUserAttributes } from "./deleteUserAttributes";
import { DeleteUserPoolClient } from "./deleteUserPoolClient";
import { DescribeUserPoolClient } from "./describeUserPoolClient";
import { ForgotPassword } from "./forgotPassword";
import { GetGroup } from "./getGroup";
import { GetUser } from "./getUser";
import { GetUserAttributeVerificationCode } from "./getUserAttributeVerificationCode";
import { InitiateAuth } from "./initiateAuth";
import { ListGroups } from "./listGroups";
import { ListUserPoolClients } from "./listUserPoolClients";
import { ListUserPools } from "./listUserPools";
import { ListUsers } from "./listUsers";
import { ListUsersInGroup } from "./listUsersInGroup";
import { RespondToAuthChallenge } from "./respondToAuthChallenge";
import { RevokeToken } from "./revokeToken";
import { SignUp } from "./signUp";
import { UpdateGroup } from "./updateGroup";
import { UpdateUserAttributes } from "./updateUserAttributes";
import { VerifyUserAttribute } from "./verifyUserAttribute";

export const Targets = {
  AdminAddUserToGroup,
  AdminConfirmSignUp,
  AdminCreateUser,
  AdminDeleteUser,
  AdminDeleteUserAttributes,
  AdminGetUser,
  AdminInitiateAuth,
  AdminListGroupsForUser,
  AdminRemoveUserFromGroup,
  AdminSetUserPassword,
  AdminUpdateUserAttributes,
  ChangePassword,
  ConfirmForgotPassword,
  ConfirmSignUp,
  CreateGroup,
  CreateUserPool,
  CreateUserPoolClient,
  DeleteGroup,
  DeleteUser,
  DeleteUserAttributes,
  DeleteUserPoolClient,
  DescribeUserPoolClient,
  ForgotPassword,
  GetGroup,
  GetUser,
  GetUserAttributeVerificationCode,
  InitiateAuth,
  ListGroups,
  ListUserPoolClients,
  ListUserPools,
  ListUsers,
  ListUsersInGroup,
  RespondToAuthChallenge,
  RevokeToken,
  SignUp,
  UpdateGroup,
  UpdateUserAttributes,
  VerifyUserAttribute,
} as const;
