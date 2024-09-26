import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
    constructor() {
        this.client = redis.createClient();
        this.isClientConnected= true;

        this.client.on('error', (err)=> {
            console.error(`Redis client not connected to the server: ${err.message}`);
        });
        this.client.on('ready', () => {
            console.log('Redis client connected to the server');
        });
        this.getAsync = promisify(this.client.get).bind(this.client);
        this.setAsync = promisify(this.client.set).bind(this.client);
        this.delAsync = promisify(this.client.del).bind(this.client);
    }
     isAlive() {
        return this.isClientConnected;
    };

          // Asynchronous function to get the value of a key from Redis

        async get(key) {
           try {
            
            const value = await this.getAsync(key);
            return value;
           } catch (error)
              {
                return null;
              }
        }
        async set(key, value, duration) {
            try {
                await this.setAsync(key, value, 'EX', duration);
              } catch (err) {
                console.error(`Error setting key ${key} in Redis: ${err.message}`);
              }
           
        }
        async del(key) {
           try {
            await this.delAsync(key);
           }
           catch (error) {
               console.error(error);
           }
        }
    }


    const redisClient = new RedisClient();
    module.exports = redisClient;