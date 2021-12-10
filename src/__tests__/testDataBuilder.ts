import { v4 } from "uuid";
import { Group, User, UserPool } from "../services/userPoolService";

export const id = (prefix: string, number?: number) =>
  `${prefix}${number ?? Math.floor(Math.random() * 100000)}`;

export const group = (partial?: Partial<Group>): Group => ({
  CreationDate: partial?.CreationDate ?? new Date(),
  Description: partial?.Description ?? undefined,
  GroupName: partial?.GroupName ?? id("Group"),
  LastModifiedDate: partial?.LastModifiedDate ?? new Date(),
  Precedence: partial?.Precedence ?? undefined,
  RoleArn: partial?.RoleArn ?? undefined,
});

export const user = (partial?: Partial<User>): User => ({
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

export const userPool = (partial?: Partial<UserPool>): UserPool => {
  const userPoolId = partial?.Id ?? id("local_UserPool");

  return {
    AccountRecoverySetting: partial?.AccountRecoverySetting ?? undefined,
    AdminCreateUserConfig: partial?.AdminCreateUserConfig ?? undefined,
    AliasAttributes: partial?.AliasAttributes ?? undefined,
    Arn:
      partial?.Arn ?? `arn:aws:cognito-idp:local:local:userpool/${userPoolId}`,
    AutoVerifiedAttributes: partial?.AutoVerifiedAttributes ?? undefined,
    CreationDate: partial?.CreationDate ?? new Date(),
    CustomDomain: partial?.CustomDomain ?? undefined,
    DeviceConfiguration: partial?.DeviceConfiguration ?? undefined,
    Domain: partial?.Domain ?? undefined,
    EmailConfiguration: partial?.EmailConfiguration ?? undefined,
    EmailConfigurationFailure: partial?.EmailConfigurationFailure ?? undefined,
    EmailVerificationMessage: partial?.EmailVerificationMessage ?? undefined,
    EmailVerificationSubject: partial?.EmailVerificationSubject ?? undefined,
    EstimatedNumberOfUsers: partial?.EstimatedNumberOfUsers ?? undefined,
    Id: userPoolId,
    LambdaConfig: partial?.LambdaConfig ?? undefined,
    LastModifiedDate: partial?.LastModifiedDate ?? new Date(),
    MfaConfiguration: partial?.MfaConfiguration ?? undefined,
    Name: partial?.Name ?? undefined,
    Policies: partial?.Policies ?? undefined,
    SchemaAttributes: partial?.SchemaAttributes ?? undefined,
    SmsAuthenticationMessage: partial?.SmsAuthenticationMessage ?? undefined,
    SmsConfiguration: partial?.SmsConfiguration ?? undefined,
    SmsConfigurationFailure: partial?.SmsConfigurationFailure ?? undefined,
    SmsVerificationMessage: partial?.SmsVerificationMessage ?? undefined,
    Status: partial?.Status ?? undefined,
    UsernameAttributes: partial?.UsernameAttributes ?? undefined,
    UsernameConfiguration: partial?.UsernameConfiguration ?? undefined,
    UserPoolAddOns: partial?.UserPoolAddOns ?? undefined,
    UserPoolTags: partial?.UserPoolTags ?? undefined,
    VerificationMessageTemplate:
      partial?.VerificationMessageTemplate ?? undefined,
  };
};
