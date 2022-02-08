import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";

import { CognitoService } from "../services";
import { ListUserPools, ListUserPoolsTarget } from "./listUserPools";
import { UserPoolModel } from "../models/UserPoolModel";

describe("ListUserPools target", () => {
  let listUserPools: ListUserPoolsTarget;
  let mockCognitoService: jest.Mocked<CognitoService>;

  beforeEach(() => {
    mockCognitoService = MockCognitoService(MockUserPoolService());
    listUserPools = ListUserPools({
      cognito: mockCognitoService,
    });
  });

  it("lists user pools", async () => {
    const userPool1 = UserPoolModel();
    const userPool2 = UserPoolModel();

    mockCognitoService.listUserPools.mockResolvedValue([userPool1, userPool2]);

    const output = await listUserPools(MockContext, {
      MaxResults: 10,
    });

    expect(output).toBeDefined();
    expect(output.UserPools).toEqual([userPool1, userPool2]);
  });
});
