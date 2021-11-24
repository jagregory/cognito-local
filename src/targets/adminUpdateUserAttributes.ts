import {
  AdminUpdateUserAttributesRequest,
  AdminUpdateUserAttributesResponse,
} from "aws-sdk/clients/cognitoidentityserviceprovider";
import { Services } from "../services";
import { NotAuthorizedError } from "../errors";

export type AdminUpdateUserAttributesTarget = (
  req: AdminUpdateUserAttributesRequest
) => Promise<AdminUpdateUserAttributesResponse>;

export const AdminUpdateUserAttributes = ({
  cognitoClient,
}: Services): AdminUpdateUserAttributesTarget => async (req) => {
  const userPool = await cognitoClient.getUserPool(req.UserPoolId);
  const user = await userPool.getUserByUsername(req.Username);
  if (!user) {
    throw new NotAuthorizedError();
  }

  // TODO: Should save the attributes.
  return {
    UserAttributes: user.Attributes,
  };
};
