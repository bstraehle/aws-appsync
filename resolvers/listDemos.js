import { util } from '@aws-appsync/utils';
import * as ddb from '@aws-appsync/utils/dynamodb';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Scans demo items, optionally filtered, one page at a time. */
export function request(ctx) {
  const { filter, nextToken } = ctx.args;
  const requested = ctx.args.limit === null || ctx.args.limit === undefined ? DEFAULT_LIMIT : ctx.args.limit;
  if (requested < 1) {
    util.error('limit must be at least 1', 'ValidationError');
  }
  return ddb.scan({ limit: Math.min(requested, MAX_LIMIT), nextToken, filter });
}

export function response(ctx) {
  const { error, result } = ctx;
  if (error) {
    util.error(error.message, error.type);
  }
  return { items: result.items, nextToken: result.nextToken };
}
