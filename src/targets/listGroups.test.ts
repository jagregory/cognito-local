import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { newMockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UserPoolClient } from "../services";
import { ListGroups, ListGroupsTarget } from "./listGroups";
import * as TDB from "../__tests__/testDataBuilder";

describe("ListGroups target", () => {
  let listGroups: ListGroupsTarget;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;

  beforeEach(() => {
    mockUserPoolClient = newMockUserPoolClient();
    listGroups = ListGroups({
      cognitoClient: newMockCognitoClient(mockUserPoolClient),
    });
  });

  it("lists groups", async () => {
    const group1 = TDB.group();
    const group2 = TDB.group();

    mockUserPoolClient.listGroups.mockResolvedValue([group1, group2]);

    const output = await listGroups({
      UserPoolId: "userPoolId",
    });

    expect(output).toBeDefined();
    expect(output.Groups).toEqual([
      {
        CreationDate: new Date(group1.CreationDate),
        GroupName: group1.GroupName,
        LastModifiedDate: new Date(group1.LastModifiedDate),
        UserPoolId: "userPoolId",
      },
      {
        CreationDate: new Date(group2.CreationDate),
        GroupName: group2.GroupName,
        LastModifiedDate: new Date(group2.LastModifiedDate),
        UserPoolId: "userPoolId",
      },
    ]);
  });

  it.todo("supports Limit to specify the number of groups to return");
  it.todo("supports PaginationToken to paginate results");
});
