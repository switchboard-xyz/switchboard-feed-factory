import chalk from "chalk";

export class FactoryError extends Error {
  constructor(message: string, type?: string) {
    super(message);
    this.name = type ? type : "FactoryError";
  }
  public toString(): string {
    return `${this.name}:: ${this.message}`;
  }
  public toFormattedString(): string {
    return `${chalk.red(this.name)}:: ${this.message}`;
  }
}

export class SwitchboardError extends FactoryError {
  constructor(message: string) {
    super(message, "SwitchboardError");
  }
}
export class ConfigError extends FactoryError {
  constructor(message: string) {
    super(message, "ConfigError");
  }
}
export class JsonInputError extends FactoryError {
  constructor(message: string) {
    super(message, "JsonInputError");
  }
}
export class VerifyError extends FactoryError {
  constructor(message: string) {
    super(message, "VerifyError");
  }
}

// // https://dev.to/duunitori/mimicing-rust-s-result-type-in-typescript-3pn1
// export type FactoryResult<T, E> = Ok<T, E> | Err<T, E>;

// export class Ok<T, E> {
//   public constructor(public readonly value: T) {}
//   public isOk(): this is Ok<T, E> {
//     return true;
//   }
//   public isErr(): this is Err<T, E> {
//     return false;
//   }
// }

// export class Err<T, E> {
//   public constructor(public readonly error: E) {}
//   public isOk(): this is Ok<T, E> {
//     return false;
//   }
//   public isErr(): this is Err<T, E> {
//     return true;
//   }
// }

// /**
//  * Construct a new Ok result value.
//  */
// export const ok = <T, E>(value: T): Ok<T, E> => new Ok(value);

// /**
//  * Construct a new Err result value.
//  */
// export const err = <T, E>(error: E): Err<T, E> => new Err(error);
