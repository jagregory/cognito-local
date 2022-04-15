export const otp = (): string =>
  Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, "0");
