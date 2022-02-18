import mergeWith from "lodash.mergewith";
import * as path from "path";
import { ResourceNotFoundError } from "../errors";
import { UserPoolDefaults } from "../server/config";
import { AppClient } from "./appClient";
import { Clock } from "./clock";
import { Context } from "./context";
import { DataStore } from "./dataStore/dataStore";
import { DataStoreFactory } from "./dataStore/factory";
import {
  UserPool,
  UserPoolService,
  UserPoolServiceFactory,
} from "./userPoolService";
import fs from "fs/promises";

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
  createUserPool(ctx: Context, userPool: UserPool): Promise<UserPool>;
  deleteUserPool(ctx: Context, userPool: UserPool): Promise<void>;
  getAppClient(ctx: Context, clientId: string): Promise<AppClient | null>;
  getUserPool(ctx: Context, userPoolId: string): Promise<UserPoolService>;
  getUserPoolForClientId(
    ctx: Context,
    clientId: string
  ): Promise<UserPoolService>;
  listAppClients(
    ctx: Context,
    userPoolId: string
  ): Promise<readonly AppClient[]>;
  listUserPools(ctx: Context): Promise<readonly UserPool[]>;
}

export interface CognitoServiceFactory {
  create(
    ctx: Context,
    userPoolDefaultConfig: UserPoolDefaults
  ): Promise<CognitoService>;
}

export class CognitoServiceImpl implements CognitoService {
  private readonly clients: DataStore;
  private readonly clock: Clock;
  private readonly userPoolServiceFactory: UserPoolServiceFactory;
  private readonly dataDirectory: string;
  private readonly userPoolDefaultConfig: UserPoolDefaults;

  public constructor(
    dataDirectory: string,
    clients: DataStore,
    clock: Clock,
    userPoolDefaultConfig: UserPoolDefaults,
    userPoolServiceFactory: UserPoolServiceFactory
  ) {
    this.clients = clients;
    this.clock = clock;
    this.dataDirectory = dataDirectory;
    this.userPoolDefaultConfig = userPoolDefaultConfig;
    this.userPoolServiceFactory = userPoolServiceFactory;
  }

  public async createUserPool(
    ctx: Context,
    userPool: UserPool
  ): Promise<UserPool> {
    ctx.logger.debug("CognitoServiceImpl.createUserPool");
    const service = await this.userPoolServiceFactory.create(
      ctx,
      this.clients,
      mergeWith(
        {},
        USER_POOL_AWS_DEFAULTS,
        this.userPoolDefaultConfig,
        userPool
      )
    );

    return service.options;
  }

  public async deleteUserPool(ctx: Context, userPool: UserPool): Promise<void> {
    ctx.logger.debug(
      { userPoolId: userPool.Id },
      "CognitoServiceImpl.deleteUserPool"
    );
    await fs.rm(path.join(this.dataDirectory, `${userPool.Id}.json`));
  }

  public async getUserPool(
    ctx: Context,
    userPoolId: string
  ): Promise<UserPoolService> {
    ctx.logger.debug({ userPoolId }, "CognitoServiceImpl.getUserPool");
    return this.userPoolServiceFactory.create(ctx, this.clients, {
      ...USER_POOL_AWS_DEFAULTS,
      ...this.userPoolDefaultConfig,
      Id: userPoolId,
    });
  }

  public async getUserPoolForClientId(
    ctx: Context,
    clientId: string
  ): Promise<UserPoolService> {
    ctx.logger.debug({ clientId }, "CognitoServiceImpl.getUserPoolForClientId");
    const appClient = await this.getAppClient(ctx, clientId);
    if (!appClient) {
      throw new ResourceNotFoundError();
    }

    return this.userPoolServiceFactory.create(ctx, this.clients, {
      ...USER_POOL_AWS_DEFAULTS,
      ...this.userPoolDefaultConfig,
      Id: appClient.UserPoolId,
    });
  }

  public async getAppClient(
    ctx: Context,
    clientId: string
  ): Promise<AppClient | null> {
    ctx.logger.debug({ clientId }, "CognitoServiceImpl.getAppClient");
    return this.clients.get(ctx, ["Clients", clientId]);
  }

  public async listAppClients(
    ctx: Context,
    userPoolId: string
  ): Promise<readonly AppClient[]> {
    ctx.logger.debug({ userPoolId }, "CognitoServiceImpl.listAppClients");
    const clients = await this.clients.get<Record<string, AppClient>>(
      ctx,
      "Clients",
      {}
    );

    return Object.values(clients).filter((x) => x.UserPoolId === userPoolId);
  }

  public async listUserPools(ctx: Context): Promise<readonly UserPool[]> {
    ctx.logger.debug("CognitoServiceImpl.listUserPools");
    const entries = await fs.readdir(this.dataDirectory, {
      withFileTypes: true,
    });

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
            ctx,
            path.basename(x.name, path.extname(x.name))
          );

          return userPool.options;
        })
    );
  }
}

export class CognitoServiceFactoryImpl implements CognitoServiceFactory {
  private readonly dataDirectory: string;
  private readonly clock: Clock;
  private readonly dataStoreFactory: DataStoreFactory;
  private readonly userPoolServiceFactory: UserPoolServiceFactory;

  public constructor(
    dataDirectory: string,
    clock: Clock,
    dataStoreFactory: DataStoreFactory,
    userPoolServiceFactory: UserPoolServiceFactory
  ) {
    this.dataDirectory = dataDirectory;
    this.clock = clock;
    this.dataStoreFactory = dataStoreFactory;
    this.userPoolServiceFactory = userPoolServiceFactory;
  }

  public async create(
    ctx: Context,
    userPoolDefaultConfig: UserPoolDefaults
  ): Promise<CognitoService> {
    const clients = await this.dataStoreFactory.create(
      ctx,
      CLIENTS_DATABASE_NAME,
      { Clients: {} }
    );

    return new CognitoServiceImpl(
      this.dataDirectory,
      clients,
      this.clock,
      userPoolDefaultConfig,
      this.userPoolServiceFactory
    );
  }
}
