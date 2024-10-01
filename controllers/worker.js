const Bull = require('bull');
const { ObjectId } = require('mongodb');
const imageThumbnail = require('image-thumbnail');
const fs = require('fs');
const path = require('path');

const dbClient = require('../utils/db');

// Create a Bull queue for file processing
const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId });
  if (!file) {
    throw new Error('File not found');
  }

  const filePath = path.join('/path/to/files', file.localPath);

  if (!fs.existsSync(filePath)) {
    throw new Error('File not found');
  }

  // Generate thumbnails for sizes 500, 250, and 100
  const sizes = [500, 250, 100];

  try {
    for (const size of sizes) {
      const options = { width: size };
      const thumbnail = imageThumbnail(filePath, options);
      const thumbnailPath = `${filePath}_${size}`;
      fs.writeFileSync(thumbnailPath, thumbnail);
    }
    done();
  } catch (error) {
    done(error);
  }
});
