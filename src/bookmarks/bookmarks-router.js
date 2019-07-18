const express = require('express');
const uuid = require('uuid/v4');
const logger = require('../logger');
const bookmarks = require('../store');
const BookmarksService = require('./bookmarks-service');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

bookmarksRouter
    .route('/bookmarks')
    .get((req, res, next) => {
        BookmarksService.getAllBookmarks(req.app.get('db'))
            .then(bookmarks => res.json(bookmarks))
            .catch(next)
        ;
    })
    .post(bodyParser, (req, res) => {
        let { title, url, description='', rating=1 } = req.body;
  
        // validate title & url exist
        if (!title) {
            logger.error(`Title is required`);
            return res.status(400).send('Invalid data');
        }
        if (!url) {
            logger.error(`URL is required`);
            return res.status(400).send('Invalid data');
        }

        // ensure rating is an integer 1-5
        if (!Number.isInteger(rating)) {
            const numRating = Number.parseInt(rating);
            if (Number.isNaN(numRating)) {
                logger.error(`Rating must be an integer`);
                return res.status(400).send('Invalid data');
            }
            rating = numRating;
        }
        if (rating < 0 || rating > 5) {
            logger.error(`Rating must be an integer from 1 to 5`);
            return res.status(400).send('Invalid data');
        }

        const id = uuid();
        const bookmark = {
        id,
        title,
        url,
        description,
        rating
        };
        bookmarks.push(bookmark);    
        
        logger.info(`Bookmark with id ${id} created`);    
        res
            .status(201)
            .location(`http://localhost:8000/bookmark/${id}`)
            .json(bookmark);
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
    .delete((req, res) => {
        const { id } = req.params;
        const bmarkIndex = bookmarks.findIndex(bmark => bmark.id == id);
    
        if (bmarkIndex === -1) {
            logger.error(`Bookmark with id ${id} not found.`);
            return res.status(404).send('Bookmark Not found');
        }

        bookmarks.splice(bmarkIndex, 1);
      
        logger.info(`Bookmark with id ${id} deleted.`);
        res
          .status(204)
          .end();    
    })
;

module.exports = bookmarksRouter;