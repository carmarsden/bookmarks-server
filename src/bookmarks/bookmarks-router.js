const express = require('express');
const uuid = require('uuid/v4');
const logger = require('../logger');
const bookmarks = require('../store');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

bookmarksRouter
    .route('/bookmarks')
    .get((req, res) => {
        res.json(bookmarks);
    })
;

bookmarksRouter
    .route('/bookmarks/:id')
    .get((req, res) => {
        const { id } = req.params;
        const bookmark = bookmarks.find(bmark => bmark.id == id);
      
        if (!bookmark) {
            logger.error(`Bookmark with id ${id} not found.`);
            return res.status(404).send('Bookmark Not Found');
        }
      
        res.json(bookmark);
    })
;

module.exports = bookmarksRouter;