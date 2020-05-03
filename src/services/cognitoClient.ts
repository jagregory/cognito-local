import { ResourceNotFoundError } from "../errors";
import { AppClient } from "./appClient";
import { CreateDataStore } from "./dataStore";
import {
  CreateUserPoolClient,
  UserPool,
  UserPoolClient,
} from "./userPoolClient";

export interface CognitoClient {
  getUserPool(userPoolId: string): Promise<UserPoolClient>;
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
        clients,
        createDataStore
      );
    },

    async getUserPoolForClientId(clientId) {
      const appClient = await clients.get<AppClient>(`Clients.${clientId}`);
      if (!appClient) {
        throw new ResourceNotFoundError();
      }

      return createUserPoolClient(
        { ...userPoolDefaultOptions, Id: appClient.UserPoolId },
        clients,
        createDataStore
      );
    },
  };
};
