const path = require('path');
const express = require('express');
const xss = require('xss');
const logger = require('../logger');
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
    .route('/')
    .get((req, res, next) => {
        BookmarksService.getAllBookmarks(req.app.get('db'))
            .then(bookmarks => {
                res.json(bookmarks.map(cleanBookmark))
            })
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
            return res.status(400).json({
                error: { message: `Rating must be an integer from 1 to 5` }
            });
        }

        // post action
        BookmarksService.insertBookmark(req.app.get('db'), newBookmark)
            .then(bookmark => {
                logger.info(`Bookmark with id ${bookmark.id} created`);
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `${bookmark.id}`))
                    .json(cleanBookmark(bookmark))
                ;
            })
            .catch(next)
        ;
    })
;

bookmarksRouter
    .route('/:id')
    .all((req, res, next) => {
        const id = req.params.id;
        BookmarksService.getById(req.app.get('db'), id)
            .then(bookmark => {
                if (!bookmark) {
                    logger.error(`Bookmark with id ${id} not found`);
                    return res.status(404).json({
                        error: { message: `Bookmark not found` }
                    })
                };
                res.bookmark = bookmark; // pass the bookmark as req.bookmark to next middleware
                next()
            })
            .catch(next)
        ;
    })
    .get((req, res) => {
        res.json(cleanBookmark(res.bookmark));
    })
    .delete((req, res, next) => {
        const id = req.params.id;
        BookmarksService.deleteBookmark(req.app.get('db'), id)
            .then(numRowsAffected => {
                logger.info(`Bookmark with id ${id} deleted.`);
                res.status(204).end();
            })
            .catch(next)
        ;
    })
    .patch(bodyParser, (req, res, next) => {
        const { title, url, description, rating } = req.body;
        const bookmarkToUpdate = { title, url, description, rating };

        // manipulate & validate rating is an integer 1-5
        if (bookmarkToUpdate.rating) {
            bookmarkToUpdate.rating = Number.parseInt(bookmarkToUpdate.rating);  
            if (!Number.isInteger(bookmarkToUpdate.rating) || bookmarkToUpdate.rating < 0 || bookmarkToUpdate.rating > 5) {
                logger.error(`Rating must be an integer from 1 to 5`);
                return res.status(400).json({
                    error: { message: `Rating must be an integer from 1 to 5` }
                });
            }    
        }

        const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length;
        if (numberOfValues === 0) {
            logger.error(`Invalid update: missing update fields`);
            return res.status(400).json({
                error: { message: `Request body must contain title, url, description, or rating` }
            })
        }

        BookmarksService.updateBookmark(req.app.get('db'), req.params.id, bookmarkToUpdate)
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
        ;
    })
;

module.exports = bookmarksRouter;