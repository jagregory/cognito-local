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
