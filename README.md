# Cognito Local

![CI](https://github.com/jagregory/cognito-local/workflows/CI/badge.svg)

An offline emulator for [Amazon Cognito](https://aws.amazon.com/cognito/).

The goal for this project is to be _Good Enough_ for local development use, and that's it. Don't expect it to be
perfect, because it won't be.

## Features

> At this point in time, assume any features listed below are _partially implemented_ based on @jagregory's personal
> use-cases. If they don't work for you, please raise an issue.

- [ConfirmForgotPassword](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ConfirmForgotPassword.html)
- [ConfirmSignUp](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ConfirmSignUp.html)
- [CreateUserPoolClient](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateUserPoolClient.html)
- [ForgotPassword](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ForgotPassword.html)
- [InitiateAuth](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html)
- [ListUsers](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ListUsers.html)
- [RespondToAuthChallenge](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_RespondToAuthChallenge.html)
- [SignUp](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_SignUp.html)

Additional supported features:

- JWKs verification
- User Migration lambda trigger
- Post Confirmation lambda trigger

## Installation

    yarn add --dev cognito-local
    # OR
    npm install --dev cognito-local

## Usage

    # if node_modules/.bin is in your $PATH
    cognito-local
    # OR
    yarn cognito-local
    # OR
    npx cognito-local

Cognito Local will now be listening on `http://localhost:9229`.

You can now update your AWS code to use the local address for Cognito's endpoint. For example, if you're using
amazon-cognito-identity-js you can update your `CognitoUserPool` usage to override the endpoint:

```js
new CognitoUserPool({
  /* ... normal options ... */
  endpoint: "http://localhost:9229/",
});
```

You likely only want to do this when you're running locally on your development machine.

## Configuration

You do not need to supply a config unless you need to customise the behaviour of Congito Local. If you are using Lambda
triggers, you will definitely need to override `LambdaClient.endpoint` at a minimum.

Before starting Cognito Local, create a config file:

    mkdir .cognito && echo '{}' > .cognito/config.json

You can edit that `.cognito/config.json` and add any of the following settings:

| Setting                                    | Type       | Default     | Description                                                 |
| ------------------------------------------ | ---------- | ----------- | ----------------------------------------------------------- |
| `LambdaClient`                             | `object`   |             | Any setting you would pass to the AWS.Lambda Node.js client |
| `LambdaClient.credentials.accessKeyId`     | `string`   | `local`     |                                                             |
| `LambdaClient.credentials.secretAccessKey` | `string`   | `local`     |                                                             |
| `LambdaClient.endpoint`                    | `string`   | `local`     |                                                             |
| `LambdaClient.region`                      | `string`   | `local`     |                                                             |
| `TriggerFunctions`                         | `object`   | `{}`        | Trigger name to Function name mapping                       |
| `TriggerFunctions.UserMigration`           | `string`   |             | User Migration lambda name                                  |
| `UserPoolDefaults`                         | `object`   |             | Default behaviour to use for the User Pool                  |
| `UserPoolDefaults.Id`                      | `string`   | `local`     | Default User Pool Id                                        |
| `UserPoolDefaults.UsernameAttributes`      | `string[]` | `["email"]` | Username alias attributes                                   |
| `UserPoolDefaults.MfaConfiguration`        | `string`   |             | MFA type                                                    |

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

### User Pools and Clients

User Pools are stored in `.cognito/db/$userPoolId.json`. As not all API features are supported yet, you'll likely find
yourself needing to manually edit this file to update the User Pool config or users. If you do modify this file, you
will need to restart Cognito Local.

User Pool Clients are stored in `.cognito/db/clients.json`. You can create new User Pool Clients using the
`CreateUserPoolClient` API.

## Known Limitations

Many. Cognito Local only works for my exact use-case.

Issues I know about:

- Users can't be disabled
- Only `USER_PASSWORD_AUTH` flow is supported
- Not all Lambda triggers (yet, watch this space)

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
