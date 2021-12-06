import {
  CreateUserPoolRequest,
  CreateUserPoolResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import shortUUID from "short-uuid";
import { Services } from "../services";
import { Target } from "./router";

const REGION = "local";
const ACCOUNT_ID = "local";

const generator = shortUUID(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
);

export type CreateUserPoolTarget = Target<
  CreateUserPoolRequest,
  CreateUserPoolResponse
>;

type CreateUserPoolServices = Pick<Services, "clock" | "cognito">;

export const CreateUserPool =
  ({ cognito, clock }: CreateUserPoolServices): CreateUserPoolTarget =>
  async (ctx, req) => {
    const now = clock.get();
    const userPoolId = `${REGION}_${generator.new().slice(0, 8)}`;
    const userPool = await cognito.createUserPool(ctx, {
      ...req,
      Arn: `arn:aws:cognito-idp:${REGION}:${ACCOUNT_ID}:userpool/${userPoolId}`,
      CreationDate: now,
      Id: userPoolId,
      LastModifiedDate: now,
      Name: req.PoolName,
    });

    return {
      UserPool: userPool,
    };
  };
