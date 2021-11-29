import {
  CreateUserPoolRequest,
  CreateUserPoolResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import shortUUID from "short-uuid";
import { Services } from "../services";

const REGION = "local";
const ACCOUNT_ID = "local";

const generator = shortUUID(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
);

export type CreateUserPoolTarget = (
  req: CreateUserPoolRequest
) => Promise<CreateUserPoolResponse>;

type CreateUserPoolServices = Pick<Services, "clock" | "cognito">;

export const CreateUserPool =
  ({ cognito, clock }: CreateUserPoolServices): CreateUserPoolTarget =>
  async (req) => {
    const now = clock.get();
    const userPoolId = `${REGION}_${generator.new().slice(0, 8)}`;
    const userPool = await cognito.createUserPool({
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
