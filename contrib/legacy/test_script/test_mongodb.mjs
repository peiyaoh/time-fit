import MongoDBHelper from "../utilities/MongoDBHelper.mjs"
import * as dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
    dotenv.config();
}

const mHelper = new MongoDBHelper();

const databaseName = "walk_to_joy";

//mHelper.testConnection();


// MongoDBHelper.insertDataIntoTable("walk_to_joy", "logs", [{message: "test3"}], true);

MongoDBHelper.getData("walk_to_joy", "logs")
    .then((results) => {
        console.log(`results: ${JSON.stringify(results)}`);
    });


