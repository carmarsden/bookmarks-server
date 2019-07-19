const express = require('express');
const xss = require('xss');
const logger = require('../logger');
const bookmarks = require('../store');
const BookmarksService = require('./bookmarks-service');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const cleanBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: bookmark.url,
    description: xss(bookmark.description),
    rating: Number(bookmark.rating),
})

bookmarksRouter
    .route('/bookmarks')
    .get((req, res, next) => {
        BookmarksService.getAllBookmarks(req.app.get('db'))
            .then(bookmarks => res.json(bookmarks))
            .catch(next)
        ;
    })
    .post(bodyParser, (req, res, next) => {
        // check title & url were sent
        for (const field of ['title', 'url']) {
            if (!req.body[field]) {
                logger.error(`${field} is required`);
                return res.status(400).json({
                    error: { message: `Missing '${field}' in request body` }
                })
            }
        }

        // create bookmark object to post
        const { title, url, description='', rating=1 } = req.body;
        const newBookmark = { title, url, description, rating };

        // manipulate & validate rating is an integer 1-5
        newBookmark.rating = Number.parseInt(newBookmark.rating);  
        if (!Number.isInteger(newBookmark.rating) || newBookmark.rating < 0 || newBookmark.rating > 5) {
            logger.error(`Rating must be an integer from 1 to 5`);
            return res.status(400).send('Invalid data');
        }

        // post action
        BookmarksService.insertBookmark(req.app.get('db'), newBookmark)
            .then(bookmark => {
                logger.info(`Bookmark with id ${bookmark.id} created`);
                res
                    .status(201)
                    .location(`/bookmarks/${bookmark.id}`)
                    .json(cleanBookmark(bookmark))
                ;
            })
            .catch(next)
        ;
    })
;

bookmarksRouter
    .route('/bookmarks/:id')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db');
        const id = req.params.id;
        BookmarksService.getById(knexInstance, id)
            .then(bookmark => {
                if (!bookmark) {
                    logger.error(`Bookmark with id ${id} not found.`);
                    return res.status(404).json({
                        error: { message: `Bookmark not found` }
                    })
                }
                res.json(bookmark)
            })
            .catch(next)
        ;
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