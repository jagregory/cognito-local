import { id } from ".";
import { UserPool } from "../services/userPoolService";

function userPoolArn(userPoolId: string) {
  return `arn:aws:cognito-idp:local:local:userpool/${userPoolId}`;
}

export const UserPoolModel = (partial?: Partial<UserPool>): UserPool => {
  const userPoolId = partial?.Id ?? id("local_UserPool");

  return {
    AccountRecoverySetting: partial?.AccountRecoverySetting ?? undefined,
    AdminCreateUserConfig: partial?.AdminCreateUserConfig ?? undefined,
    AliasAttributes: partial?.AliasAttributes ?? undefined,
    Arn: partial?.Arn ?? userPoolArn(userPoolId),
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
