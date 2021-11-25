import { CognitoClient, UserPoolClient } from "../services";

export const newMockCognitoClient = (
  userPoolClient: UserPoolClient
): jest.Mocked<CognitoClient> => ({
  getAppClient: jest.fn(),
  getUserPool: jest.fn().mockResolvedValue(userPoolClient),
  getUserPoolForClientId: jest.fn().mockResolvedValue(userPoolClient),
});
