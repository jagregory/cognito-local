import { InvalidParameterError } from "../../errors";

/**
 * Assert a required parameter has a value. Throws an InvalidParameterError.
 *
 * @param name Name of the parameter to include in the error message
 * @param parameter Parameter to assert
 * @param message Custom full message for the error, optional
 */
export function assertRequiredParameter<T>(
  name: string,
  parameter: T,
  message?: string
): asserts parameter is NonNullable<T> {
  if (!parameter) {
    throw new InvalidParameterError(
      message ?? `Missing required parameter ${name}`
    );
  }
}

/**
 * Asserts an array parameter has a length between min and max. Throws an InvalidParameterError.
 *
 * @param name Name of the parameter to include in the error message
 * @param min Minimum length
 * @param max Maximum length
 * @param parameter Parameter to assert
 */
export function assertParameterLength<T>(
  name: string,
  min: number,
  max: number,
  parameter: readonly T[]
): asserts parameter {
  if (parameter.length < min) {
    throw new InvalidParameterError(
      `Invalid length for parameter ${name}, value: ${parameter.length}, valid min length: ${min}`
    );
  }
  if (parameter.length > max) {
    throw new InvalidParameterError(
      `Invalid length for parameter ${name}, value: ${parameter.length}, valid max length: ${max}`
    );
  }
}
