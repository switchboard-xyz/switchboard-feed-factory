# Switchboard EPL Feeds

A small example script on producing EPL data feeds and publishing to Switchboard's oracle network.

## Feed Results

When "update" is called on a resulting feed, the following results can be expected for each job:

- _RESULT_UNFINISHED_ (**-1**) - The game has not been completed.
- _RESULT_DRAW_ (**0**) - The game has not been completed.
- _RESULT_HOME_WIN_ (**1**) - The game has not been completed.
- _RESULT_AWAY_WIN_ (**2**) - The game has not been completed.

## To Use This Tool

### 1. Install the repository

```bash
git clone git@github.com:jessupjn/switchboard-epl-feeds.git
cd switchboard-epl-feeds
npm i
```

### 2. Add EPL matches to [./src/feeds.json](./src/feeds.json)

Feeds are defined in the following format:

```JSON
{
  // "name" (Required) - Used to name the resulting keypair file.
  "name": "NewcastleUnited-vs-WestHamUnited-August15",
  // "espnId" (Optional) - Adds an ESPN job for the specified match to the feed if provided.
  "espnId": "606037",
  // "yahooId" (Optional) - Adds a Yahoo Sports job for the specified match to the feed if provided.
  "yahooId": "newcastle-united-west-ham-united-2247017"
}
```

### 3. Gather Accounts

You will need the following:

#### Solana Keypair with an active balance to fund the new feeds

```bash
solana-keygen new --outfile example-keypair.json
solana airdrop 5 example-keypair.json
```

#### Fulfillment Manager Public Key

If you need to create a new one:

```bash
export FULFILLMENT_MANAGER_KEY="$(ts-node src/utils/createFFManager.ts --payerKeypairFile=example-keypair.json)"
```

### 4. Run the tool

```bash
ts-node src/main.ts --payerKeypairFile=example-keypair.json --fulfillmentManager=${FULFILLMENT_MANAGER_KEY?}
```
