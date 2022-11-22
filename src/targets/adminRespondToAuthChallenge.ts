import {
  AdminInitiateAuthRequest,
  AdminRespondToAuthChallengeRequest,
  AdminRespondToAuthChallengeResponse,
  DeliveryMediumType,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import {
  CodeMismatchError,
  InvalidParameterError,
  MFAMethodNotFoundException,
  NotAuthorizedError,
  UnsupportedError,
  UserNotFoundError,
} from "../errors";
import { Services } from "../services";
import { attributeValue, MFAOption } from "../services/userPoolService";
import {
  AdminInitiateAuthServices,
  verifyMfaChallenge,
} from "./adminInitiateAuth";
import { Target } from "./Target";

export type AdminRespondToAuthChallengeTarget = Target<
  AdminRespondToAuthChallengeRequest,
  AdminRespondToAuthChallengeResponse
>;

type AdminRespondToAuthChallengeService = Pick<
  Services,
  "clock" | "cognito" | "messages" | "otp" | "triggers" | "tokenGenerator"
>;

export const AdminRespondToAuthChallenge =
  ({
    clock,
    cognito,
    messages,
    otp,
    triggers,
    tokenGenerator,
  }: AdminRespondToAuthChallengeService): AdminRespondToAuthChallengeTarget =>
  async (ctx, req) => {
    if (!req.ChallengeResponses) {
      throw new InvalidParameterError(
        "Missing required parameter challenge responses"
      );
    }
    if (!req.ChallengeResponses.USERNAME) {
      throw new InvalidParameterError("Missing required parameter USERNAME");
    }
    if (!req.Session) {
      throw new InvalidParameterError("Missing required parameter Session");
    }

    const userPool = await cognito.getUserPoolForClientId(ctx, req.ClientId);
    const userPoolClient = await cognito.getAppClient(ctx, req.ClientId);

    const user = await userPool.getUserByUsername(
      ctx,
      req.ChallengeResponses.USERNAME
    );
    if (!user || !userPoolClient) {
      throw new NotAuthorizedError();
    }

    if (req.ChallengeName === "SMS_MFA") {
      if (!user.MFAOptions?.length) {
        throw new NotAuthorizedError();
      }
      const smsMfaOption = user.MFAOptions?.find(
        (x): x is MFAOption & { DeliveryMedium: DeliveryMediumType } =>
          x.DeliveryMedium === "SMS"
      );
      console.log(smsMfaOption);
      if (!smsMfaOption) {
        throw new MFAMethodNotFoundException();
      }

      const deliveryDestinationVerified = attributeValue(
        `${smsMfaOption.AttributeName}_verified`,
        user.Attributes
      );
      if (!deliveryDestinationVerified) {
        throw new UserNotFoundError();
      }

      if (user.MFACode !== req.ChallengeResponses.SMS_MFA_CODE) {
        throw new CodeMismatchError();
      }

      await userPool.saveUser(ctx, {
        ...user,
        MFACode: undefined,
        UserLastModifiedDate: clock.get(),
      });
    } else if (req.ChallengeName === "NEW_PASSWORD_REQUIRED") {
      if (!req.ChallengeResponses.NEW_PASSWORD) {
        throw new InvalidParameterError(
          "Missing required parameter NEW_PASSWORD"
        );
      }

      // TODO: validate the password?
      await userPool.saveUser(ctx, {
        ...user,
        Password: req.ChallengeResponses.NEW_PASSWORD,
        UserLastModifiedDate: clock.get(),
        UserStatus: "CONFIRMED",
      });

      if (
        (userPool.options.MfaConfiguration === "OPTIONAL" &&
          (user.MFAOptions ?? []).length > 0) ||
        userPool.options.MfaConfiguration === "ON"
      ) {
        const services: AdminInitiateAuthServices = {
          cognito,
          messages,
          otp,
          triggers,
          tokenGenerator,
        };
        const mfaReq: AdminInitiateAuthRequest = {
          ...req,
          AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
        };
        return verifyMfaChallenge(ctx, user, mfaReq, userPool, services);
      }
    } else {
      throw new UnsupportedError(
        `respondToAuthChallenge with ChallengeName=${req.ChallengeName}`
      );
    }

    if (triggers.enabled("PostAuthentication")) {
      await triggers.postAuthentication(ctx, {
        clientId: req.ClientId,
        clientMetadata: req.ClientMetadata,
        source: "PostAuthentication_Authentication",
        userAttributes: user.Attributes,
        username: user.Username,
        userPoolId: userPool.options.Id,
      });
    }

    const userGroups = await userPool.listUserGroupMembership(ctx, user);

    return {
      ChallengeParameters: {},
      AuthenticationResult: await tokenGenerator.generate(
        ctx,
        user,
        userGroups,
        userPoolClient,
        req.ClientMetadata,
        "Authentication"
      ),
    };
  };
