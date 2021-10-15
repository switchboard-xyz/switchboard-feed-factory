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
export class JobError extends FactoryError {
  constructor(message: string) {
    super(message, "JobError");
  }
}
