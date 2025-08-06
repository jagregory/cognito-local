import { UnsupportedError } from "../errors";
import type { Services } from "../services";
import type { Context } from "../services/context";
import { isSupportedTarget } from "../targets/Target";
import { Targets } from "../targets/targets";

// biome-ignore lint/suspicious/noExplicitAny: generic route handler
export type Route = (ctx: Context, req: any) => Promise<any>;
export type Router = (target: string) => Route;

export const Router =
  (services: Services): Router =>
  (target: string) => {
    if (!isSupportedTarget(target)) {
      return () =>
        Promise.reject(
          new UnsupportedError(`Unsupported x-amz-target header "${target}"`),
        );
    }

    const t = Targets[target](services);

    return async (ctx, req) => {
      const targetLogger = ctx.logger.child({
        target,
      });

      targetLogger.debug("start");
      const res = await t(
        {
          ...ctx,
          logger: targetLogger,
        },
        req,
      );
      targetLogger.debug("end");
      return res;
    };
  };
