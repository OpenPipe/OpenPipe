import { TRPC_ERROR_CODE_HTTP_STATUS } from "trpc-openapi/dist/adapters/node-http/errors";

type KeyFromValue<TValue, TType extends Record<PropertyKey, PropertyKey>> = {
  [K in keyof TType]: TValue extends TType[K] ? K : never;
}[keyof TType];

type Invert<TType extends Record<PropertyKey, PropertyKey>> = {
  [TValue in TType[keyof TType]]: KeyFromValue<TValue, TType>;
};

export function invert<TRecord extends Record<PropertyKey, PropertyKey>>(
  obj: TRecord,
): Invert<TRecord> {
  const newObj = Object.create(null);
  for (const key in obj) {
    const v = obj[key];
    newObj[v] = key;
  }
  return newObj as Invert<TRecord>;
}

const TRPC_HTTP_STATUS_ERROR_CODE = invert(TRPC_ERROR_CODE_HTTP_STATUS);

export const statusCodeFromTrpcCode = (errorCode = "INTERNAL_SERVER_ERROR") => {
  return TRPC_ERROR_CODE_HTTP_STATUS[errorCode as keyof typeof TRPC_ERROR_CODE_HTTP_STATUS] ?? 500;
};

export const trpcCodeFromHttpStatus = (httpStatus = 500) => {
  return TRPC_HTTP_STATUS_ERROR_CODE[httpStatus] ?? "INTERNAL_SERVER_ERROR";
};
