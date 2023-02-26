declare type Maybe<T> = T | undefined;

declare type Override<A, B> = Pick<A, Exclude<keyof A, keyof B>> & B;

declare type PartialKeys<A, Keys extends keyof A> = Override<
  A,
  Partial<Pick<A, Keys>>
>;

declare type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>;
};
