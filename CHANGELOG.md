## [3.13.1](https://github.com/jagregory/cognito-local/compare/v3.13.0...v3.13.1) (2022-01-11)


### Bug Fixes

* **api:** adminDeleteUser handles email usernames ([8faa78f](https://github.com/jagregory/cognito-local/commit/8faa78f0aff3f642d806aa4d38530665d6593166)), closes [#99](https://github.com/jagregory/cognito-local/issues/99)
* **log:** errors not being logged correctly ([1ca2b99](https://github.com/jagregory/cognito-local/commit/1ca2b9948bb38b875601c3d7b6fdf481e963d2cb))

# [3.13.0](https://github.com/jagregory/cognito-local/compare/v3.12.0...v3.13.0) (2021-12-11)


### Bug Fixes

* **api:** verifyUserAttributes throws CodeMismatchError ([b3b116c](https://github.com/jagregory/cognito-local/commit/b3b116c306807a828fbc1e52629ee213c2fbfca8))


### Features

* **api:** adminDeleteUserAttributes full support ([1a47086](https://github.com/jagregory/cognito-local/commit/1a470866d889657c7415bc176defbb821ac30a47))
* **api:** deleteUserAttributes full support ([3d0e9a0](https://github.com/jagregory/cognito-local/commit/3d0e9a0c04740432d8bc6a3f128370566bc1aabc))
* **api:** updateUserAttributes full support ([308c9c2](https://github.com/jagregory/cognito-local/commit/308c9c25de3292fa2632af69679af34f6c68586f))

# [3.12.0](https://github.com/jagregory/cognito-local/compare/v3.11.0...v3.12.0) (2021-12-10)


### Bug Fixes

* **api:** save attribute code separately from confirmation code ([b18af6a](https://github.com/jagregory/cognito-local/commit/b18af6a75601c2dd9ab2f8f35c5df5fbd4bcf477))


### Features

* **api:** getUserAttributeVerificationCode full support ([90726a4](https://github.com/jagregory/cognito-local/commit/90726a42feb7537424562d97c0983c60450d7abd))
* **api:** verifyUserAttribute full support ([320dd17](https://github.com/jagregory/cognito-local/commit/320dd172aaad98c841e69c00747c65f2dfd125cf))

# [3.11.0](https://github.com/jagregory/cognito-local/compare/v3.10.0...v3.11.0) (2021-12-10)


### Features

* **api:** adminUpdateUserAttributes full support ([d3c5ebe](https://github.com/jagregory/cognito-local/commit/d3c5ebe3351166f8abf65490aa36621ab61ccd2a))

# [3.10.0](https://github.com/jagregory/cognito-local/compare/v3.9.0...v3.10.0) (2021-12-09)


### Bug Fixes

* **lambda:** preTokenGenerator can't change reserved claims ([407122f](https://github.com/jagregory/cognito-local/commit/407122fdfd5d973624c26aaba941fe8c6c783dce))


### Features

* **api:** adminConfirmSignUp full support ([e16a211](https://github.com/jagregory/cognito-local/commit/e16a2110eb1d707404eda6342d0178432e2f4875))

# [3.9.0](https://github.com/jagregory/cognito-local/compare/v3.8.0...v3.9.0) (2021-12-07)


### Features

* **lambda:** preTokenGeneration trigger called when tokens generated ([d04506e](https://github.com/jagregory/cognito-local/commit/d04506e3623889fb96ffbb413cd97be627570aee))

# [3.8.0](https://github.com/jagregory/cognito-local/compare/v3.7.1...v3.8.0) (2021-12-07)


### Bug Fixes

* cache data stores to fix potential race condition ([406599a](https://github.com/jagregory/cognito-local/commit/406599acd787d8973ab5500a2e568b45d754dda1))
* **tokens:** add jti to id and refresh tokens ([4f475ad](https://github.com/jagregory/cognito-local/commit/4f475ad5d2b5b92d30e7953809f80301ffe41944))
* **tokens:** adminInitateAuth uses token IssuerDomain ([37ba1c5](https://github.com/jagregory/cognito-local/commit/37ba1c557420340bf4a8cbcdb301b82b25f5cc2d))


### Features

* **token:** add refresh token, revoke token and initiate auth ([0d46ed7](https://github.com/jagregory/cognito-local/commit/0d46ed768fa6eb22c1ce1f404b7a366f1c341d0f))
* **token:** initiateAuth basic refresh token support ([2d6b0e3](https://github.com/jagregory/cognito-local/commit/2d6b0e362401e3414d3d49e2a60963dc492ce669))

## [3.7.1](https://github.com/jagregory/cognito-local/compare/v3.7.0...v3.7.1) (2021-11-29)


### Bug Fixes

* **deps:** fix breaking change in stormdb ([dbed898](https://github.com/jagregory/cognito-local/commit/dbed8989153375ce0c48888650f0aea49feb096c))

# [3.7.0](https://github.com/jagregory/cognito-local/compare/v3.6.0...v3.7.0) (2021-11-29)


### Bug Fixes

* **lambda:** lambda triggers called with clientMetadata/validationData ([2399c3e](https://github.com/jagregory/cognito-local/commit/2399c3eb7cbe92a772cdd0ec4082fb56b57fe3c6))


### Features

* **lambda:** postConfirmation called in signUp ([ddb2b77](https://github.com/jagregory/cognito-local/commit/ddb2b77bcf857b3e54213b2468c095671af60381))
* **lambda:** preSignUp trigger support in signUp ([af955a1](https://github.com/jagregory/cognito-local/commit/af955a1a5c093c8c9b3b9dd7821bfbb2a51243d9))

# [3.6.0](https://github.com/jagregory/cognito-local/compare/v3.5.0...v3.6.0) (2021-11-27)


### Bug Fixes

* **config:** arrays in config couldn't be overwritten ([7526a0a](https://github.com/jagregory/cognito-local/commit/7526a0aa4410420933b750bf08a912306dbca059))
* **lambda:** customMessage uses code and username parameters ([084c253](https://github.com/jagregory/cognito-local/commit/084c2539126214ef1bc6e5d94b2a007b79c2f49a))
* **tokens:** id token not using issuer config ([c488810](https://github.com/jagregory/cognito-local/commit/c4888103ac0d14b529c4ac3a83c3006765ae6b84))


### Features

* **api:** adminCreateUser can generate a temporary password ([c0eea4f](https://github.com/jagregory/cognito-local/commit/c0eea4f0ad0d1352b1a0cdfcaa43f29a3afc69f2))
* **api:** adminCreateUser delivers welcome message ([d49aa80](https://github.com/jagregory/cognito-local/commit/d49aa8052bdd4605bdb79c697dc359116bdcfadf))
* **api:** createUserPool full support ([e5c08dc](https://github.com/jagregory/cognito-local/commit/e5c08dcb297cf75eaf07ffdda42a0addc8d4453e))
* **api:** signUp delivers message using auto verified attributes ([64280e8](https://github.com/jagregory/cognito-local/commit/64280e851d7f9b18345f51cf51d7798687d5189c))

# [3.5.0](https://github.com/jagregory/cognito-local/compare/v3.4.0...v3.5.0) (2021-11-25)


### Features

* **api:** listUserPools full support ([d2e5324](https://github.com/jagregory/cognito-local/commit/d2e53249395112c723bc02b1e0ca0dcc2910c896))

# [3.4.0](https://github.com/jagregory/cognito-local/compare/v3.3.0...v3.4.0) (2021-11-25)


### Features

* **api:** adminSetUserPassword support ([1707257](https://github.com/jagregory/cognito-local/commit/1707257cc39bc2621b5b77520e61cc32c0ba5998))
* **lambda:** post authentication lambda support ([b75ca6b](https://github.com/jagregory/cognito-local/commit/b75ca6b70b91e09cf27d2ec2c56e1480b1818304))

# [3.3.0](https://github.com/jagregory/cognito-local/compare/v3.2.0...v3.3.0) (2021-11-25)


### Bug Fixes

* **api:** adminCreateUser defaults status to FORCE_CHANGE_PASSWORD ([4996aa4](https://github.com/jagregory/cognito-local/commit/4996aa418395db8fcd477fb3c26047ed21a1d4ce))
* **api:** adminCreateUser handles duplicate users ([7529971](https://github.com/jagregory/cognito-local/commit/752997144479f66168023604ee326e48c3e31fb3))
* **api:** initiateAuth throws when missing AuthParameters ([d1eb240](https://github.com/jagregory/cognito-local/commit/d1eb240329dca39dcda4a8d080b94cec8822b331))
* **api:** respondToAuthChallenge throws if missing ChallengeResponses ([5e5aa36](https://github.com/jagregory/cognito-local/commit/5e5aa36740cff3cf37ec316e8a206e5a84f3022f))
* **lambda:** forgotPassword invokes CustomMessage lambda ([79f43ef](https://github.com/jagregory/cognito-local/commit/79f43ef39830a33a012961cf2a37acf398bff1fd))


### Features

* **api:** adminDeleteUser full support ([58f33e2](https://github.com/jagregory/cognito-local/commit/58f33e20a312be8631279c1963a8cac39e3bbfda))
* **api:** adminGetUser full support ([a6fc4c8](https://github.com/jagregory/cognito-local/commit/a6fc4c834fb8f00b2fc068dbb368d2884880c584))
* **api:** deleteUser full support ([0a753b2](https://github.com/jagregory/cognito-local/commit/0a753b2301582a76f810a628582dc60d4f3a5ae3))
* **api:** initiateAuth handles FORCE_CHANGE_PASSWORD ([6703ea9](https://github.com/jagregory/cognito-local/commit/6703ea9a126852c921da9f23571c9ad776edc53b))
* **api:** listGroups support ([252ee96](https://github.com/jagregory/cognito-local/commit/252ee96f36a6ba9cd5456e3a4a8bc83341296ca5))
* **api:** respondToAuthChallenge supports NEW_PASSWORD_REQUIRED ([6a75fea](https://github.com/jagregory/cognito-local/commit/6a75feae1ddc6122f35d7d3feee6a6a880e8d064))
* **lambda:** support for CustomMessage_Authentication ([dfb6fdf](https://github.com/jagregory/cognito-local/commit/dfb6fdffeda3e0519a0c7aba520ab718d6449cd9))
* **lambda:** support for CustomMessage_SignUp ([ce69ea7](https://github.com/jagregory/cognito-local/commit/ce69ea79d64f173bce43cb6d1bed340ba66ebf98))

# [3.2.0](https://github.com/jagregory/cognito-local/compare/v3.1.5...v3.2.0) (2021-11-24)


### Features

* **api:** createGroup support ([c3dc092](https://github.com/jagregory/cognito-local/commit/c3dc0921ae116a356a9bee39df461795285f7c6b))

## [3.1.5](https://github.com/jagregory/cognito-local/compare/v3.1.4...v3.1.5) (2021-11-24)


### Bug Fixes

* adminCreateUser correct response ([26aa5a7](https://github.com/jagregory/cognito-local/commit/26aa5a7f9a0dfb3cbd279f16e5e1a751f95aa810)), closes [#38](https://github.com/jagregory/cognito-local/issues/38)

## [3.1.4](https://github.com/jagregory/cognito-local/compare/v3.1.3...v3.1.4) (2021-11-24)


### Bug Fixes

* year out of range ([bc1fb6f](https://github.com/jagregory/cognito-local/commit/bc1fb6fb5b4e8f934784ec41d6246eeabfa28467)), closes [#40](https://github.com/jagregory/cognito-local/issues/40)

## [3.1.3](https://github.com/jagregory/cognito-local/compare/v3.1.2...v3.1.3) (2021-10-05)


### Bug Fixes

* **api:** users can be queried by their sub ([ae555b8](https://github.com/jagregory/cognito-local/commit/ae555b88e0de24df370a309640a70e124c025392))

## [3.1.2](https://github.com/jagregory/cognito-local/compare/v3.1.1...v3.1.2) (2021-07-29)


### Bug Fixes

* runnable via npx ([4313ebf](https://github.com/jagregory/cognito-local/commit/4313ebf195514917800cfcdb928e914e08335587)), closes [#34](https://github.com/jagregory/cognito-local/issues/34)

## [3.1.1](https://github.com/jagregory/cognito-local/compare/v3.1.0...v3.1.1) (2021-07-29)


### Bug Fixes

* regression for usernames with full stops in ([73cb644](https://github.com/jagregory/cognito-local/commit/73cb644efb431e567b06f0b3b97b689f4b183e21)), closes [#35](https://github.com/jagregory/cognito-local/issues/35)

# [3.1.0](https://github.com/jagregory/cognito-local/compare/v3.0.0...v3.1.0) (2021-07-28)


### Features

* add more admin features and change password ([6339917](https://github.com/jagregory/cognito-local/commit/63399177ab4dc7b891425f9d4dd5d2756a71c60d))
* add support for admin commands ([b65a5bf](https://github.com/jagregory/cognito-local/commit/b65a5bf99192e0ef88bac371cb7935a2c8ad299f))


### Reverts

* Revert "Merge branch 'furious-luke-master'" ([ad0e928](https://github.com/jagregory/cognito-local/commit/ad0e928385ec10e3dacb212c583a35085d88a4eb))

# [3.0.0](https://github.com/jagregory/cognito-local/compare/v2.3.2...v3.0.0) (2021-07-28)


### Bug Fixes

* conflation of a user's Sub and their Username ([ece63b6](https://github.com/jagregory/cognito-local/commit/ece63b6f037e25f3fae67003df59bc652d2ada79))


### BREAKING CHANGES

* potential -- the autogenerated Sub and user-supplied
Username were treated interchangeably before, but now are independent.
Previously lookups by the Sub attribute were possible, but it now
doesn't appear necessary so has been removed. Databases should be
unaffected.

## [2.3.2](https://github.com/jagregory/cognito-local/compare/v2.3.1...v2.3.2) (2021-07-27)


### Bug Fixes

* lambda tests to use imported aws-sdk version ([d4a5c82](https://github.com/jagregory/cognito-local/commit/d4a5c82c6037392830ade18253bc3159d8f87619))

## [2.3.1](https://github.com/jagregory/cognito-local/compare/v2.3.0...v2.3.1) (2021-07-24)


### Bug Fixes

* auth_time resolution in generated tokens ([f300df4](https://github.com/jagregory/cognito-local/commit/f300df4fb42e6b8f28ed8b83770a5217efa6215f))

# [2.3.0](https://github.com/jagregory/cognito-local/compare/v2.2.0...v2.3.0) (2021-07-23)


### Bug Fixes

* key setting in the datastore to work with arrays ([d0a2557](https://github.com/jagregory/cognito-local/commit/d0a25572de19b84e8228c1fea9d2ebbe9d40d160))


### Features

* **api:** describeUserPoolClient support ([26cf370](https://github.com/jagregory/cognito-local/commit/26cf370d38d83bc922431c68202a25d268402eb7))

# [2.2.0](https://github.com/jagregory/cognito-local/compare/v2.1.0...v2.2.0) (2021-07-22)


### Features

* **lambda:** limited CustomMessage lambda support ([6880a90](https://github.com/jagregory/cognito-local/commit/6880a90423547162f44832adbc2267cad6890423))

# [2.1.0](https://github.com/jagregory/cognito-local/compare/v2.0.0...v2.1.0) (2020-05-10)


### Features

* support for GetUser api ([cc8048b](https://github.com/jagregory/cognito-local/commit/cc8048b08d2937844e1bb3bcf5d966ed28b26465))

# [2.0.0](https://github.com/jagregory/cognito-local/compare/v1.3.0...v2.0.0) (2020-05-03)


### Bug Fixes

* hide debug logging by default ([48de4e5](https://github.com/jagregory/cognito-local/commit/48de4e5be1e1a1c47768910355c3010e6923865d))
* propagate Session parameter through initiateAuth ([688fd4a](https://github.com/jagregory/cognito-local/commit/688fd4a476160fe9c99fbea19c5fd94e36d1a060))
* **server:** better default handling for HOST and PORT ([69b4648](https://github.com/jagregory/cognito-local/commit/69b4648977807d6491caa1243848c430d68f641b))
* change UserPoolId to Id in user pool storage ([71f5e52](https://github.com/jagregory/cognito-local/commit/71f5e524a249a0c17a3cd30af53205a1ba0c93e3))


### Features

* **api:** respondToAuthChallenge support ([842633e](https://github.com/jagregory/cognito-local/commit/842633ea779ceed39be78338d6ccd6f613c7e0c0))
* **api:** sms_mfa support for initiateAuth ([f16afe6](https://github.com/jagregory/cognito-local/commit/f16afe60bcfad03ec960a0a6e5d3ccb594c38708))
* createUserPoolClient support ([df421d7](https://github.com/jagregory/cognito-local/commit/df421d7ca83312f6b643d5ee9d3e9aa0bfff63a4))
* store clients for user pools ([eaad662](https://github.com/jagregory/cognito-local/commit/eaad66279346fbc8f5b8bb3b8ea6c9fd5d6882a8))
* **api:** basic listUsers support ([6e0c18f](https://github.com/jagregory/cognito-local/commit/6e0c18f162733b25fd3590bf1e87dc87d077e395))


### BREAKING CHANGES

* client ids are now validated and associated with
specific user pools.
* Nit pick of a breaking change, make the user pool
database representation match what AWS reponds with from the API;
keeping consistent with their response format should make it easier for
us to implement APIs later. Sorry for the breakage.

Migration steps:

1. Open any database json files and rename the UserPoolId key to Id

# [1.3.0](https://github.com/jagregory/cognito-local/compare/v1.2.2...v1.3.0) (2020-04-29)


### Features

* **server:** add hostname option ([0365f3a](https://github.com/jagregory/cognito-local/commit/0365f3acac5ff8a6541834ca26fbe04fdf176743))

## [1.2.2](https://github.com/jagregory/cognito-local/compare/v1.2.1...v1.2.2) (2020-04-13)


### Bug Fixes

* **lambda:** save attributes from user migration lambda on user record ([dc7a1c6](https://github.com/jagregory/cognito-local/commit/dc7a1c6b2db2851760df106daededa9bf849a5d6))

## [1.2.1](https://github.com/jagregory/cognito-local/compare/v1.2.0...v1.2.1) (2020-04-13)


### Bug Fixes

* **lambda:** invoke lambda with actual AWS SDK version ([bed1b7c](https://github.com/jagregory/cognito-local/commit/bed1b7c971f0f87891133151035a1d6960c2cf6b))
* imported json files weren't being published to npm ([5f76d86](https://github.com/jagregory/cognito-local/commit/5f76d8671cd8172eb94abe00e252ad4a511e7d47))

# [1.2.0](https://github.com/jagregory/cognito-local/compare/v1.1.1...v1.2.0) (2020-04-13)


### Bug Fixes

* **jwt:** sign tokens with real rsa key ([949d3fc](https://github.com/jagregory/cognito-local/commit/949d3fcbad8e247047922580fe237e537bf50926))


### Features

* **lambda:** post confirmation lambda trigger ([f30573b](https://github.com/jagregory/cognito-local/commit/f30573b771109e7da28687805c6b7734f89fce80))
* include user attributes in user migration lambda call ([dabed92](https://github.com/jagregory/cognito-local/commit/dabed92182ff7dc5285ea21dbc042584b1ce2cd9))
* **jwt:** expose jwk endpoint to support verifying tokens ([bc27b86](https://github.com/jagregory/cognito-local/commit/bc27b867ff8eeabbeade3fcf983dd38d3b8953f7))

## [1.1.1](https://github.com/jagregory/cognito-local/compare/v1.1.0...v1.1.1) (2020-04-12)


### Bug Fixes

* **release:** reorder semantic-release plugins to commit last ([3a94c03](https://github.com/jagregory/cognito-local/commit/3a94c031d8699470f03a08b6fd5e85058b6a22f3))

# [1.1.0](https://github.com/jagregory/cognito-local/compare/v1.0.0...v1.1.0) (2020-04-12)


### Bug Fixes

* incorrect case in import ([dd2538b](https://github.com/jagregory/cognito-local/commit/dd2538b48b7939b5772d0bb3a5b0d2e8bca101ae))
* **userpool:** force save sub as attribute, fix sub check logic ([e5ed247](https://github.com/jagregory/cognito-local/commit/e5ed247d10fdf9411ec9ec8785301d18bc7aca5c))


### Features

* config file support ([ad0f247](https://github.com/jagregory/cognito-local/commit/ad0f2471f9ec73cb5668adf32560ea154570f801))
* **lambda:** initial user migration trigger support ([2f9ecfc](https://github.com/jagregory/cognito-local/commit/2f9ecfcf06738ae5d08013b0a96b71b48e852596))
* confirm forgot password flow ([51df572](https://github.com/jagregory/cognito-local/commit/51df572d6be9e444f0cb330a8c6935b5788b2e32))
* forgot password flow ([6bd0b42](https://github.com/jagregory/cognito-local/commit/6bd0b42ba04993859f775ab517bb41be9c06b0b4))

# 1.0.0 (2020-04-11)


### Bug Fixes

* **release:** trigger a release for 1.0.0 ([5d8ba83](https://github.com/jagregory/cognito-local/commit/5d8ba83bff87009d4655570912ecddec4d4f6f9f))
