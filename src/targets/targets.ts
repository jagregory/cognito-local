import { AddCustomAttributes } from "./addCustomAttributes";
import { AdminAddUserToGroup } from "./adminAddUserToGroup";
import { AdminConfirmSignUp } from "./adminConfirmSignUp";
import { AdminCreateUser } from "./adminCreateUser";
import { AdminDeleteUser } from "./adminDeleteUser";

import { AdminDeleteUserAttributes } from "./adminDeleteUserAttributes";
import { AdminDisableUser } from "./adminDisableUser";
import { AdminEnableUser } from "./adminEnableUser";
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
import { DeleteUserPool } from "./deleteUserPool";
import { DeleteUserPoolClient } from "./deleteUserPoolClient";
import { DescribeUserPool } from "./describeUserPool";
import { DescribeUserPoolClient } from "./describeUserPoolClient";
import { ForgotPassword } from "./forgotPassword";
import { GetGroup } from "./getGroup";
import { GetUser } from "./getUser";
import { GetUserAttributeVerificationCode } from "./getUserAttributeVerificationCode";
import { GetUserPoolMfaConfig } from "./getUserPoolMfaConfig";
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
import { UpdateUserPool } from "./updateUserPool";
import { UpdateUserPoolClient } from "./updateUserPoolClient";
import { VerifyUserAttribute } from "./verifyUserAttribute";

export const Targets = {
  AddCustomAttributes,
  AdminAddUserToGroup,
  AdminConfirmSignUp,
  AdminCreateUser,
  AdminDeleteUser,
  AdminDeleteUserAttributes,
  AdminDisableUser,
  AdminEnableUser,
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
  DeleteUserPool,
  DeleteUserPoolClient,
  DescribeUserPool,
  DescribeUserPoolClient,
  ForgotPassword,
  GetGroup,
  GetUser,
  GetUserAttributeVerificationCode,
  GetUserPoolMfaConfig,
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
  UpdateUserPool,
  UpdateUserPoolClient,
  VerifyUserAttribute,
} as const;
