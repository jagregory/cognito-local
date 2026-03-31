import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import type { CognitoService } from "../services";
import { USER_POOL_AWS_DEFAULTS } from "../services/cognitoService";
import { DefaultConfig } from "../server/config";
import { CreateUserPool, type CreateUserPoolTarget } from "./createUserPool";

const originalDate = new Date();

describe("CreateUserPool target", () => {
  let createUserPool: CreateUserPoolTarget;
  let mockCognitoService: MockedObject<CognitoService>;

  beforeEach(() => {
    mockCognitoService = newMockCognitoService(newMockUserPoolService());
    createUserPool = CreateUserPool({
      cognito: mockCognitoService,
      clock: new ClockFake(originalDate),
      config: DefaultConfig,
    });
  });

  it("creates a new user pool", async () => {
    const createdUserPool = TDB.userPool();
    mockCognitoService.createUserPool.mockResolvedValue(createdUserPool);

    const result = await createUserPool(TestContext, {
      PoolName: "test-pool",
    });

    expect(mockCognitoService.createUserPool).toHaveBeenCalledWith(
      TestContext,
      {
        Arn: expect.stringMatching(
          /^arn:aws:cognito-idp:local:local:userpool\/local_[\w\d]{8}$/,
        ),
        CreationDate: originalDate,
        Id: expect.stringMatching(/^local_[\w\d]{8}$/),
        LastModifiedDate: originalDate,
        Name: "test-pool",
        SchemaAttributes: USER_POOL_AWS_DEFAULTS.SchemaAttributes,
      },
    );

    expect(result).toEqual({
      UserPool: createdUserPool,
    });
  });

  it("uses configured Region as pool ID prefix", async () => {
    mockCognitoService = newMockCognitoService(newMockUserPoolService());
    const regionCreateUserPool = CreateUserPool({
      cognito: mockCognitoService,
      clock: new ClockFake(originalDate),
      config: {
        ...DefaultConfig,
        TokenConfig: { Region: "us-east-1" },
      },
    });

    const createdUserPool = TDB.userPool();
    mockCognitoService.createUserPool.mockResolvedValue(createdUserPool);

    await regionCreateUserPool(TestContext, { PoolName: "test-pool" });

    expect(mockCognitoService.createUserPool).toHaveBeenCalledWith(
      TestContext,
      expect.objectContaining({
        Id: expect.stringMatching(/^us-east-1_[\w\d]{8}$/),
        Arn: expect.stringMatching(
          /^arn:aws:cognito-idp:us-east-1:local:userpool\/us-east-1_[\w\d]{8}$/,
        ),
      }),
    );
  });

  it("creates a new user pool with a custom attribute", async () => {
    const createdUserPool = TDB.userPool();
    mockCognitoService.createUserPool.mockResolvedValue(createdUserPool);

    const result = await createUserPool(TestContext, {
      PoolName: "test-pool",
      Schema: [
        {
          Name: "my_attribute",
          AttributeDataType: "String",
        },
      ],
    });

    expect(mockCognitoService.createUserPool).toHaveBeenCalledWith(
      TestContext,
      {
        Arn: expect.stringMatching(
          /^arn:aws:cognito-idp:local:local:userpool\/local_[\w\d]{8}$/,
        ),
        CreationDate: originalDate,
        Id: expect.stringMatching(/^local_[\w\d]{8}$/),
        LastModifiedDate: originalDate,
        Name: "test-pool",
        SchemaAttributes: [
          ...(USER_POOL_AWS_DEFAULTS.SchemaAttributes ?? []),
          {
            Name: "custom:my_attribute",
            AttributeDataType: "String",
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Required: false,
            StringAttributeConstraints: {},
          },
        ],
      },
    );

    expect(result).toEqual({
      UserPool: createdUserPool,
    });
  });

  it("creates a new user pool with an overridden attribute", async () => {
    const createdUserPool = TDB.userPool();
    mockCognitoService.createUserPool.mockResolvedValue(createdUserPool);

    const result = await createUserPool(TestContext, {
      PoolName: "test-pool",
      Schema: [
        {
          Name: "email",
          AttributeDataType: "String",
          Required: true,
        },
      ],
    });

    expect(mockCognitoService.createUserPool).toHaveBeenCalledWith(
      TestContext,
      {
        Arn: expect.stringMatching(
          /^arn:aws:cognito-idp:local:local:userpool\/local_[\w\d]{8}$/,
        ),
        CreationDate: originalDate,
        Id: expect.stringMatching(/^local_[\w\d]{8}$/),
        LastModifiedDate: originalDate,
        Name: "test-pool",
        SchemaAttributes: expect.any(Array),
      },
    );

    expect(result).toEqual({
      UserPool: createdUserPool,
    });
  });
});
