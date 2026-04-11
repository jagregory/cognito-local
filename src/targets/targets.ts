import { AddCustomAttributes } from "./addCustomAttributes";
import { AdminAddUserToGroup } from "./adminAddUserToGroup";
import { AdminConfirmSignUp } from "./adminConfirmSignUp";
import { AdminCreateUser } from "./adminCreateUser";
import { AdminDeleteUser } from "./adminDeleteUser";
import { AdminDeleteUserAttributes } from "./adminDeleteUserAttributes";
import { AdminDisableProviderForUser } from "./adminDisableProviderForUser";
import { AdminDisableUser } from "./adminDisableUser";
import { AdminEnableUser } from "./adminEnableUser";
import { AdminForgetDevice } from "./adminForgetDevice";
import { AdminGetDevice } from "./adminGetDevice";
import { AdminGetUser } from "./adminGetUser";
import { AdminInitiateAuth } from "./adminInitiateAuth";
import { AdminLinkProviderForUser } from "./adminLinkProviderForUser";
import { AdminListDevices } from "./adminListDevices";
import { AdminListGroupsForUser } from "./adminListGroupsForUser";
import { AdminRemoveUserFromGroup } from "./adminRemoveUserFromGroup";
import { AdminResetUserPassword } from "./adminResetUserPassword";
import { AdminRespondToAuthChallenge } from "./adminRespondToAuthChallenge";
import { AdminSetUserMFAPreference } from "./adminSetUserMFAPreference";
import { AdminSetUserPassword } from "./adminSetUserPassword";
import { AdminSetUserSettings } from "./adminSetUserSettings";
import { AdminUpdateDeviceStatus } from "./adminUpdateDeviceStatus";
import { AdminUpdateUserAttributes } from "./adminUpdateUserAttributes";
import { AdminUserGlobalSignOut } from "./adminUserGlobalSignOut";
import { AssociateSoftwareToken } from "./associateSoftwareToken";
import { ChangePassword } from "./changePassword";
import { ConfirmDevice } from "./confirmDevice";
import { ConfirmForgotPassword } from "./confirmForgotPassword";
import { ConfirmSignUp } from "./confirmSignUp";
import { CreateGroup } from "./createGroup";
import { CreateIdentityProvider } from "./createIdentityProvider";
import { CreateResourceServer } from "./createResourceServer";
import { CreateUserPool } from "./createUserPool";
import { CreateUserPoolClient } from "./createUserPoolClient";
import { CreateUserPoolDomain } from "./createUserPoolDomain";
import { DeleteGroup } from "./deleteGroup";
import { DeleteIdentityProvider } from "./deleteIdentityProvider";
import { DeleteResourceServer } from "./deleteResourceServer";
import { DeleteUser } from "./deleteUser";
import { DeleteUserAttributes } from "./deleteUserAttributes";
import { DeleteUserPool } from "./deleteUserPool";
import { DeleteUserPoolClient } from "./deleteUserPoolClient";
import { DeleteUserPoolDomain } from "./deleteUserPoolDomain";
import { DescribeIdentityProvider } from "./describeIdentityProvider";
import { DescribeResourceServer } from "./describeResourceServer";
import { DescribeUserPool } from "./describeUserPool";
import { DescribeUserPoolClient } from "./describeUserPoolClient";
import { DescribeUserPoolDomain } from "./describeUserPoolDomain";
import { ForgetDevice } from "./forgetDevice";
import { ForgotPassword } from "./forgotPassword";
import { GetDevice } from "./getDevice";
import { GetGroup } from "./getGroup";
import { GetIdentityProviderByIdentifier } from "./getIdentityProviderByIdentifier";
import { GetTokensFromRefreshToken } from "./getTokensFromRefreshToken";
import { GetUser } from "./getUser";
import { GetUserAttributeVerificationCode } from "./getUserAttributeVerificationCode";
import { GetUserAuthFactors } from "./getUserAuthFactors";
import { GetUserPoolMfaConfig } from "./getUserPoolMfaConfig";
import { GlobalSignOut } from "./globalSignOut";
import { InitiateAuth } from "./initiateAuth";
import { ListDevices } from "./listDevices";
import { ListGroups } from "./listGroups";
import { ListIdentityProviders } from "./listIdentityProviders";
import { ListResourceServers } from "./listResourceServers";
import { ListTagsForResource } from "./listTagsForResource";
import { ListUserPoolClients } from "./listUserPoolClients";
import { ListUserPools } from "./listUserPools";
import { ListUsers } from "./listUsers";
import { ListUsersInGroup } from "./listUsersInGroup";
import { ResendConfirmationCode } from "./resendConfirmationCode";
import { RespondToAuthChallenge } from "./respondToAuthChallenge";
import { RevokeToken } from "./revokeToken";
import { SetUserMFAPreference } from "./setUserMFAPreference";
import { SetUserPoolMfaConfig } from "./setUserPoolMfaConfig";
import { SetUserSettings } from "./setUserSettings";
import { SignUp } from "./signUp";
import { TagResource } from "./tagResource";
import { UntagResource } from "./untagResource";
import { UpdateDeviceStatus } from "./updateDeviceStatus";
import { UpdateGroup } from "./updateGroup";
import { UpdateIdentityProvider } from "./updateIdentityProvider";
import { UpdateResourceServer } from "./updateResourceServer";
import { UpdateUserAttributes } from "./updateUserAttributes";
import { UpdateUserPool } from "./updateUserPool";
import { UpdateUserPoolClient } from "./updateUserPoolClient";
import { UpdateUserPoolDomain } from "./updateUserPoolDomain";
import { VerifySoftwareToken } from "./verifySoftwareToken";
import { VerifyUserAttribute } from "./verifyUserAttribute";

