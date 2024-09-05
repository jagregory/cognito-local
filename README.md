# Cognito local - Patched
Same as: https://github.com/jagregory/cognito-local

Motivation:
- I needed Cognito events to be offline and more flexible. This feature was limited to `serverless-offline` using invocations, but I do not use servelress framework to develop solutions, so a more common (http) approch was needed.

Modifications:
`config.json` - `TriggerFunctions`
- Added `PreTokenGenerationV2`
- Modified `PreTokenGeneration` into `PreTokenGenerationV1`
- Modified `FunctionConfig` so its no longer a string value, but an adapter object.

E.g. Invokes:
```json
{
  "TriggerFunctions": {
    "PreTokenGenerationV2": {
      "adapter": "invoke",
      "name": "MyLambdaName"
    }
  }
}
```
E.g. Http:
```json
{
  "TriggerFunctions": {
    "PreTokenGenerationV2": {
      "adapter": "http",
      "url": "http://localhost:3000/pre-token-gen-v2"
    }
  }
}
```