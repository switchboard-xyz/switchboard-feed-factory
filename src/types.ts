export interface FeedType {
  // (required) is used to name the output file where the feed's account keypair is stored.
  name: string;
  // (optional) will add an ESPN job for the specified match when provided.
  espnId?: string;
  // (optional) will add a Yahoo Sports job for the specified match when provided.
  yahooId?: string;
}
export class FactoryError extends Error {
  constructor(message: string, type?: string) {
    super(message);
    this.name = type ? type : "FactoryError";
  }
}

// export default FeedType;
