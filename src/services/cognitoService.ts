import { ResourceNotFoundError } from "../errors";
import { Logger } from "../log";
import { AppClient } from "./appClient";
import { Clock } from "./clock";
import { CreateDataStore, DataStore } from "./dataStore";
import {
  CreateUserPoolService,
  UserPool,
  UserPoolService,
} from "./userPoolService";

export interface CognitoService {
  getAppClient(clientId: string): Promise<AppClient | null>;
  getUserPool(userPoolId: string): Promise<UserPoolService>;
  getUserPoolForClientId(clientId: string): Promise<UserPoolService>;
}

type UserPoolDefaultConfig = Omit<UserPool, "Id">;

export class CognitoServiceImpl implements CognitoService {
  private readonly clients: DataStore;
  private readonly clock: Clock;
  private readonly createDataStore: CreateDataStore;
  private readonly createUserPoolClient: CreateUserPoolService;
  private readonly dataDirectory: string;
  private readonly logger: Logger;
  private readonly userPoolDefaultConfig: UserPoolDefaultConfig;

  public static async create(
    dataDirectory: string,
    userPoolDefaultConfig: UserPool,
    clock: Clock,
    createDataStore: CreateDataStore,
    createUserPoolClient: CreateUserPoolService,
    logger: Logger
  ): Promise<CognitoService> {
    const clients = await createDataStore(
      "clients",
      { Clients: {} },
      dataDirectory
    );

    return new CognitoServiceImpl(
      dataDirectory,
      clients,
      clock,
      userPoolDefaultConfig,
      createDataStore,
      createUserPoolClient,
      logger
    );
  }

  public constructor(
    dataDirectory: string,
    clients: DataStore,
    clock: Clock,
    userPoolDefaultConfig: UserPoolDefaultConfig,
    createDataStore: CreateDataStore,
    createUserPoolClient: CreateUserPoolService,
    logger: Logger
  ) {
    this.clients = clients;
    this.clock = clock;
    this.createDataStore = createDataStore;
    this.createUserPoolClient = createUserPoolClient;
    this.dataDirectory = dataDirectory;
    this.logger = logger;
    this.userPoolDefaultConfig = userPoolDefaultConfig;
  }

  public async getUserPool(userPoolId: string): Promise<UserPoolService> {
    return this.createUserPoolClient(
      this.dataDirectory,
      this.clients,
      this.clock,
      this.createDataStore,
      { ...this.userPoolDefaultConfig, Id: userPoolId },
      this.logger
    );
  }

  public async getUserPoolForClientId(
    clientId: string
  ): Promise<UserPoolService> {
    const appClient = await this.getAppClient(clientId);
    if (!appClient) {
      throw new ResourceNotFoundError();
    }

    return this.createUserPoolClient(
      this.dataDirectory,
      this.clients,
      this.clock,
      this.createDataStore,
      { ...this.userPoolDefaultConfig, Id: appClient.UserPoolId },
      this.logger
    );
  }

  public async getAppClient(clientId: string): Promise<AppClient | null> {
    return this.clients.get(["Clients", clientId]);
  }
}
