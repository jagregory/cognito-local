import { MockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { CognitoClient } from "../services";
import { ListGroups, ListGroupsTarget } from "./listGroups";

describe("ListGroups target", () => {
  let listGroups: ListGroupsTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);

    mockCognitoClient = {
      getAppClient: jest.fn(),
      getUserPool: jest.fn().mockResolvedValue(MockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(MockUserPoolClient),
    };

    listGroups = ListGroups({
      cognitoClient: mockCognitoClient,
    });
  });

  it("lists groups", async () => {
    MockUserPoolClient.listGroups.mockResolvedValue([
      {
        CreationDate: now.getTime(),
        Description: "Description",
        GroupName: "abc",
        LastModifiedDate: now.getTime(),
        Precedence: 1,
        RoleArn: "ARN",
      },
      {
        CreationDate: now.getTime(),
        GroupName: "def",
        LastModifiedDate: now.getTime(),
      },
    ]);

    const output = await listGroups({
      UserPoolId: "userPoolId",
    });

    expect(output).toBeDefined();
    expect(output.Groups).toEqual([
      {
        CreationDate: now,
        Description: "Description",
        GroupName: "abc",
        LastModifiedDate: now,
        Precedence: 1,
        RoleArn: "ARN",
        UserPoolId: "userPoolId",
      },
      {
        CreationDate: now,
        GroupName: "def",
        LastModifiedDate: now,
        UserPoolId: "userPoolId",
      },
    ]);
  });

  it.todo("supports Limit to specify the number of groups to return");
  it.todo("supports PaginationToken to paginate results");
});
