import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

/** Creates a demo item with a generated id and timestamps. */
export function request(ctx) {
  const name = ctx.args.input.name.trim();
  if (!name) {
    util.error('name must not be empty', 'ValidationError');
  }
  const now = util.time.nowISO8601();
  return ddb.put({
    key: { id: util.autoId() },
    item: { name, createdAt: now, updatedAt: now },
    condition: { id: { attributeExists: false } },
  });
}

export function response(ctx) {
  const { error, result } = ctx;
  if (error) {
    util.error(error.message, error.type);
  }
  return result;
}
