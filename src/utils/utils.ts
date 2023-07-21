export const truthyFilter = <T>(x: T | null | undefined): x is T => Boolean(x);
