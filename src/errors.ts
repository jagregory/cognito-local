export class UnsupportedError extends Error {}

export class CognitoError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.code = `CognitoLocal#${code}`;
  }
}

export class NotAuthorizedError extends CognitoError {
  public constructor() {
    super("NotAuthorizedException", "User not authorized");
  }
}

export class UserNotFoundError extends CognitoError {
  public constructor(message = "User not found") {
    super("UserNotFoundException", message);
  }
}

export class UsernameExistsError extends CognitoError {
  public constructor() {
    super("UsernameExistsException", "User already exists");
  }
}

export class CodeMismatchError extends CognitoError {
  public constructor() {
    super("CodeMismatchException", "Incorrect confirmation code");
  }
}

export class MFAMethodNotFoundException extends CognitoError {
  public constructor() {
    super(
      "MFAMethodNotFoundException",
      "No MFA mechanism registered in the account"
    );
  }
}

export class InvalidPasswordError extends CognitoError {
  public constructor() {
    super("InvalidPasswordException", "Invalid password");
  }
}

export class PasswordResetRequiredError extends CognitoError {
  public constructor() {
    super("PasswordResetRequiredException", "Password reset required");
  }
}

export class ResourceNotFoundError extends CognitoError {
  public constructor(message?: string) {
    super("ResourceNotFoundException", message ?? "Resource not found");
  }
}

export class GroupNotFoundError extends ResourceNotFoundError {
  public constructor() {
    super("Group not found");
  }
}

export class UnexpectedLambdaExceptionError extends CognitoError {
  public constructor() {
    super(
      "UnexpectedLambdaExceptionException",
      "Unexpected error when invoking lambda"
    );
  }
}

export class UserLambdaValidationError extends CognitoError {
  public constructor(message?: string) {
    super(
      "UserLambdaValidationException",
      message ?? "Lambda threw an exception"
    );
  }
}

export class InvalidLambdaResponseError extends CognitoError {
  public constructor() {
    super("InvalidLambdaResponseException", "Invalid Lambda response");
  }
}

export class InvalidParameterError extends CognitoError {
  public constructor(message = "Invalid parameter") {
    super("InvalidParameterException", message);
  }
}
