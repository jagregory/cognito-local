import { AddCustomAttributes } from "./addCustomAttributes";
import { AddUserPoolClientSecret } from "./addUserPoolClientSecret";
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
import { AdminListUserAuthEvents } from "./adminListUserAuthEvents";
import { AdminRemoveUserFromGroup } from "./adminRemoveUserFromGroup";
import { AdminResetUserPassword } from "./adminResetUserPassword";
import { AdminRespondToAuthChallenge } from "./adminRespondToAuthChallenge";
import { AdminSetUserMFAPreference } from "./adminSetUserMFAPreference";
import { AdminSetUserPassword } from "./adminSetUserPassword";
import { AdminSetUserSettings } from "./adminSetUserSettings";
import { AdminUpdateAuthEventFeedback } from "./adminUpdateAuthEventFeedback";
import { AdminUpdateDeviceStatus } from "./adminUpdateDeviceStatus";
import { AdminUpdateUserAttributes } from "./adminUpdateUserAttributes";
import { AdminUserGlobalSignOut } from "./adminUserGlobalSignOut";
import { AssociateSoftwareToken } from "./associateSoftwareToken";
import { ChangePassword } from "./changePassword";
import { CompleteWebAuthnRegistration } from "./completeWebAuthnRegistration";
import { ConfirmDevice } from "./confirmDevice";
import { ConfirmForgotPassword } from "./confirmForgotPassword";
import { ConfirmSignUp } from "./confirmSignUp";
import { CreateGroup } from "./createGroup";
import { CreateIdentityProvider } from "./createIdentityProvider";
import { CreateManagedLoginBranding } from "./createManagedLoginBranding";
import { CreateResourceServer } from "./createResourceServer";
import { CreateTerms } from "./createTerms";
import { CreateUserImportJob } from "./createUserImportJob";
import { CreateUserPool } from "./createUserPool";
import { CreateUserPoolClient } from "./createUserPoolClient";
import { CreateUserPoolDomain } from "./createUserPoolDomain";
import { DeleteGroup } from "./deleteGroup";
import { DeleteIdentityProvider } from "./deleteIdentityProvider";
import { DeleteManagedLoginBranding } from "./deleteManagedLoginBranding";
import { DeleteResourceServer } from "./deleteResourceServer";
import { DeleteTerms } from "./deleteTerms";
import { DeleteUser } from "./deleteUser";
import { DeleteUserAttributes } from "./deleteUserAttributes";
import { DeleteUserPool } from "./deleteUserPool";
import { DeleteUserPoolClient } from "./deleteUserPoolClient";
import { DeleteUserPoolClientSecret } from "./deleteUserPoolClientSecret";
import { DeleteUserPoolDomain } from "./deleteUserPoolDomain";
import { DeleteWebAuthnCredential } from "./deleteWebAuthnCredential";
import { DescribeIdentityProvider } from "./describeIdentityProvider";
import { DescribeManagedLoginBranding } from "./describeManagedLoginBranding";
import { DescribeManagedLoginBrandingByClient } from "./describeManagedLoginBrandingByClient";
import { DescribeResourceServer } from "./describeResourceServer";
import { DescribeRiskConfiguration } from "./describeRiskConfiguration";
import { DescribeTerms } from "./describeTerms";
import { DescribeUserImportJob } from "./describeUserImportJob";
import { DescribeUserPool } from "./describeUserPool";
import { DescribeUserPoolClient } from "./describeUserPoolClient";
import { DescribeUserPoolDomain } from "./describeUserPoolDomain";
import { ForgetDevice } from "./forgetDevice";
import { ForgotPassword } from "./forgotPassword";
import { GetCSVHeader } from "./getCSVHeader";
import { GetDevice } from "./getDevice";
import { GetGroup } from "./getGroup";
import { GetIdentityProviderByIdentifier } from "./getIdentityProviderByIdentifier";
import { GetLogDeliveryConfiguration } from "./getLogDeliveryConfiguration";
import { GetSigningCertificate } from "./getSigningCertificate";
import { GetTokensFromRefreshToken } from "./getTokensFromRefreshToken";
import { GetUICustomization } from "./getUICustomization";
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
import { ListTerms } from "./listTerms";
import { ListUserImportJobs } from "./listUserImportJobs";
import { ListUserPoolClientSecrets } from "./listUserPoolClientSecrets";
import { ListUserPoolClients } from "./listUserPoolClients";
import { ListUserPools } from "./listUserPools";
import { ListUsers } from "./listUsers";
import { ListUsersInGroup } from "./listUsersInGroup";
import { ListWebAuthnCredentials } from "./listWebAuthnCredentials";
import { ResendConfirmationCode } from "./resendConfirmationCode";
import { RespondToAuthChallenge } from "./respondToAuthChallenge";
import { RevokeToken } from "./revokeToken";
import { SetLogDeliveryConfiguration } from "./setLogDeliveryConfiguration";
import { SetRiskConfiguration } from "./setRiskConfiguration";
import { SetUICustomization } from "./setUICustomization";
import { SetUserMFAPreference } from "./setUserMFAPreference";
import { SetUserPoolMfaConfig } from "./setUserPoolMfaConfig";
import { SetUserSettings } from "./setUserSettings";
import { SignUp } from "./signUp";
import { StartUserImportJob } from "./startUserImportJob";
import { StartWebAuthnRegistration } from "./startWebAuthnRegistration";
import { StopUserImportJob } from "./stopUserImportJob";
import { TagResource } from "./tagResource";
import { UntagResource } from "./untagResource";
import { UpdateAuthEventFeedback } from "./updateAuthEventFeedback";
import { UpdateDeviceStatus } from "./updateDeviceStatus";
import { UpdateGroup } from "./updateGroup";
import { UpdateIdentityProvider } from "./updateIdentityProvider";
import { UpdateManagedLoginBranding } from "./updateManagedLoginBranding";
import { UpdateResourceServer } from "./updateResourceServer";
import { UpdateTerms } from "./updateTerms";
import { UpdateUserAttributes } from "./updateUserAttributes";
import { UpdateUserPool } from "./updateUserPool";
import { UpdateUserPoolClient } from "./updateUserPoolClient";
import { UpdateUserPoolDomain } from "./updateUserPoolDomain";
import { VerifySoftwareToken } from "./verifySoftwareToken";
import { VerifyUserAttribute } from "./verifyUserAttribute";

