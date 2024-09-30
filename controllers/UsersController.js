const  dbClient = require('../utils/db');

class UsersController {
    /* create a new user */
    static async  PostUsers(req, res) {
        const {email, password} = req.body;

        if (!email) {
          return res.status(400).json({error: 'Missing email' });  
        }

        if (!password) {
            return res.status(400).json({error: 'Missing password'})
        }


    }
 
}

module.exports = UsersController;