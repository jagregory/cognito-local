import { Services } from "../services";
import { UnsupportedError } from "../errors";
import { ConfirmSignUp } from "./confirmSignUp";
import { ForgotPassword } from "./ForgotPassword";
import { InitiateAuth } from "./initiateAuth";
import { SignUp } from "./signUp";

export const Targets = {
  ConfirmSignUp,
  ForgotPassword,
  InitiateAuth,
  SignUp,
};

type TargetName = keyof typeof Targets;

export const isSupportedTarget = (name: string): name is TargetName =>
  Object.keys(Targets).includes(name);

// eslint-disable-next-line
export type Route = (body: any) => Promise<any>;
export type Router = (target: string) => Route;

export const Router = (services: Services): Router => (target: string) => {
  if (!isSupportedTarget(target)) {
    return () =>
      Promise.reject(
        new UnsupportedError(`Unsupported x-amz-target header "${target}"`)
      );
  }

  return Targets[target](services);
};
