const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const makeBookmarksArray = require('./bookmarks.fixtures');

const API_TOKEN = process.env.API_TOKEN;

describe('Bookmarks Endpoints', () => {
    let db;

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        });
        app.set('db', db);
    });

    before('start with clean table', () => db('bookmarks').truncate());
    afterEach('cleanup after tests', () => db('bookmarks').truncate());
    after('disconnect from db', () => db.destroy());

    describe('Unauthorized requests', () => {
        it('responds with 401 for GET /bookmarks', () => {
            return supertest(app)
                .get('/bookmarks')
                .expect(401, { error: 'Unauthorized request' })
            ;
        })

        it('responds with 401 for GET /bookmarks/:id', () => {
            return supertest(app)
                .get('/bookmarks/:id')
                .expect(401, { error: 'Unauthorized request' })
            ;
        })

    })

    // BOOKMARKS ENDPOINT
    describe('GET /bookmarks', () => {
        context('Given no bookmarks', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .expect(200, [])
                ;
            })
        })

        context('Given bookmarks already in the database', () => {
            const testBookmarks = makeBookmarksArray();
    
            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
                ;
            })
    
            it('responds with 200 and all bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .expect(200, testBookmarks)
                ;
            })
        })
    })

    // BOOKMARKS/:ID ENDPOINT
    describe('GET /bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it('responds with 404 not found', () => {
                const bookmarkId = 123;
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .expect(404, { error: { message: 'Bookmark not found' } })
                ;
            })
        })

        context('Given bookmarks already in the database', () => {
            const testBookmarks = makeBookmarksArray();
    
            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
                ;
            })
    
            it('responds with 200 and the specified bookmark', () => {
                const bookmarkId = 2;
                const expectedBookmark = testBookmarks[bookmarkId - 1];
                return supertest(app)
                    .get(`/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .expect(200, expectedBookmark)
                ;
            })
        })
    })

})