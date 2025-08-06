import type {
  CreateUserPoolRequest,
  CreateUserPoolResponse,
  SchemaAttributesListType,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import shortUUID from "short-uuid";
import type { Services } from "../services";
import { USER_POOL_AWS_DEFAULTS } from "../services/cognitoService";
import { userPoolToResponseObject } from "./responses";
import type { Target } from "./Target";

const REGION = "local";
const ACCOUNT_ID = "local";

const generator = shortUUID(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
);

export type CreateUserPoolTarget = Target<
  CreateUserPoolRequest,
  CreateUserPoolResponse
>;

type CreateUserPoolServices = Pick<Services, "clock" | "cognito">;

/**
 * createSchemaAttributes combines the default list of User Pool Schema Attributes with the Schema provided by the
 * caller in their request. Any attributes from the caller which match a default attribute are treated as an override
 * and merged with the default, and any remaining attributes from the caller have their name prefixed with "custom:".
 *
 * @param defaultAttributes Cognito's default Schema Attributes
 * @param requestSchema Schema provided by the caller
 */
const createSchemaAttributes = (
  defaultAttributes: SchemaAttributesListType,
  requestSchema: SchemaAttributesListType,
): SchemaAttributesListType => {
  const overrides = Object.fromEntries(
    requestSchema.map((x) => [x.Name as string, x]),
  );
  const defaultAttributeNames = defaultAttributes.map((x) => x.Name);
  const overriddenAttributes = defaultAttributes.map((attr) => {
    if (!attr.Name) {
      return attr;
    }

    const override = overrides[attr.Name];
    return {
      ...attr,
      ...override,
    };
  });
  const customAttributes = requestSchema
    .filter((x) => !defaultAttributeNames.includes(x.Name))
    .map((attr) => {
      const type = attr.AttributeDataType ?? "String";

      return {
        Name: `custom:${attr.Name}`,
        AttributeDataType: type,
        DeveloperOnlyAttribute: attr.DeveloperOnlyAttribute ?? false,
        Mutable: attr.Mutable ?? true,
        Required: attr.Required ?? false,
        StringAttributeConstraints:
          type === "String"
            ? (attr.StringAttributeConstraints ?? {})
            : undefined,
        NumberAttributeConstraints:
          type === "Number"
            ? (attr.NumberAttributeConstraints ?? {})
            : undefined,
      };
    });

  return [...overriddenAttributes, ...customAttributes];
};

export const CreateUserPool =
  ({ cognito, clock }: CreateUserPoolServices): CreateUserPoolTarget =>
  async (ctx, req) => {
    const now = clock.get();
    const userPoolId = `${REGION}_${generator.new().slice(0, 8)}`;
    const userPool = await cognito.createUserPool(ctx, {
      AccountRecoverySetting: req.AccountRecoverySetting,
      AdminCreateUserConfig: req.AdminCreateUserConfig,
      AliasAttributes: req.AliasAttributes,
      Arn: `arn:aws:cognito-idp:${REGION}:${ACCOUNT_ID}:userpool/${userPoolId}`,
      AutoVerifiedAttributes: req.AutoVerifiedAttributes,
      CreationDate: now,
      DeviceConfiguration: req.DeviceConfiguration,
      EmailConfiguration: req.EmailConfiguration,
      EmailVerificationMessage: req.EmailVerificationMessage,
      EmailVerificationSubject: req.EmailVerificationSubject,
      Id: userPoolId,
      LambdaConfig: req.LambdaConfig,
      LastModifiedDate: now,
      MfaConfiguration: req.MfaConfiguration,
      Name: req.PoolName,
      Policies: req.Policies,
      SchemaAttributes: createSchemaAttributes(
        USER_POOL_AWS_DEFAULTS.SchemaAttributes ?? [],
        req.Schema ?? [],
      ),
      SmsAuthenticationMessage: req.SmsAuthenticationMessage,
      SmsConfiguration: req.SmsConfiguration,
      SmsVerificationMessage: req.SmsVerificationMessage,
      UsernameAttributes: req.UsernameAttributes,
      UsernameConfiguration: req.UsernameConfiguration,
      UserPoolAddOns: req.UserPoolAddOns,
      UserPoolTags: req.UserPoolTags,
      VerificationMessageTemplate: req.VerificationMessageTemplate,
    });

    return {
      UserPool: userPoolToResponseObject(userPool),
    };
  };
