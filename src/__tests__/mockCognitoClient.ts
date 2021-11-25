import { CognitoClient } from "../services";
import { MockUserPoolClient } from "./mockUserPoolClient";

export const newMockCognitoClient = (): jest.Mocked<CognitoClient> => ({
  getAppClient: jest.fn(),
  getUserPool: jest.fn().mockResolvedValue(MockUserPoolClient),
  getUserPoolForClientId: jest.fn().mockResolvedValue(MockUserPoolClient),
});
