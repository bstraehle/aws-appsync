import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

/** Renames an existing demo item; fails with NotFound if it doesn't exist. */
export function request(ctx) {
  const { id } = ctx.args.input;
  const name = ctx.args.input.name.trim();
  if (!name) {
    util.error('name must not be empty', 'ValidationError');
  }
  return ddb.update({
    key: { id },
    update: { name, updatedAt: util.time.nowISO8601() },
    condition: { id: { attributeExists: true } },
  });
}

export function response(ctx) {
  const { error, result } = ctx;
  if (error) {
    if (error.type === 'DynamoDB:ConditionalCheckFailedException') {
      util.error(`Demo ${ctx.args.input.id} not found`, 'NotFound');
    }
    util.error(error.message, error.type);
  }
  return result;
}
