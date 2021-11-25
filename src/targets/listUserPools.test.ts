import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import * as TDB from "../__tests__/testDataBuilder";
import { CognitoService } from "../services";
import { ListUserPools, ListUserPoolsTarget } from "./listUserPools";

describe("ListUserPools target", () => {
  let listUserPools: ListUserPoolsTarget;
  let mockCognitoService: jest.Mocked<CognitoService>;

  beforeEach(() => {
    mockCognitoService = newMockCognitoService(newMockUserPoolService());
    listUserPools = ListUserPools({
      cognito: mockCognitoService,
    });
  });

  it("lists user pools", async () => {
    const userPool1 = TDB.userPool();
    const userPool2 = TDB.userPool();

    mockCognitoService.listUserPools.mockResolvedValue([userPool1, userPool2]);

    const output = await listUserPools({
      MaxResults: 10,
    });

    expect(output).toBeDefined();
    expect(output.UserPools).toEqual([
      {
        Id: userPool1.Id,
      },
      {
        Id: userPool2.Id,
      },
    ]);
  });
});
