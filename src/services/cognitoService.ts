import * as path from "path";
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
import fs from "fs";
import { promisify } from "util";

const readdir = promisify(fs.readdir);

const CLIENTS_DATABASE_NAME = "clients";

export interface CognitoService {
  getAppClient(clientId: string): Promise<AppClient | null>;
  getUserPool(userPoolId: string): Promise<UserPoolService>;
  getUserPoolForClientId(clientId: string): Promise<UserPoolService>;
  listUserPools(): Promise<readonly UserPool[]>;
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
      CLIENTS_DATABASE_NAME,
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

  public async listUserPools(): Promise<readonly UserPool[]> {
    const entries = await readdir(this.dataDirectory, { withFileTypes: true });

    return Promise.all(
      entries
        .filter(
          (x) =>
            x.isFile() &&
            path.extname(x.name) === ".json" &&
            path.basename(x.name, path.extname(x.name)) !==
              CLIENTS_DATABASE_NAME
        )
        .map(async (x) => {
          const userPool = await this.getUserPool(
            path.basename(x.name, path.extname(x.name))
          );

          return userPool.config;
        })
    );
  }
}
