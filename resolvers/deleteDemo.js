import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

/** Deletes a demo item and returns it; fails with NotFound if it doesn't exist. */
export function request(ctx) {
  return ddb.remove({
    key: { id: ctx.args.input.id },
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
  // AppSync treats a failed condition as success when the item is already
  // gone (the end state matches), so a missing item shows up as no result.
  if (!result) {
    util.error(`Demo ${ctx.args.input.id} not found`, 'NotFound');
  }
  return result;
}
