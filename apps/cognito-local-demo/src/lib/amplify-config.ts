import type { ResourcesConfig } from "aws-amplify";

const useCognitoLocal = process.env.NEXT_PUBLIC_USE_COGNITO_LOCAL === "true";

export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID!,
      ...(useCognitoLocal && {
        userPoolEndpoint: process.env.NEXT_PUBLIC_COGNITO_LOCAL_ENDPOINT,
      }),
    },
  },
};
