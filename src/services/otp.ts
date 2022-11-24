export const otp = (): string =>
  process.env.CODE ??
  Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, "0");
