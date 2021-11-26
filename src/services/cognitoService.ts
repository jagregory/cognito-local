import * as path from "path";
import { ResourceNotFoundError } from "../errors";
import { Logger } from "../log";
import { UserPoolDefaults } from "../server/config";
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

// These defaults were pulled from Cognito on 2021-11-26 by creating a new User Pool with only a Name and
// capturing what defaults Cognito set on the pool.
//
// To recreate run: aws cognito-idp create-user-pool --pool-name testing
// and remove the Id, Arn, and Name from the response.
export const USER_POOL_AWS_DEFAULTS: UserPoolDefaults = {
  Policies: {
    PasswordPolicy: {
      MinimumLength: 8,
      RequireUppercase: true,
      RequireLowercase: true,
      RequireNumbers: true,
      RequireSymbols: true,
      TemporaryPasswordValidityDays: 7,
    },
  },
  LambdaConfig: {},
  SchemaAttributes: [
    {
      Name: "sub",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: false,
      Required: true,
      StringAttributeConstraints: {
        MinLength: "1",
        MaxLength: "2048",
      },
    },
    {
      Name: "name",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "given_name",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "family_name",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "middle_name",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "nickname",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "preferred_username",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "profile",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "picture",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "website",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "email",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "email_verified",
      AttributeDataType: "Boolean",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
    },
    {
      Name: "gender",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "birthdate",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "10",
        MaxLength: "10",
      },
    },
    {
      Name: "zoneinfo",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "locale",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "phone_number",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "phone_number_verified",
      AttributeDataType: "Boolean",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
    },
    {
      Name: "address",
      AttributeDataType: "String",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: "0",
        MaxLength: "2048",
      },
    },
    {
      Name: "updated_at",
      AttributeDataType: "Number",
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      NumberAttributeConstraints: {
        MinValue: "0",
      },
    },
  ],
  VerificationMessageTemplate: {
    DefaultEmailOption: "CONFIRM_WITH_CODE",
  },
  MfaConfiguration: "OFF",
  EstimatedNumberOfUsers: 0,
  EmailConfiguration: {
    EmailSendingAccount: "COGNITO_DEFAULT",
  },
  AdminCreateUserConfig: {
    AllowAdminCreateUserOnly: false,
    UnusedAccountValidityDays: 7,
  },
};

export interface CognitoService {
  createUserPool(userPool: UserPool): Promise<UserPool>;
  getAppClient(clientId: string): Promise<AppClient | null>;
  getUserPool(userPoolId: string): Promise<UserPoolService>;
  getUserPoolForClientId(clientId: string): Promise<UserPoolService>;
  listUserPools(): Promise<readonly UserPool[]>;
}

export class CognitoServiceImpl implements CognitoService {
  private readonly clients: DataStore;
  private readonly clock: Clock;
  private readonly createDataStore: CreateDataStore;
  private readonly createUserPoolClient: CreateUserPoolService;
  private readonly dataDirectory: string;
  private readonly logger: Logger;
  private readonly userPoolDefaultConfig: UserPoolDefaults;

  public static async create(
    dataDirectory: string,
    userPoolDefaultConfig: UserPoolDefaults,
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
    userPoolDefaultConfig: UserPoolDefaults,
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

  public async createUserPool(userPool: UserPool): Promise<UserPool> {
    const service = await this.createUserPoolClient(
      this.dataDirectory,
      this.clients,
      this.clock,
      this.createDataStore,
      {
        ...USER_POOL_AWS_DEFAULTS,
        ...this.userPoolDefaultConfig,
        ...userPool,
      },
      this.logger
    );

    return service.config;
  }

  public async getUserPool(userPoolId: string): Promise<UserPoolService> {
    return this.createUserPoolClient(
      this.dataDirectory,
      this.clients,
      this.clock,
      this.createDataStore,
      {
        ...USER_POOL_AWS_DEFAULTS,
        ...this.userPoolDefaultConfig,
        Id: userPoolId,
      },
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
      {
        ...USER_POOL_AWS_DEFAULTS,
        ...this.userPoolDefaultConfig,
        Id: appClient.UserPoolId,
      },
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