export const Targets = {
  AddCustomAttributes,
  AdminAddUserToGroup,
  AdminConfirmSignUp,
  AdminCreateUser,
  AdminDeleteUser,
  AdminDeleteUserAttributes,
  AdminDisableProviderForUser,
  AdminDisableUser,
  AdminEnableUser,
  AdminForgetDevice,
  AdminGetDevice,
  AdminGetUser,
  AdminInitiateAuth,
  AdminLinkProviderForUser,
  AdminListDevices,
  AdminListGroupsForUser,
  AdminRemoveUserFromGroup,
  AdminResetUserPassword,
  AdminRespondToAuthChallenge,
  AdminSetUserMFAPreference,
  AdminSetUserPassword,
  AdminSetUserSettings,
  AdminUpdateDeviceStatus,
  AdminUpdateUserAttributes,
  AdminUserGlobalSignOut,
  AssociateSoftwareToken,
  ChangePassword,
  ConfirmDevice,
  ConfirmForgotPassword,
  ConfirmSignUp,
  CreateGroup,
  CreateIdentityProvider,
  CreateResourceServer,
  CreateUserPool,
  CreateUserPoolClient,
  CreateUserPoolDomain,
  DeleteGroup,
  DeleteIdentityProvider,
  DeleteResourceServer,
  DeleteUser,
  DeleteUserAttributes,
  DeleteUserPool,
  DeleteUserPoolClient,
  DeleteUserPoolDomain,
  DescribeIdentityProvider,
  DescribeResourceServer,
  DescribeUserPool,
  DescribeUserPoolClient,
  DescribeUserPoolDomain,
  ForgetDevice,
  ForgotPassword,
  GetDevice,
  GetGroup,
  GetIdentityProviderByIdentifier,
  GetTokensFromRefreshToken,
  GetUser,
  GetUserAttributeVerificationCode,
  GetUserAuthFactors,
  GetUserPoolMfaConfig,
  GlobalSignOut,
  InitiateAuth,
  ListDevices,
  ListGroups,
  ListIdentityProviders,
  ListResourceServers,
  ListTagsForResource,
  ListUserPoolClients,
  ListUserPools,
  ListUsers,
  ListUsersInGroup,
  ResendConfirmationCode,
  RespondToAuthChallenge,
  RevokeToken,
  SetUserMFAPreference,
  SetUserPoolMfaConfig,
  SetUserSettings,
  SignUp,
  TagResource,
  UntagResource,
  UpdateDeviceStatus,
  UpdateGroup,
  UpdateIdentityProvider,
  UpdateResourceServer,
  UpdateUserAttributes,
  UpdateUserPool,
  UpdateUserPoolClient,
  UpdateUserPoolDomain,
  VerifySoftwareToken,
  VerifyUserAttribute,
} as const;
