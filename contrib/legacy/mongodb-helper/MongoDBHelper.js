import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { DateTime } from "luxon";

class MongoDBHelper {
  constructor() {}

  static initMongoClient() {
    console.log(`${this.name} initMongoClient`);
    
    let client = new MongoClient(process.env.DATABASE_URL, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    return client;
  }

  static async getDataFromTable(tableName, query = {}, options = {}) {
    console.log(`${this.name} getDataFromTable: ${tableName}`);

    let resultList = [];
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      let cursor = docs.find(query, options);
      resultList = await cursor.toArray();
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return resultList;
  }

  static async insertDataToTable(tableName, data) {
    console.log(`${this.name} insertDataToTable: ${tableName}`);

    let result = null;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      result = await docs.insertOne(data);
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async updateDataInTable(tableName, query, updateData) {
    console.log(`${this.name} updateDataInTable: ${tableName}`);

    let result = null;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      result = await docs.updateMany(query, { $set: updateData });
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async deleteDataFromTable(tableName, query) {
    console.log(`${this.name} deleteDataFromTable: ${tableName}`);

    let result = null;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      result = await docs.deleteMany(query);
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async aggregateData(tableName, pipeline) {
    console.log(`${this.name} aggregateData: ${tableName}`);

    let resultList = [];
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      let cursor = docs.aggregate(pipeline);
      resultList = await cursor.toArray();
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return resultList;
  }

  static async createIndex(tableName, indexSpec, options = {}) {
    console.log(`${this.name} createIndex: ${tableName}`);

    let result = null;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      result = await docs.createIndex(indexSpec, options);
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async bulkWrite(tableName, operations) {
    console.log(`${this.name} bulkWrite: ${tableName}`);

    let result = null;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      result = await docs.bulkWrite(operations);
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async getCollectionStats(tableName) {
    console.log(`${this.name} getCollectionStats: ${tableName}`);

    let result = null;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      result = await client.db("walk_to_joy").collection(tableName).stats();
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async dropCollection(tableName) {
    console.log(`${this.name} dropCollection: ${tableName}`);

    let result = null;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      result = await client.db("walk_to_joy").collection(tableName).drop();
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async countDocuments(tableName, query = {}) {
    console.log(`${this.name} countDocuments: ${tableName}`);

    let result = 0;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      result = await docs.countDocuments(query);
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async distinct(tableName, field, query = {}) {
    console.log(`${this.name} distinct: ${tableName}`);

    let result = [];
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      result = await docs.distinct(field, query);
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async findOne(tableName, query = {}, options = {}) {
    console.log(`${this.name} findOne: ${tableName}`);

    let result = null;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      result = await docs.findOne(query, options);
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async findById(tableName, id) {
    console.log(`${this.name} findById: ${tableName}`);

    let result = null;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      result = await docs.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async insertMany(tableName, dataArray) {
    console.log(`${this.name} insertMany: ${tableName}`);

    let result = null;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      result = await docs.insertMany(dataArray);
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async updateOne(tableName, query, updateData, options = {}) {
    console.log(`${this.name} updateOne: ${tableName}`);

    let result = null;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      result = await docs.updateOne(query, updateData, options);
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async deleteOne(tableName, query) {
    console.log(`${this.name} deleteOne: ${tableName}`);

    let result = null;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      result = await docs.deleteOne(query);
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }

  static async replaceOne(tableName, query, replacement, options = {}) {
    console.log(`${this.name} replaceOne: ${tableName}`);

    let result = null;
    let client = MongoDBHelper.initMongoClient();

    try {
      await client.connect();
      const database = await client.db("walk_to_joy").command({ ping: 1 });
      const docs = await client.db("walk_to_joy").collection(tableName);

      result = await docs.replaceOne(query, replacement, options);
    } catch (error) {
      console.error(error);
    } finally {
      await client.close();
    }

    return result;
  }
}

export default MongoDBHelper;
