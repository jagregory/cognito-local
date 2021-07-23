import { ResourceNotFoundError } from "../errors";
import { Logger } from "../log";
import { AppClient } from "./appClient";
import { CreateDataStore, DataStore } from "./dataStore";
import {
  CreateUserPoolClient,
  UserPool,
  UserPoolClient,
} from "./userPoolClient";

export interface CognitoClient {
  getAppClient(clientId: string): Promise<AppClient | null>;
  getUserPool(userPoolId: string): Promise<UserPoolClient>;
  getUserPoolForClientId(clientId: string): Promise<UserPoolClient>;
}

export class CognitoClientService implements CognitoClient {
  private readonly config: UserPool;
  private readonly clients: DataStore;
  private readonly createDataStore: CreateDataStore;
  private readonly createUserPoolClient: CreateUserPoolClient;
  private readonly logger: Logger;

  public static async create(
    userPoolDefaultOptions: UserPool,
    createDataStore: CreateDataStore,
    createUserPoolClient: CreateUserPoolClient,
    logger: Logger
  ): Promise<CognitoClient> {
    const clients = await createDataStore("clients", { Clients: {} });

    return new CognitoClientService(
      userPoolDefaultOptions,
      clients,
      createDataStore,
      createUserPoolClient,
      logger
    );
  }

  public constructor(
    config: UserPool,
    clients: DataStore,
    createDataStore: CreateDataStore,
    createUserPoolClient: CreateUserPoolClient,
    logger: Logger
  ) {
    this.config = config;
    this.clients = clients;
    this.createDataStore = createDataStore;
    this.createUserPoolClient = createUserPoolClient;
    this.logger = logger;
  }

  public async getUserPool(userPoolId: string): Promise<UserPoolClient> {
    return this.createUserPoolClient(
      { ...this.config, Id: userPoolId },
      this.clients,
      this.createDataStore,
      this.logger
    );
  }

  public async getUserPoolForClientId(
    clientId: string
  ): Promise<UserPoolClient> {
    const appClient = await this.getAppClient(clientId);
    if (!appClient) {
      throw new ResourceNotFoundError();
    }

    return this.createUserPoolClient(
      { ...this.config, Id: appClient.UserPoolId },
      this.clients,
      this.createDataStore,
      this.logger
    );
  }

  public async getAppClient(clientId: string): Promise<AppClient | null> {
    return this.clients.get(["Clients", clientId]);
  }
}
