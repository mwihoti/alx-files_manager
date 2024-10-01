const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const validTypes = ['folder', 'file', 'image'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileDoc = {
      userId,
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : ObjectId(parentId),
    };

    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileDoc);
      return res.status(201).json({
        id: result.insertedId,
        ...fileDoc,
      });
    }
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const fileId = uuidv4();
    const localPath = path.join(folderPath, fileId);
    const decodedData = Buffer.from(data, 'base64');

    try {
      fs.writeFileSync(localPath, decodedData);
    } catch (err) {
      return res.status(500).json({ error: 'Error saving the file' });
    }

    fileDoc.localPath = localPath;

    const result = await dbClient.db.collection('files').insertOne(fileDoc);

    return res.status(201).json({
      id: result.insertedId,
      ...fileDoc,
    });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    if (!ObjectId.isValid(fileId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    try {
      const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      const response = {
        id: file._id.toString(),
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId.toString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page, 10) || 0;
    const pageSize = 20;
    const skip = page * pageSize;

    const query = { userId, parentId: parentId === 0 ? 0 : ObjectId(parentId) };

    try {
      const files = await dbClient.db.collection('files')
        .aggregate([
          { $match: query },
          { $skip: skip },
          { $limit: pageSize },
        ])
        .toArray();
      const formattedFiles = files.map((file) => ({
        id: file._id.toString(),
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId.toString(),
      }));

      return res.status(200).json(formattedFiles);
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    if (!ObjectId.isValid(fileId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    try {
      await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });
      const updatedFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
      return res.status(200).json({
        id: updatedFile._id.toString(),
        userId: updatedFile.userId,
        name: updatedFile.name,
        type: updatedFile.type,
        isPublic: updatedFile.isPublic,
        parentId: updatedFile.parentId.toString(),
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT /files/:id/unpublish
  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    if (!ObjectId.isValid(fileId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    try {
      await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });
      const updatedFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
      return res.status(200).json({
        id: updatedFile._id.toString(),
        userId: updatedFile.userId,
        name: updatedFile.name,
        type: updatedFile.type,
        isPublic: updatedFile.isPublic,
        parentId: updatedFile.parentId.toString(),
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getFile(req, res) {
    const fileId = req.params.id;

    if (!ObjectId.isValid(fileId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    const token = req.headers['x-token'];
    let userId = null;

    if (token) {
      userId = await redisClient.get(`auth_${token}`);
    }
    // If the file is not public and the user is not authenticated or is not the owner
    if (!file.isPublic && (!userId || userId !== file.userId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    // If the file is a folder
    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    const filePath = path.join('/path/to/files', file.localPath); // Update this to your actual file storage location

    // If the file does not exist on the local storage
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    try {
      const mimeType = mime.lookup(file.name);
      res.setHeader('Content-Type', mimeType);
      const fileContent = fs.readFileSync(filePath);
      return res.status(200).send(fileContent);
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = FilesController;
