import type { TimeUnitsType } from "aws-sdk/clients/cognitoidentityserviceprovider";
import ms from "ms";
import type { StringValue, UnitAnyCase } from "ms";

function assertUnitAnyCase(unit: string): asserts unit is UnitAnyCase {
  if (!["seconds", "minutes", "hours", "days"].includes(unit)) {
    throw new Error(`Invalid unit: ${unit}`);
  }
}

export function formatExpiration(
  duration: number | undefined,
  unit: TimeUnitsType,
  fallback: StringValue,
): StringValue {
  if (duration === undefined) {
    return fallback;
  }
  assertUnitAnyCase(unit);
  return `${duration}${unit}`;
}

export function expirationInSeconds(
  duration: number | undefined,
  unit: TimeUnitsType,
  fallback: StringValue,
): number {
  const expStr = formatExpiration(duration, unit, fallback);
  return Math.floor(ms(expStr) / 1000);
}