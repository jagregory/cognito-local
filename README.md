# Cognito Local

![CI](https://github.com/jagregory/cognito-local/workflows/CI/badge.svg)

A _Good Enough_ offline emulator for [Amazon Cognito](https://aws.amazon.com/cognito/).

## Features

> Assume any features listed below are _partially implemented_ based on @jagregory's personal use-cases. I've
> implemented as little of each feature as is necessary to support my own use-case. If anything doesn't work for you,
> please raise an issue.

- [AdminConfirmSignUp](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminConfirmSignUp.html) (community contributed, incomplete)
- [AdminCreateUser](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminCreateUser.html) (community contributed, incomplete)
- [AdminDeleteUser](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminDeleteUser.html) (community contributed, incomplete)
- [AdminGetUser](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminGetUser.html) (community contributed, incomplete)
- [AdminUpdateUserAttributes](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminUpdateUserAttributes.html) (community contributed, incomplete)
- [ChangePassword](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ChangePassword.html) (community contributed, incomplete)
- [ConfirmForgotPassword](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ConfirmForgotPassword.html)
- [ConfirmSignUp](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ConfirmSignUp.html)
- [CreateUserPoolClient](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateUserPoolClient.html)
- [DescribeUserPoolClient](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_DescribeUserPoolClient.html)
- [ForgotPassword](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ForgotPassword.html)
- [GetUser](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_GetUser.html)
- [InitiateAuth](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html)
- [ListUsers](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ListUsers.html)
- [RespondToAuthChallenge](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_RespondToAuthChallenge.html)
- [SignUp](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_SignUp.html)

Additional supported features:

- JWKs verification
- Partial support for lambda triggers (see below)

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

## Configuration

You do not need to supply a config unless you need to customise the behaviour of Congito Local. If you are using Lambda
triggers, you will definitely need to override `LambdaClient.endpoint` at a minimum.

Before starting Cognito Local, create a config file:

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
| `TriggerFunctions.CustomMessage`           | `string`   |                         | CustomMessage lambda name                                   |
| `TriggerFunctions.PostConfirmation`        | `string`   |                         | PostConfirmation lambda name                                |
| `TriggerFunctions.UserMigration`           | `string`   |                         | UserMigration lambda name                                   |
| `UserPoolDefaults`                         | `object`   |                         | Default behaviour to use for the User Pool                  |
| `UserPoolDefaults.Id`                      | `string`   | `local`                 | Default User Pool Id                                        |
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
    "Id": "local",
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
