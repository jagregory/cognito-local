import { ResourceNotFoundError } from "../errors";
import { CreateDataStore } from "./dataStore";
import {
  CreateUserPoolClient,
  UserPool,
  UserPoolClient,
} from "./userPoolClient";

export interface CognitoClient {
  getUserPool(userPoolId: string): Promise<UserPoolClient | null>;
  getUserPoolForClientId(clientId: string): Promise<UserPoolClient>;
}

export const createCognitoClient = async (
  userPoolDefaultOptions: UserPool,
  createDataStore: CreateDataStore,
  createUserPoolClient: CreateUserPoolClient
): Promise<CognitoClient> => {
  const clients = await createDataStore("clients", { Clients: {} });

  return {
    async getUserPool(userPoolId) {
      return createUserPoolClient(
        { ...userPoolDefaultOptions, Id: userPoolId },
        createDataStore
      );
    },

    async getUserPoolForClientId(clientId) {
      const userPoolId = await clients.get<string>(`Clients.${clientId}`);
      if (!userPoolId) {
        throw new ResourceNotFoundError();
      }

      return createUserPoolClient(
        { ...userPoolDefaultOptions, Id: userPoolId },
        createDataStore
      );
    },
  };
};
