const sha1 = require('sha1');
const dbClient = require('../utils/db');

class UserController {
  /* create a new user */
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      // check if the user already exists
      const exisitingUser = await dbClient.db.collection('users').findOne({ email });
      if (exisitingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }
      // Hash password with SHA1
      const hashedPassword = sha1(password);

      const result = await dbClient.db.collection('users').insertOne({
        email,
        password: hashedPassword,
      });

      return res.status(201).json({
        id: result.insertedId,
        email,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = UserController;
