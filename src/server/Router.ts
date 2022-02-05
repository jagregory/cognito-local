import { Logger } from "../log";
import { Services } from "../services";
import { UnsupportedError } from "../errors";
import { AdminDeleteUserAttributes } from "../targets/adminDeleteUserAttributes";
import { AdminSetUserPassword } from "../targets/adminSetUserPassword";
import { ConfirmForgotPassword } from "../targets/confirmForgotPassword";
import { ConfirmSignUp } from "../targets/confirmSignUp";
import { CreateGroup } from "../targets/createGroup";
import { CreateUserPool } from "../targets/createUserPool";
import { CreateUserPoolClient } from "../targets/createUserPoolClient";
import { DeleteUser } from "../targets/deleteUser";
import { DeleteUserAttributes } from "../targets/deleteUserAttributes";
import { DescribeUserPoolClient } from "../targets/describeUserPoolClient";
import { ForgotPassword } from "../targets/forgotPassword";
import { ChangePassword } from "../targets/changePassword";
import { GetUserAttributeVerificationCode } from "../targets/getUserAttributeVerificationCode";
import { InitiateAuth } from "../targets/initiateAuth";
import { ListGroups } from "../targets/listGroups";
import { ListUserPools } from "../targets/listUserPools";
import { ListUsers } from "../targets/listUsers";
import { RespondToAuthChallenge } from "../targets/respondToAuthChallenge";
import { SignUp } from "../targets/signUp";
import { GetUser } from "../targets/getUser";
import { AdminCreateUser } from "../targets/adminCreateUser";
import { AdminGetUser } from "../targets/adminGetUser";
import { AdminDeleteUser } from "../targets/adminDeleteUser";
import { AdminConfirmSignUp } from "../targets/adminConfirmSignUp";
import { AdminUpdateUserAttributes } from "../targets/adminUpdateUserAttributes";
import { AdminInitiateAuth } from "../targets/adminInitiateAuth";
import { RevokeToken } from "../targets/revokeToken";
import { UpdateUserAttributes } from "../targets/updateUserAttributes";
import { VerifyUserAttribute } from "../targets/verifyUserAttribute";

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
