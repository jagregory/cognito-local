# Cognito Local

An offline emulator for [Amazon Cognito](https://aws.amazon.com/cognito/).

The goal for this project is to be _Good Enough_ for local development use, and that's it. Don't expect it to be perfect, because it won't be.

## Features

- [x] Sign Up
- [x] Confirm Sign Up
- [x] Initiate Auth/Login

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

## Known Limitations

Many. Cognito Local only works for my exact use-case.

Issues I know about:

- The database is shared for all User Pools, if you use different User Pool IDs they will all access the same database.
- Client IDs are ignored and all connect to the same User Pool.
- Users can't be disabled
- Only `USER_PASSWORD_AUTH` flow is supported
- You can't reset your password
- No Lambda triggers (yet, watch this space)
