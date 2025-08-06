import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import * as path from "node:path";
import mergeWith from "lodash.mergewith";
import { ResourceNotFoundError } from "../errors";
import type { UserPoolDefaults } from "../server/config";
import type { AppClient } from "./appClient";
import type { Context } from "./context";
import type { DataStore } from "./dataStore/dataStore";
import type { DataStoreFactory } from "./dataStore/factory";
import type {
  UserPool,
  UserPoolService,
  UserPoolServiceFactory,
} from "./userPoolService";

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
    clientId: string,
  ): Promise<UserPoolService>;
  listAppClients(
    ctx: Context,
    userPoolId: string,
  ): Promise<readonly AppClient[]>;
  listUserPools(ctx: Context): Promise<readonly UserPool[]>;
}

export interface CognitoServiceFactory {
  create(
    ctx: Context,
    userPoolDefaultConfig: UserPoolDefaults,
  ): Promise<CognitoService>;
}

class NotInitializedError extends Error {
  public constructor() {
    super("Not initialized, CognitoServiceImpl.init() must be called first");
  }
}

export class CognitoServiceImpl implements CognitoService {
  private readonly clients: DataStore;
  private readonly userPoolServiceFactory: UserPoolServiceFactory;
  private readonly dataDirectory: string;
  private readonly userPoolDefaultConfig: UserPoolDefaults;
  private userPools: UserPoolService[] | undefined;

  public constructor(
    dataDirectory: string,
    clients: DataStore,
    userPoolDefaultConfig: UserPoolDefaults,
    userPoolServiceFactory: UserPoolServiceFactory,
  ) {
    this.clients = clients;
    this.dataDirectory = dataDirectory;
    this.userPoolDefaultConfig = userPoolDefaultConfig;
    this.userPoolServiceFactory = userPoolServiceFactory;
  }

  public async createUserPool(
    ctx: Context,
    userPool: UserPool,
  ): Promise<UserPool> {
    ctx.logger.debug("CognitoServiceImpl.createUserPool");

    if (!this.userPools) {
      throw new NotInitializedError();
    }

    const service = await this.userPoolServiceFactory.create(
      ctx,
      this.clients,
      mergeWith(
        {},
        USER_POOL_AWS_DEFAULTS,
        this.userPoolDefaultConfig,
        userPool,
      ),
    );

    this.userPools.push(service);

    return service.options;
  }

  public async deleteUserPool(ctx: Context, userPool: UserPool): Promise<void> {
    ctx.logger.debug(
      { userPoolId: userPool.Id },
      "CognitoServiceImpl.deleteUserPool",
    );

    if (!this.userPools) {
      throw new NotInitializedError();
    }

    await fs.rm(path.join(this.dataDirectory, `${userPool.Id}.json`));
    this.userPools = this.userPools.filter((x) => x.options.Id !== userPool.Id);
  }

  public getUserPool(
    ctx: Context,
    userPoolId: string,
  ): Promise<UserPoolService> {
    ctx.logger.debug({ userPoolId }, "CognitoServiceImpl.getUserPool");
    if (!this.userPools) {
      throw new NotInitializedError();
    }

    const userPool = this.userPools.find((x) => x.options.Id === userPoolId);
    if (!userPool) {
      throw new ResourceNotFoundError(`User Pool ${userPoolId} not found`);
    }

    return Promise.resolve(userPool);
  }

  public async getUserPoolForClientId(
    ctx: Context,
    clientId: string,
  ): Promise<UserPoolService> {
    ctx.logger.debug({ clientId }, "CognitoServiceImpl.getUserPoolForClientId");
    if (!this.userPools) {
      throw new NotInitializedError();
    }

    const appClient = await this.getAppClient(ctx, clientId);
    if (!appClient) {
      throw new ResourceNotFoundError(`App Client ${clientId} not found`);
    }

    const userPool = this.userPools.find(
      (x) => x.options.Id === appClient.UserPoolId,
    );
    if (!userPool) {
      throw new ResourceNotFoundError(
        `User Pool ${appClient.UserPoolId} not found`,
      );
    }

    return userPool;
  }

  public async getAppClient(
    ctx: Context,
    clientId: string,
  ): Promise<AppClient | null> {
    ctx.logger.debug({ clientId }, "CognitoServiceImpl.getAppClient");
    return this.clients.get(ctx, ["Clients", clientId]);
  }

  public async listAppClients(
    ctx: Context,
    userPoolId: string,
  ): Promise<readonly AppClient[]> {
    ctx.logger.debug({ userPoolId }, "CognitoServiceImpl.listAppClients");
    const clients = await this.clients.get<Record<string, AppClient>>(
      ctx,
      "Clients",
      {},
    );

    return Object.values(clients).filter((x) => x.UserPoolId === userPoolId);
  }

  public listUserPools(ctx: Context): Promise<readonly UserPool[]> {
    ctx.logger.debug("CognitoServiceImpl.listUserPools");
    if (!this.userPools) {
      throw new NotInitializedError();
    }

    return Promise.resolve(this.userPools.map((x) => x.options));
  }

  public async init(ctx: Context) {
    function userPoolIdFromDirent(x: Dirent) {
      return path.basename(x.name, path.extname(x.name));
    }

    ctx.logger.debug("CognitoServiceImpl.init");
    const entries = await fs.readdir(this.dataDirectory, {
      withFileTypes: true,
    });

    this.userPools = await Promise.all(
      entries
        .filter(
          (x) =>
            x.isFile() &&
            path.extname(x.name) === ".json" &&
            userPoolIdFromDirent(x) !== CLIENTS_DATABASE_NAME,
        )
        .map(async (x) =>
          this.userPoolServiceFactory.create(ctx, this.clients, {
            ...USER_POOL_AWS_DEFAULTS,
            ...this.userPoolDefaultConfig,
            Id: userPoolIdFromDirent(x),
          }),
        ),
    );
  }
}

export class CognitoServiceFactoryImpl implements CognitoServiceFactory {
  private readonly dataDirectory: string;
  private readonly dataStoreFactory: DataStoreFactory;
  private readonly userPoolServiceFactory: UserPoolServiceFactory;

  public constructor(
    dataDirectory: string,
    dataStoreFactory: DataStoreFactory,
    userPoolServiceFactory: UserPoolServiceFactory,
  ) {
    this.dataDirectory = dataDirectory;
    this.dataStoreFactory = dataStoreFactory;
    this.userPoolServiceFactory = userPoolServiceFactory;
  }

  public async create(
    ctx: Context,
    userPoolDefaultConfig: UserPoolDefaults,
  ): Promise<CognitoService> {
    const clients = await this.dataStoreFactory.create(
      ctx,
      CLIENTS_DATABASE_NAME,
      { Clients: {} },
    );

    const cognitoService = new CognitoServiceImpl(
      this.dataDirectory,
      clients,
      userPoolDefaultConfig,
      this.userPoolServiceFactory,
    );

    await cognitoService.init(ctx);

    return cognitoService;
  }
}
