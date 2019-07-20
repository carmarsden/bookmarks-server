require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

const { NODE_ENV } = require('./config');
const logger = require('./logger');
const bookmarksRouter = require('./bookmarks/bookmarks-router');

const app = express();


// LOGGING & API HANDLING MIDDLEWARE

const morganOption = (NODE_ENV === 'production') ? 'tiny' : 'common';
app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.use(function validateBearerToken(req, res, next) {
    const apiToken = process.env.API_TOKEN;
    const authToken = req.get('Authorization');
  
    if (!authToken || authToken.split(' ')[1] !== apiToken) {
        logger.error(`Unauthorized request to path: ${req.path}`);
        return res.status(401).json({ error: 'Unauthorized request' });
    };

    next();  // move to the next middleware
})


// BASIC ENDPOINT & ROUTING

app.use('/api/bookmarks', bookmarksRouter);

app.get('/', (req, res) => {
    res.send('Hello, world!')
})


// ERROR HANDLING

app.use(function errorHandler(error, req, res, next) {
    let response;
    if (NODE_ENV === 'production') {
        response = { error: { message: 'server error' } };
    } else {
        console.error(error);
        response = { message: error.message, error };
    }
    res.status(500).json(response)
})    

module.exports = app;