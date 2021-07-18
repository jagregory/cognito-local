export const otp = (): string =>
  Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
