const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes/index');

const app = express();
const port = process.env.PORT || 5000;
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json());
// load all routes
app.use('/', routes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
