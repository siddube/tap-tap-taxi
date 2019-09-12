const path = require('path');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 4200;
const publicPath = path.join(__dirname, '../public');
app.use('/assets', express.static(publicPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(port, () => {
  console.log(`TapTapTaxi running on  localhost:${port}`);
});