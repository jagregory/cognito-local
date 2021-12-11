import { Logger } from "../log";
import { Services } from "../services";
import { UnsupportedError } from "../errors";
import { AdminDeleteUserAttributes } from "./adminDeleteUserAttributes";
import { AdminSetUserPassword } from "./adminSetUserPassword";
import { ConfirmForgotPassword } from "./confirmForgotPassword";
import { ConfirmSignUp } from "./confirmSignUp";
import { CreateGroup } from "./createGroup";
import { CreateUserPool } from "./createUserPool";
import { CreateUserPoolClient } from "./createUserPoolClient";
import { DeleteUser } from "./deleteUser";
import { DeleteUserAttributes } from "./deleteUserAttributes";
import { DescribeUserPoolClient } from "./describeUserPoolClient";
import { ForgotPassword } from "./forgotPassword";
import { ChangePassword } from "./changePassword";
import { GetUserAttributeVerificationCode } from "./getUserAttributeVerificationCode";
import { InitiateAuth } from "./initiateAuth";
import { ListGroups } from "./listGroups";
import { ListUserPools } from "./listUserPools";
import { ListUsers } from "./listUsers";
import { RespondToAuthChallenge } from "./respondToAuthChallenge";
import { SignUp } from "./signUp";
import { GetUser } from "./getUser";
import { AdminCreateUser } from "./adminCreateUser";
import { AdminGetUser } from "./adminGetUser";
import { AdminDeleteUser } from "./adminDeleteUser";
import { AdminConfirmSignUp } from "./adminConfirmSignUp";
import { AdminUpdateUserAttributes } from "./adminUpdateUserAttributes";
import { AdminInitiateAuth } from "./adminInitiateAuth";
import { RevokeToken } from "./revokeToken";
import { UpdateUserAttributes } from "./updateUserAttributes";
import { VerifyUserAttribute } from "./verifyUserAttribute";

export const Targets = {
  AdminConfirmSignUp,
  AdminCreateUser,
  AdminDeleteUser,
  AdminDeleteUserAttributes,
  AdminGetUser,
  AdminInitiateAuth,
  AdminSetUserPassword,
  AdminUpdateUserAttributes,
  ChangePassword,
  ConfirmForgotPassword,
  ConfirmSignUp,
  CreateGroup,
  CreateUserPool,
  CreateUserPoolClient,
  DeleteUser,
  DeleteUserAttributes,
  DescribeUserPoolClient,
  ForgotPassword,
  GetUser,
  GetUserAttributeVerificationCode,
  InitiateAuth,
  ListGroups,
  ListUserPools,
  ListUsers,
  RespondToAuthChallenge,
  RevokeToken,
  SignUp,
  UpdateUserAttributes,
  VerifyUserAttribute,
} as const;

type TargetName = keyof typeof Targets;

export type Context = { readonly logger: Logger };
export type Target<Req extends {}, Res extends {}> = (
  ctx: Context,
  req: Req
) => Promise<Res>;

export const isSupportedTarget = (name: string): name is TargetName =>
  Object.keys(Targets).includes(name);

// eslint-disable-next-line
export type Route = (ctx: Context, req: any) => Promise<any>;
export type Router = (target: string) => Route;

export const Router =
  (services: Services): Router =>
  (target: string) => {
    if (!isSupportedTarget(target)) {
      return () =>
        Promise.reject(
          new UnsupportedError(`Unsupported x-amz-target header "${target}"`)
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
        req
      );
      targetLogger.debug("end");
      return res;
    };
  };
