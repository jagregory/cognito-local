import { ResourceNotFoundError } from "../errors";
import { Logger } from "../log";
import { AppClient } from "./appClient";
import { Clock } from "./clock";
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
  private readonly clients: DataStore;
  private readonly clock: Clock;
  private readonly config: UserPool;
  private readonly createDataStore: CreateDataStore;
  private readonly createUserPoolClient: CreateUserPoolClient;
  private readonly logger: Logger;

  public static async create(
    userPoolDefaultOptions: UserPool,
    clock: Clock,
    createDataStore: CreateDataStore,
    createUserPoolClient: CreateUserPoolClient,
    logger: Logger
  ): Promise<CognitoClient> {
    const clients = await createDataStore("clients", { Clients: {} });

    return new CognitoClientService(
      clients,
      clock,
      userPoolDefaultOptions,
      createDataStore,
      createUserPoolClient,
      logger
    );
  }

  public constructor(
    clients: DataStore,
    clock: Clock,
    config: UserPool,
    createDataStore: CreateDataStore,
    createUserPoolClient: CreateUserPoolClient,
    logger: Logger
  ) {
    this.clients = clients;
    this.clock = clock;
    this.config = config;
    this.createDataStore = createDataStore;
    this.createUserPoolClient = createUserPoolClient;
    this.logger = logger;
  }

  public async getUserPool(userPoolId: string): Promise<UserPoolClient> {
    return this.createUserPoolClient(
      this.clients,
      this.clock,
      this.createDataStore,
      { ...this.config, Id: userPoolId },
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
      this.clients,
      this.clock,
      this.createDataStore,
      { ...this.config, Id: appClient.UserPoolId },
      this.logger
    );
  }

  public async getAppClient(clientId: string): Promise<AppClient | null> {
    return this.clients.get(["Clients", clientId]);
  }
}
