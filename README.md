# Cognito Local

![CI](https://github.com/jagregory/cognito-local/workflows/CI/badge.svg)

An offline emulator for [Amazon Cognito](https://aws.amazon.com/cognito/).

The goal for this project is to be _Good Enough_ for local development use, and that's it. Don't expect it to be perfect, because it won't be.

## Features

- [x] Sign Up
- [x] Confirm Sign Up
- [x] Initiate Auth (Login)
- [x] Forgot Password
- [x] Confirm Forgot Password
- [x] User Migration lambda trigger (Authentication)
- [ ] User Migration lambda trigger (Forgot Password)

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

You can now update your AWS code to use the local address for Cognito's endpoint. For example, if you're using amazon-cognito-identity-js you can update your `CognitoUserPool` usage to override the endpoint:

```js
new CognitoUserPool({
  /* ... normal options ... */
  endpoint: "http://localhost:9229/",
});
```

You likely only want to do this when you're running locally on your development machine.

## Configuration

You do not need to supply a config unless you need to customise the behaviour of Congito Local. If you are using Lambda triggers, you will definitely need to override `LambdaClient.endpoint` at a minimum.

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
| `UserPoolDefaults.UserPoolId`              | `string`   | `local`     | Default User Pool Id                                        |
| `UserPoolDefaults.UsernameAttributes`      | `string[]` | `["email"]` | Username alias attributes                                   |

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
    "UserPoolId": "local",
    "UsernameAttributes": ["email"]
  }
}
```

### HTTPS endpoints with self-signed certificates

If you need your Lambda endpoint to be HTTPS with a self-signed certificate, you will need to disable certificate verification in Node for Cognito Local. The easiest way to do this is to run Cognito Local with the `NODE_TLS_REJECT_UNAUTHORIZED` environment variable.

    NODE_TLS_REJECT_UNAUTHORIZED=0 cognito-local

## Known Limitations

Many. Cognito Local only works for my exact use-case.

Issues I know about:

- The database is shared for all User Pools, if you use different User Pool IDs they will all access the same database.
- Client IDs are ignored and all connect to the same User Pool.
- Users can't be disabled
- Only `USER_PASSWORD_AUTH` flow is supported
- You can't reset your password
- Not all Lambda triggers (yet, watch this space)

## Confirmation codes

If you register a new user and they need to confirm their account, Cognito Local will write a message to the console with their confirmation code instead of emailing it to the user.

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
