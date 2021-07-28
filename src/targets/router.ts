import { Logger } from "../log";
import { Services } from "../services";
import { UnsupportedError } from "../errors";
import { ConfirmForgotPassword } from "./confirmForgotPassword";
import { ConfirmSignUp } from "./confirmSignUp";
import { CreateUserPoolClient } from "./createUserPoolClient";
import { DescribeUserPoolClient } from "./describeUserPoolClient";
import { ForgotPassword } from "./forgotPassword";
import { ChangePassword } from "./changePassword";
import { InitiateAuth } from "./initiateAuth";
import { ListUsers } from "./listUsers";
import { RespondToAuthChallenge } from "./respondToAuthChallenge";
import { SignUp } from "./signUp";
import { GetUser } from "./getUser";
import { AdminCreateUser } from "./adminCreateUser";
import { AdminGetUser } from "./adminGetUser";
import { AdminDeleteUser } from "./adminDeleteUser";
import { AdminConfirmSignUp } from "./adminConfirmSignUp";
import { AdminUpdateUserAttributes } from "./adminUpdateUserAttributes";

export const Targets = {
  AdminConfirmSignUp,
  AdminCreateUser,
  AdminDeleteUser,
  AdminGetUser,
  AdminUpdateUserAttributes,
  ChangePassword,
  ConfirmForgotPassword,
  ConfirmSignUp,
  CreateUserPoolClient,
  DescribeUserPoolClient,
  ForgotPassword,
  GetUser,
  InitiateAuth,
  ListUsers,
  RespondToAuthChallenge,
  SignUp,
};

type TargetName = keyof typeof Targets;

export const isSupportedTarget = (name: string): name is TargetName =>
  Object.keys(Targets).includes(name);

// eslint-disable-next-line
export type Route = (body: any) => Promise<any>;
export type Router = (target: string) => Route;

export const Router = (services: Services, logger: Logger): Router => (
  target: string
) => {
  if (!isSupportedTarget(target)) {
    return () =>
      Promise.reject(
        new UnsupportedError(`Unsupported x-amz-target header "${target}"`)
      );
  }

  return Targets[target](services, logger);
};
