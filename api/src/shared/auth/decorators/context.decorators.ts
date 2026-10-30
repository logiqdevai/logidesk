import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Authenticated account (any context). Optionally pick a single field. */
export const CurrentAccount = createParamDecorator((field: string | undefined, ctx: ExecutionContext) => {
  const account = ctx.switchToHttp().getRequest().account;
  return field ? account?.[field] : account;
});

/** Workspace (employee) context set by `WorkspaceGuard`. */
export const CurrentWorkspace = createParamDecorator((field: string | undefined, ctx: ExecutionContext) => {
  const workspace = ctx.switchToHttp().getRequest().workspace;
  return field ? workspace?.[field] : workspace;
});

/** Portal (client) context set by `PortalGuard`. */
export const CurrentPortal = createParamDecorator((field: string | undefined, ctx: ExecutionContext) => {
  const portal = ctx.switchToHttp().getRequest().portal;
  return field ? portal?.[field] : portal;
});

export const ClientIp = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip;
});
