import csvWriter from "csv-write-stream";
import fs from "fs";
import MongoDBHelper from "../utilities/MongoDBHelper.mjs";

const databaseName = "walk_to_joy";

MongoDBHelper.getData(databaseName, "logs").then((response) => {
  var writer = csvWriter({ sendHeaders: true });
  writer.pipe(fs.createWriteStream("./test_output.csv"));
  response.forEach((result) => {
    writer.write(result);
  });
  writer.end();
});