export const Targets = {
  AddCustomAttributes,
  AddUserPoolClientSecret,
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
  AdminListUserAuthEvents,
  AdminRemoveUserFromGroup,
  AdminResetUserPassword,
  AdminRespondToAuthChallenge,
  AdminSetUserMFAPreference,
  AdminSetUserPassword,
  AdminSetUserSettings,
  AdminUpdateAuthEventFeedback,
  AdminUpdateDeviceStatus,
  AdminUpdateUserAttributes,
  AdminUserGlobalSignOut,
  AssociateSoftwareToken,
  ChangePassword,
  CompleteWebAuthnRegistration,
  ConfirmDevice,
  ConfirmForgotPassword,
  ConfirmSignUp,
  CreateGroup,
  CreateIdentityProvider,
  CreateManagedLoginBranding,
  CreateResourceServer,
  CreateTerms,
  CreateUserImportJob,
  CreateUserPool,
  CreateUserPoolClient,
  CreateUserPoolDomain,
  DeleteGroup,
  DeleteIdentityProvider,
  DeleteManagedLoginBranding,
  DeleteResourceServer,
  DeleteTerms,
  DeleteUser,
  DeleteUserAttributes,
  DeleteUserPool,
  DeleteUserPoolClient,
  DeleteUserPoolClientSecret,
  DeleteUserPoolDomain,
  DeleteWebAuthnCredential,
  DescribeIdentityProvider,
  DescribeManagedLoginBranding,
  DescribeManagedLoginBrandingByClient,
  DescribeResourceServer,
  DescribeRiskConfiguration,
  DescribeTerms,
  DescribeUserImportJob,
  DescribeUserPool,
  DescribeUserPoolClient,
  DescribeUserPoolDomain,
  ForgetDevice,
  ForgotPassword,
  GetCSVHeader,
  GetDevice,
  GetGroup,
  GetIdentityProviderByIdentifier,
  GetLogDeliveryConfiguration,
  GetSigningCertificate,
  GetTokensFromRefreshToken,
  GetUICustomization,
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
  ListTerms,
  ListUserImportJobs,
  ListUserPoolClientSecrets,
  ListUserPoolClients,
  ListUserPools,
  ListUsers,
  ListUsersInGroup,
  ListWebAuthnCredentials,
  ResendConfirmationCode,
  RespondToAuthChallenge,
  RevokeToken,
  SetLogDeliveryConfiguration,
  SetRiskConfiguration,
  SetUICustomization,
  SetUserMFAPreference,
  SetUserPoolMfaConfig,
  SetUserSettings,
  SignUp,
  StartUserImportJob,
  StartWebAuthnRegistration,
  StopUserImportJob,
  TagResource,
  UntagResource,
  UpdateAuthEventFeedback,
  UpdateDeviceStatus,
  UpdateGroup,
  UpdateIdentityProvider,
  UpdateManagedLoginBranding,
  UpdateResourceServer,
  UpdateTerms,
  UpdateUserAttributes,
  UpdateUserPool,
  UpdateUserPoolClient,
  UpdateUserPoolDomain,
  VerifySoftwareToken,
  VerifyUserAttribute,
} as const;
