# Cognito Local

![CI](https://github.com/jagregory/cognito-local/workflows/CI/badge.svg)

A _Good Enough_ offline emulator for [Amazon Cognito](https://aws.amazon.com/cognito/).

<!-- toc -->

- [Supported Features](#supported-features)
  - [Lambda triggers](#lambda-triggers)
- [Usage](#usage)
  - [via Docker](#via-docker)
  - [via Node](#via-node)
  - [Using a different port](#using-a-different-port)
  - [Updating your application](#updating-your-application)
  - [Creating your first User Pool](#creating-your-first-user-pool)
- [Configuration](#configuration)
  - [HTTPS endpoints with self-signed certificates](#https-endpoints-with-self-signed-certificates)
  - [User Pools and Clients](#user-pools-and-clients)
- [Known Limitations](#known-limitations)
- [Multi-factor authentication](#multi-factor-authentication)
- [Confirmation codes](#confirmation-codes)
- [Advanced](#advanced)
  - [Debugging Cognito Local](#debugging-cognito-local)

<!-- tocstop -->

## Supported Features

| Feature                          | Support              |
| -------------------------------- | -------------------- |
| AddCustomAttributes              | ❌                   |
| AdminAddUserToGroup              | ❌                   |
| AdminConfirmSignUp               | ✅                   |
| AdminCreateUser                  | 🕒 (partial support) |
| AdminDeleteUser                  | ✅                   |
| AdminDeleteUserAttributes        | ❌                   |
| AdminDisableProviderForUser      | ❌                   |
| AdminDisableUser                 | ❌                   |
| AdminEnableUser                  | ❌                   |
| AdminForgetDevice                | ❌                   |
| AdminGetDevice                   | ❌                   |
| AdminGetUser                     | ✅                   |
| AdminInitiateAuth                | 🕒 (partial support) |
| AdminLinkProviderForUser         | ❌                   |
| AdminListDevices                 | ❌                   |
| AdminListGroupsForUser           | ❌                   |
| AdminListUserAuthEvents          | ❌                   |
| AdminRemoveUserFromGroup         | ❌                   |
| AdminResetUserPassword           | ❌                   |
| AdminRespondToAuthChallenge      | ❌                   |
| AdminSetUserMFAPreference        | ❌                   |
| AdminSetUserPassword             | ✅                   |
| AdminSetUserSettings             | ❌                   |
| AdminUpdateAuthEventFeedback     | ❌                   |
| AdminUpdateDeviceStatus          | ❌                   |
| AdminUpdateUserAttributes        | ✅                   |
| AdminUserGlobalSignOut           | ❌                   |
| AssociateSoftwareToken           | ❌                   |
| ChangePassword                   | 🕒 (partial support) |
| ConfirmDevice                    | ❌                   |
| ConfirmForgotPassword            | 🕒 (partial support) |
| ConfirmSignUp                    | 🕒 (partial support) |
| CreateGroup                      | ✅                   |
| CreateIdentityProvider           | ❌                   |
| CreateResourceServer             | ❌                   |
| CreateUserImportJob              | ❌                   |
| CreateUserPool                   | ✅                   |
| CreateUserPoolClient             | 🕒 (partial support) |
| CreateUserPoolDomain             | ❌                   |
| DeleteGroup                      | ❌                   |
| DeleteIdentityProvider           | ❌                   |
| DeleteResourceServer             | ❌                   |
| DeleteUser                       | ✅                   |
| DeleteUserAttributes             | ❌                   |
| DeleteUserPool                   | ❌                   |
| DeleteUserPoolClient             | ❌                   |
| DeleteUserPoolDomain             | ❌                   |
| DescribeIdentityProvider         | ❌                   |
| DescribeResourceServer           | ❌                   |
| DescribeRiskConfiguration        | ❌                   |
| DescribeUserImportJob            | ❌                   |
| DescribeUserPool                 | ❌                   |
| DescribeUserPoolClient           | ✅                   |
| DescribeUserPoolDomain           | ❌                   |
| ForgetDevice                     | ❌                   |
| ForgotPassword                   | 🕒 (partial support) |
| GetCSVHeader                     | ❌                   |
| GetDevice                        | ❌                   |
| GetGroup                         | ❌                   |
| GetIdentityProviderByIdentifier  | ❌                   |
| GetSigningCertificate            | ❌                   |
| GetUICustomization               | ❌                   |
| GetUser                          | ✅                   |
| GetUserAttributeVerificationCode | ❌                   |
| GetUserPoolMfaConfig             | ❌                   |
| GlobalSignOut                    | ❌                   |
| InitiateAuth                     | 🕒 (partial support) |
| ListDevices                      | ❌                   |
| ListGroups                       | ✅¹                  |
| ListIdentityProviders            | ❌                   |
| ListResourceServers              | ❌                   |
| ListTagsForResource              | ❌                   |
| ListUserImportJobs               | ❌                   |
| ListUserPoolClients              | ❌                   |
| ListUserPools                    | ✅¹                  |
| ListUsers                        | ✅¹                  |
| ListUsersInGroup                 | ❌                   |
| ResendConfirmationCode           | ❌                   |
| RespondToAuthChallenge           | 🕒 (partial support) |
| RevokeToken                      | 🕒 (partial support) |
| SetRiskConfiguration             | ❌                   |
| SetUICustomization               | ❌                   |
| SetUserMFAPreference             | ❌                   |
| SetUserPoolMfaConfig             | ❌                   |
| SetUserSettings                  | ❌                   |
| SignUp                           | 🕒 (partial support) |
| StartUserImportJob               | ❌                   |
| StopUserImportJob                | ❌                   |
| TagResource                      | ❌                   |
| UntagResource                    | ❌                   |
| UpdateAuthEventFeedback          | ❌                   |
| UpdateDeviceStatus               | ❌                   |
| UpdateGroup                      | ❌                   |
| UpdateIdentityProvider           | ❌                   |
| UpdateResourceServer             | ❌                   |
| UpdateUserAttributes             | ❌                   |
| UpdateUserPool                   | ❌                   |
| UpdateUserPoolClient             | ❌                   |
| UpdateUserPoolDomain             | ❌                   |
| VerifySoftwareToken              | ❌                   |
| VerifyUserAttribute              | ✅                   |

> ¹ does not support pagination or query filters, all results and attributes will be returned in the first request.

Additional supported features:

- JWKs verification

### Lambda triggers

cognito-local can emulate Cognito's [Lambda Triggers](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html)
by either invoking a real Lambda in an AWS account or a Lambda running on your local machine (via any tool which
supports the `LambdaInvoke` functionality, for example
[serverless-offline](https://github.com/dherault/serverless-offline)).

To configure a Lambda Trigger, modify your [configuration file](#configuration) to include a `TriggerFunctions` object
with a key for the Trigger and the value as your Lambda function name.

```json
{
  "TriggerFunctions": {
    "CustomMessage": "my-function-name"
  }
}
```

If you're using local invoke, you will also need to modify the `LambdaClient.endpoint` configuration to tell
cognito-local how to connect to your local Lambda server:

```json
{
  "LambdaClient": {
    "endpoint": "http://host:port"
  },
  "TriggerFunctions": {
    "CustomMessage": "my-local-function-name"
  }
}
```

> If you're running cognito-local in Docker and your local Lambda functions on your host, you may need to use the Docker
> local networking hostname as your endpoint. For example, on my Mac I use `http://host.docker.internal:3002`.

#### Supported Lambda Triggers

| Trigger                     | Operation                            | Support |
| --------------------------- | ------------------------------------ | ------- |
| CreateAuthChallenge         | \*                                   | ❌      |
| CustomEmailSender           | \*                                   | ❌      |
| CustomMessage               | AdminCreateUser                      | ✅      |
| CustomMessage               | Authentication                       | ✅      |
| CustomMessage               | ForgotPassword                       | ✅      |
| CustomMessage               | ResendCode                           | ❌      |
| CustomMessage               | SignUp                               | ✅      |
| CustomMessage               | UpdateUserAttribute                  | ❌      |
| CustomMessage               | VerifyUserAttribute                  | ❌      |
| DefineAuthChallenge         | \*                                   | ❌      |
| PostAuthentication          | PostAuthentication_Authentication    | ✅      |
| PostConfirmation            | ConfirmForgotPassword                | ✅      |
| PostConfirmation            | ConfirmSignUp                        | ✅      |
| PreAuthentication           | \*                                   | ❌      |
| PreSignUp                   | PreSignUp_AdminCreateUser            | ❌      |
| PreSignUp                   | PreSignUp_ExternalProvider           | ❌      |
| PreSignUp                   | PreSignUp_SignUp                     | ✅      |
| PreTokenGeneration          | TokenGeneration_AuthenticateDevice   | ❌      |
| PreTokenGeneration          | TokenGeneration_Authentication       | ✅      |
| PreTokenGeneration          | TokenGeneration_HostedAuth           | ❌      |
| PreTokenGeneration          | TokenGeneration_NewPasswordChallenge | ❌      |
| PreTokenGeneration          | TokenGeneration_RefreshTokens        | ✅      |
| UserMigration               | Authentication                       | ✅      |
| UserMigration               | ForgotPassword                       | ❌      |
| VerifyAuthChallengeResponse | \*                                   | ❌      |

#### Known limitations

1. Incomplete support for triggers
2. Triggers can only be configured globally and not per-pool

## Usage

### via Docker

    docker run --publish 9229:9229 jagregory/cognito-local:latest

Cognito Local will now be listening on `http://localhost:9229`.

To persist your database between runs, mount the `/app/.cognito` volume to your host machine:

    docker run --publish 9229:9229 --volume $(pwd)/.cognito:/app/.cognito jagregory/cognito-local:latest

### via Node

    npm install --save-dev cognito-local
    yarn add --dev cognito-local

    # if node_modules/.bin is in your $PATH
    cognito-local
    # OR
    yarn cognito-local
    # OR
    npx cognito-local

Cognito Local will now be listening on `http://localhost:9229`.

### Using a different port

cognito-local runs on port `9229` by default. If you would like to use a different port, you can set the `PORT`
environment variable:

`PORT=4000 cognito-local`

If you're running in Docker, you can also rebind the [published ports](https://docs.docker.com/config/containers/container-networking/#published-ports)
when you run:

`docker run -p4000:9229 jagregory/cognito-local`

Or combine the two approaches by [setting an environment variable](https://docs.docker.com/engine/reference/commandline/run/#set-environment-variables--e---env---env-file)
when you run:

`docker run -p4000:4000 -e PORT=4000 jagregory/cognito-local`

The same can be done in docker-compose with [environment variables](https://docs.docker.com/compose/environment-variables/#set-environment-variables-in-containers)
and [port binding](https://docs.docker.com/compose/networking/) in compose.

### Updating your application

You will need to update your AWS code to use the local address for Cognito's endpoint. For example, if you're using
amazon-cognito-identity-js you can update your `CognitoUserPool` usage to override the endpoint:

```js
new CognitoUserPool({
  /* ... normal options ... */
  endpoint: "http://localhost:9229/",
});
```

You only want to do this when you're running locally on your development machine.

### Creating your first User Pool

Once you've started Cognito Local the easiest way to create a new User Pool is with the aws-cli:

```shell
aws --endpoint http://localhost:9229 cognito-idp create-user-pool --pool-name MyUserPool
```

> Replace the `--endpoint` with whatever host and port you're running Cognito Local on.

If you run `ls .cognito/db` you will now see a new file called `local_???.json` where `???` is the `Id` from the output
of the command you just ran.

You may commit this file to version control if you would like all your team to use a common User Pool when developing,
or you can have each team member run the above command when they first start using Cognito Local.

## Configuration

You do not need to supply a config unless you need to customise the behaviour of Congito Local. If you are using Lambda
triggers with local Lambdas, you will definitely need to override `LambdaClient.endpoint` at a minimum.

Before starting Cognito Local, create a config file if one doesn't already exist:

    mkdir .cognito && echo '{}' > .cognito/config.json

You can edit that `.cognito/config.json` and add any of the following settings:

| Setting                                    | Type       | Default                 | Description                                                 |
| ------------------------------------------ | ---------- | ----------------------- | ----------------------------------------------------------- |
| `LambdaClient`                             | `object`   |                         | Any setting you would pass to the AWS.Lambda Node.js client |
| `LambdaClient.credentials.accessKeyId`     | `string`   | `local`                 |                                                             |
| `LambdaClient.credentials.secretAccessKey` | `string`   | `local`                 |                                                             |
| `LambdaClient.endpoint`                    | `string`   | `local`                 |                                                             |
| `LambdaClient.region`                      | `string`   | `local`                 |                                                             |
| `TokenConfig.IssuerDomain`                 | `string`   | `http://localhost:9229` | Issuer domain override                                      |
| `TriggerFunctions`                         | `object`   | `{}`                    | Trigger name to Function name mapping                       |
| `TriggerFunctions.CustomMessage`           | `string`   |                         | CustomMessage local lambda function name                    |
| `TriggerFunctions.PostAuthentication`      | `string`   |                         | PostAuthentication local lambda function name               |
| `TriggerFunctions.PostConfirmation`        | `string`   |                         | PostConfirmation local lambda function name                 |
| `TriggerFunctions.PreSignUp`               | `string`   |                         | PostConfirmation local lambda function name                 |
| `TriggerFunctions.PreTokenGeneration`      | `string`   |                         | PreTokenGeneration local lambda function name               |
| `TriggerFunctions.UserMigration`           | `string`   |                         | PreSignUp local lambda function name                        |
| `UserPoolDefaults`                         | `object`   |                         | Default behaviour to use for the User Pool                  |
| `UserPoolDefaults.MfaConfiguration`        | `string`   |                         | MFA type                                                    |
| `UserPoolDefaults.UsernameAttributes`      | `string[]` | `["email"]`             | Username alias attributes                                   |

The default config is:

```json
{
  "LambdaClient": {
    "credentials": {
      "accessKeyId": "local",
      "secretAccessKey": "local"
    },
    "region": "local"
  },
  "TokenConfig": {
    "IssuerDomain": "http://localhost:9229"
  },
  "TriggerFunctions": {},
  "UserPoolDefaults": {
    "UsernameAttributes": ["email"]
  }
}
```

### HTTPS endpoints with self-signed certificates

If you need your Lambda endpoint to be HTTPS with a self-signed certificate, you will need to disable certificate
verification in Node for Cognito Local. The easiest way to do this is to run Cognito Local with the
`NODE_TLS_REJECT_UNAUTHORIZED` environment variable.

    NODE_TLS_REJECT_UNAUTHORIZED=0 cognito-local
    docker run --env NODE_TLS_REJECT_UNAUTHORIZED=0 ...

### User Pools and Clients

User Pools are stored in `.cognito/db/$userPoolId.json`. As not all API features are supported yet, you'll likely find
yourself needing to manually edit this file to update the User Pool config or users. If you do modify this file, you
will need to restart Cognito Local.

User Pool Clients are stored in `.cognito/db/clients.json`. You can create new User Pool Clients using the
`CreateUserPoolClient` API.

## Known Limitations

- Many features are missing
- Users can't be disabled
- Only `USER_PASSWORD_AUTH` flow is supported
- Not all Lambda triggers are supported

## Multi-factor authentication

There is limited support for Multi-Factor Authentication in Cognito Local. Currently, if a User Pool is configured to
have a `MfaConfiguration` of `OPTIONAL` or `ON` **and** a user has an `MFAOption` of `SMS` then Cognito Local will
follow the MFA flows. If a user does not have a `phone_number` attribute or any other type of MFA is used, Cognito Local
will fail.

## Confirmation codes

When a user is prompted for a code of some kind (confirming their account, multi-factor auth), Cognito Local will write
a message to the console with their confirmation code instead of emailing it to the user.

For example:

```
╭───────────────────────────────────────────────────────╮
│                                                       │
│   Confirmation Code Delivery                          │
│                                                       │
│   Username:    c63651ae-59c6-4ede-ae7d-a8400ff65e8d   │
│   Destination: example@example.com                    │
│   Code:        3520                                   │
│                                                       │
╰───────────────────────────────────────────────────────╯
```

If a Custom Message lambda is configured, the output of the function invocation will be printed in the console too (verbosely!).

## Advanced

### Debugging Cognito Local

There's a few different ways you can debug Cognito Local. _Currently, it's best to debug Cognito Locally via Node, and
not with Docker_.

#### Verbose logging

If you just need more logs to understand what Cognito Local is doing, you can use the `DEBUG` environment variable.

```shell
DEBUG=1 yarn start
```

Which will print extra debug logs to the terminal (with `{...}` replaced by detailed information):

```
[1639034724411] INFO: NONE NONE Cognito Local running on http://127.0.0.1:9229
[1639034724872] DEBUG: 7f53abbd CreateUserPool start {...}
[1639034724873] DEBUG: 7f53abbd CreateUserPool CognitoServiceImpl.createUserPool {...}
[1639034724873] DEBUG: 7f53abbd CreateUserPool UserPoolServiceImpl.create {...}
[1639034724873] DEBUG: 7f53abbd CreateUserPool createDataStore {...}
[1639034724873] DEBUG: 7f53abbd CreateUserPool Creating new data store {...}
[1639034724874] DEBUG: 7f53abbd CreateUserPool DataStore.save {...}
[1639034724876] DEBUG: 7f53abbd CreateUserPool DataStore.get {...}
[1639034724877] DEBUG: 7f53abbd CreateUserPool end {...}
[1639034724882] DEBUG: 7f53abbd NONE request completed {...}
```

#### VSCode debugger

There's a launch configuration included in the repo at [.vscode/launch.json](./.vscode/launch.json).

If you open `Run and Debug` and start the `CognitoLocal` configuration it will start Cognito Local and attach the
debugger.

Put a breakpoint in [src/bin/start.ts](./src/bin/start.ts) or in the target for the API call you want to debug
(e.g. [src/targets/createUserPool.ts](./src/targets/createUserPool.ts)) and run your code that uses Cognito Local or a
CLI command.

#### WebStorm debugger

There's a WebStorm run configuration included in the repo at
[.idea/runConfigurations/CognitoLocal.xml](./.idea/runConfigurations/CognitoLocal.xml).

A `CognitoLocal` entry should appear in the Run Configurations drop-down in the toolbar, which you can Run or Debug.
Alternatively, the `Run > Debug` menu will let you pick a Run Configuration to launch.

Put a breakpoint in [src/bin/start.ts](./src/bin/start.ts) or in the target for the API call you want to debug
(e.g. [src/targets/createUserPool.ts](./src/targets/createUserPool.ts)) and run your code that uses Cognito Local or a
CLI command.

#### Chrome DevTools

> Note: due to a poor choice of ports on my part, Chrome will spam Cognito Local with HTTP requests if you have the
> NodeJS DevTools open. I'll change the default port for Cognito Local at some point to fix this.

Launch Cognito Local using the `start:debug` script:

```shell
yarn start:debug
```

This will configure NodeJS to start the inspector on port `9230`.

Open Chrome and navigate to `chrome://inspect`. Click the `Open dedicated DevTools for Node` link which will open a new
DevTools window. You can then open the Sources tab and browse to a Cognito Local file, or press `Cmd+P` or `Ctrl+P` to
open the file navigator and open `src/bin/start.ts` or a target you want to debug then place a breakpoint and run your
code that uses Cognito Local or a CLI command.
