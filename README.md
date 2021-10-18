# Switchboard Feed Factory

A command line tool to fetch, create, and update switchboard data feeds. It currently supports English Premier League (EPL) and National Basketball Association (NBA).


## To Use This Tool

### 1. Install the repository

```bash
git clone git@github.com:switchboard-xyz/switchboard-feed-factory.git
cd switchboard-feed-factory
npm i
```

### 2. Gather Solana Accounts

You will need the following:

#### Solana Keypair with an active balance to fund the new feeds

```bash
solana-keygen new --outfile example-keypair.json
solana airdrop 5 example-keypair.json
```

#### Fulfillment Manager Keypair to manage oracle and data feed permissions

```bash
npm run fulfillment:create
```
or
```bash
ts-node src/main.ts --payerKeypairFile=example-keypair.json --fulfillmentKeypair=fulfillment-keypair.json
```
Upon running this, you will need to copy and paste the output into a terminal to set the environment variables so your local oracle can process any updates.

If you already have a fulfillment manager keypair, make sure it is named fulfillment-keypair.json at the root directory or change the npm commands to point to your keypair.
```bash
export $FULFILLMENT_MANAGER_KEY={YOUR_FULFILLMENT_MANAGER_PUBLIC_KEY}
export $AUTH_KEY={YOUR_FULFILLMENT_MANAGER_AUTHORIZATION_PUBLIC_KEY}
```

### 3. Start the Oracle to Process Updates

```bash
docker-compose up
```
Make sure $FULFILLMENT_MANAGER_KEY and $AUTH_KEY are correctly set or else any updates will fail

### 4. Fetch Data Feeds

You can manually edit the json files or run the following script to fetch gameIds. **Note**: This is only implemented for NBA feeds currently.

```bash
npm run feeds:fetch
```
or
```bash
ts-node src/utils/fetchDataFeeds.ts
```
This will create an output file under ./feeds/**sport**. Copy and paste the applicable Ids to **sport**.feeds.json at the root directory

### 5. Create Data Feeds

```bash
npm run feeds:create
```
or
```bash
ts-node src/main.ts --payerKeypairFile=example-keypair.json --fulfillmentKeypair=fulfillment-keypair.json
```
This will create a JSON output at the root directory named CreatedFeeds-**sport**-**timestamp**.json. This file contains the public key of the data feed and authorization account, the jobs in the data feed, and data feed configuration 
  
### 6. Update Data Feeds
  ```bash
npm run feeds:update
```
or
  ```bash
ts-node src/utils/updateDataFeed.ts --payerKeypairFile=example-keypair.json
```
Select the output file from the previous step. If the game has completed, the data feed update will resolve output the result to the terminal.
  
## Feed Results

When "update" is called on a resulting feed, the following results can be expected for each job:

- _RESULT_UNFINISHED_ (**-1**) - The game has not been completed.
- _RESULT_DRAW_ (**0**)  The game has not been completed.
- _RESULT_HOME_WIN_ (**1**) - The game has not been completed.
- _RESULT_AWAY_WIN_ (**2**) - The game has not been completed.
