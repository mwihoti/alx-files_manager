const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const database = process.env.DB_DATABASE || 'files_manager';
    const dbURL = `mongodb://${host}:${port}/${database}`;

    this.client = new MongoClient(dbURL, { useUnifiedTopology: true });
    this.db = null;

    this.client.connect()
      .then(() => {
        this.db = this.client.db(database);
        console.log('Connected to MongoDB successfully');
      })
      .catch((err) => {
        console.error('Failed to connect to MongoDB', err);
      });
  }

  /**
   * Checks if the MongoDB connection is alive.
   * @returns {boolean}
   */
  isAlive() {
    return this.db !== null;
  }

  /**
   * Retrieves the number of users in the "users" collection.
   * @returns {Promise<number>}
   */
  async nbUsers() {
    if (!this.isAlive()) {
      console.error('No MongoDB connection');
      return 0;
    }
    try {
      return await this.db.collection('users').countDocuments();
    } catch (err) {
      console.error('Failed to retrieve the number of users', err);
      return 0;
    }
  }

  /**
   * Retrieves the number of files in the "files" collection.
   * @returns {Promise<number>}
   */
  async nbFiles() {
    if (!this.isAlive()) {
      console.error('No MongoDB connection');
      return 0;
    }
    try {
      return await this.db.collection('files').countDocuments();
    } catch (err) {
      console.error('Failed to retrieve the number of files', err);
      return 0;
    }
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
