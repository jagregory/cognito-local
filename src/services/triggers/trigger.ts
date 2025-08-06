import type { Context } from "../context";

export type Trigger<
  Params extends {},
  // biome-ignore lint/suspicious/noConfusingVoidType: some triggers don't return a value
  Res extends object | null | undefined | void,
> = (ctx: Context, params: Params) => Promise<Res>;
