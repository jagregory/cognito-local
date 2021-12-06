import { Context } from "../context";

export type Trigger<Params extends {}, Res extends {} | null | void> = (
  ctx: Context,
  params: Params
) => Promise<Res>;
