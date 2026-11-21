import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

/** Gets a demo item by id; returns null if it doesn't exist. */
export function request(ctx) {
  return ddb.get({ key: { id: ctx.args.id } });
}

export function response(ctx) {
  const { error, result } = ctx;
  if (error) {
    util.error(error.message, error.type);
  }
  return result;
}
