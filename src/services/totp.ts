import {
  generateSync,
  generateSecret as otpGenerateSecret,
  verifySync,
} from "otplib";

const OPTIONS = {
  algorithm: "sha1" as const,
  digits: 6 as const,
  period: 30,
  epochTolerance: 30,
};

export const generateSecret = (): string => otpGenerateSecret({ length: 20 });

export const generate = (secret: string): string =>
  generateSync({
    secret,
    algorithm: OPTIONS.algorithm,
    digits: OPTIONS.digits,
    period: OPTIONS.period,
  });

export const verify = (secret: string, token: string): boolean => {
  const result = verifySync({
    secret,
    token,
    algorithm: OPTIONS.algorithm,
    digits: OPTIONS.digits,
    period: OPTIONS.period,
    epochTolerance: OPTIONS.epochTolerance,
  });
  return result.valid;
};
