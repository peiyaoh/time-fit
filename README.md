# TimeFit

## Project Description

A compact framework for constructing time-based Just-In-Time Adaptive Interventions (JITAIs) that utilize the time of day and/or Fitbit data for intervention adaptation.

Note: This project is periodically updated. Watch the repository for updates.

## Citation

If you use this software, please cite it as below.
```

Hung, P-Y, & Newman, M. W. (2025). TimeFit (Version 0.0.1) [Computer software]. https://github.com/MIACollaborative/time-fit

```


## Getting Started

The current recommended way to use this framework is to fork the repository and write your own application in the /src/apps folder.

### Install the basics

We use yarn as our package manager.

Yarn: https://yarnpkg.com/

### Install MongoDB
Instructions: [download MongoDB community edition](https://www.mongodb.com/docs/manual/administration/install-community/)

### Create folder for storing data

On Mac, create /data/mdata under the home folder, or  ~/data/mdata.

On Windows, create \data\db under the c disk, or c:\data\db.


### Run MongoDB

In command line/terminal:

```bash

# Mac: create ~/data/mdata folder first, and then run the following command in the terminal:
mongod --port 27017 --dbpath ~/data/mdata --replSet rs0 --bind_ip localhost

# Windows: create C:\datea\db  folder first, and then run the following command in the terminal:
mongod  --port 27017 --dbpath "c:\data\db" --replSet rs0 --bind_ip localhost

```
### Install MongoDB GUI

Downlaod [MongoDB compass](https://www.mongodb.com/products/compass) for database GUI (or use command line if you prefer)

### Create Collections

You can create collections through MongoDB compass or command line.

* create a database named "time_fit" 

The frozen Walk-to-Joy study schema is at `/contrib/legacy/prisma/schema.prisma`; reference
it only when working on that quarantined study:
* log
* users
* ...

### Configure environment settings

Create a file named ".env" in the root of the project folder with the following content:

```bash

# mongodb connection string
DATABASE_URL="mongodb://localhost:27017/time_fit?readPreference=primary&appname=MongoDB%20Compass&ssl=false&retryWrites=false"

# for integration with Fitbit API
FITBIT_SUBSCRIPTION_VERIFICATION_CODE=[fitbit subscription verification code]
FITBIT_CLIENT_ID=[fitbit client id]
FITBIT_AUTH_TOKEN=[fitbit authentication token]
FITBIT_AUTH_CODE=[fitbit authorization code]

# for using Mailjet service to send emails
MAILJET_API_KEY=[mailjet api key]
MAILJET_SECRET_KEY=[mailjet secret key]

# for using Twilio service to send SMS/MMS
TWILIO_ACCOUNT_SID=[twilio account id]
TWILIO_AUTH_TOKEN=[twilio authentication token]

```

### Install dependency

Run the following command in the project folder.

```bash

yarn install

```

### Configure Prisma (for database query)

For the frozen study schema at `/contrib/legacy/prisma/schema.prisma`, generate the legacy
client after schema changes.

In a temrinal:

```bash

yarn prisma generate --schema contrib/legacy/prisma/schema.prisma

```

### Run the default sample application

In a temrinal:

```bash

yarn index

```

## Usage examples

[Example 1: Nudge users to take a break every 30 minutes during week days](examples/example1.md)

[Example 2: Nudge users to take a break every 30 minutes during week days if step count is too low](examples/example2.md)


## License

This project is open-sourced under the [BSD 3-Clause License](LICENSE.txt), allowing for free use, distribution, and modification with attribution.
