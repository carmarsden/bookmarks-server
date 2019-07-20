const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks.fixtures');

const API_TOKEN = process.env.API_TOKEN;

describe('Bookmarks Endpoints', () => {
    // note: should ideally be validating URL's as well
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
        const testBookmarks = makeBookmarksArray();

        // BOOKMARKS ENDPOINT
        it('responds with 401 for GET /api/bookmarks', () => {
            return supertest(app)
                .get('/api/bookmarks')
                .expect(401, { error: 'Unauthorized request' })
            ;
        })

        it('responds with 401 for POST /api/bookmarks', () => {
            return supertest(app)
                .post('/api/bookmarks')
                .send({ title: 'some title', url: 'www.someurl.com' })
                .expect(401, { error: 'Unauthorized request' })
            ;
        })

        // BOOKMARKS/:ID ENDPOINT
        it('responds with 401 for GET /api/bookmarks/:id', () => {
            const aBookmark = testBookmarks[1];
            return supertest(app)
                .get(`/api/bookmarks/${aBookmark.id}`)
                .expect(401, { error: 'Unauthorized request' })
            ;
        })
        it('responds with 401 for DELETE /api/bookmarks/:id', () => {
            const aBookmark = testBookmarks[1];
            return supertest(app)
                .delete(`/api/bookmarks/${aBookmark.id}`)
                .expect(401, { error: 'Unauthorized request' })
            ;
        })
        it('responds with 401 for PATCH /api/bookmarks/:id', () => {
            const aBookmark = testBookmarks[1];
            return supertest(app)
                .patch(`/api/bookmarks/${aBookmark.id}`)
                .expect(401, { error: 'Unauthorized request' })
            ;
        })

    })

    // BOOKMARKS ENDPOINT
    describe('GET /api/bookmarks', () => {
        context('Given no bookmarks', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/api/bookmarks')
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
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .expect(200, testBookmarks)
                ;
            })
        })

        context('Given an XSS attack bookmark', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
    
            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([ maliciousBookmark ])
                ;
            })
    
            it('removes XSS attack content', () => {
                return supertest(app)
                    .get('/api/bookmarks')
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].title).to.eql(expectedBookmark.title)
                        expect(res.body[0].description).to.eql(expectedBookmark.description)
                    })
                ;
            })
        })
    })

    describe('POST /api/bookmarks', () => {
        it('creates a bookmark, responding with 201 & new bookmark', function() {
            const newBookmark = {
                title: 'Test bookmark',
                url: 'https://www.testsomething.com',
                description: 'Test description',
                rating: 3
            };
            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${API_TOKEN}`)
                .send(newBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body.rating).to.eql(newBookmark.rating)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
                })
                .then(postRes => 
                    supertest(app)
                    .get(`/api/bookmarks/${postRes.body.id}`)
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .expect(postRes.body)
                )
            ;
        })

        it('creates a bookmark when rating is a number as string, responding with 201 & new bookmark', function() {
            const newBookmark = {
                title: 'Test bookmark',
                url: 'https://www.testsomething.com',
                description: 'Test description',
                rating: '4.25'
            };
            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${API_TOKEN}`)
                .send(newBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body.rating).to.eql(4)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
                })
                .then(postRes => 
                    supertest(app)
                    .get(`/api/bookmarks/${postRes.body.id}`)
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .expect(postRes.body)
                )
            ;
        })

        const requiredFields = ['title', 'url'];
        requiredFields.forEach(field => {
            const newBookmark = {
                title: 'Test bookmark',
                url: 'https://www.testsomething.com',
            }

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newBookmark[field];
                return supertest(app)
                    .post('/api/bookmarks')
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    })
                ;
            })
        })

        it('responds with 400 and error if not rating not a number', () => {
            const newBookmarkInvalidRating = {
                title: 'Test bookmark',
                url: 'https://www.testsomething.com',
                rating: 'invalid'
            }
            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${API_TOKEN}`)
                .send(newBookmarkInvalidRating)
                .expect(400, {
                    error: { message: `Rating must be an integer from 1 to 5` }
                })
            ;
        })

        it('responds with 400 and error if not rating is not integer 1-5', () => {
            const newBookmarkInvalidRating = {
                title: 'Test bookmark',
                url: 'https://www.testsomething.com',
                rating: 10
            }
            return supertest(app)
                .post('/api/bookmarks')
                .set('Authorization', `Bearer ${API_TOKEN}`)
                .send(newBookmarkInvalidRating)
                .expect(400, {
                    error: { message: `Rating must be an integer from 1 to 5` }
                })
            ;
        })

        it('removes XSS attack content from post response', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
            return supertest(app)
                .post(`/api/bookmarks`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(maliciousBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title)
                    expect(res.body.description).to.eql(expectedBookmark.description)
                })
            ;
        })
    })

    // BOOKMARKS/:ID ENDPOINT
    describe('GET /api/bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it('responds with 404 not found', () => {
                const bookmarkId = 123;
                return supertest(app)
                    .get(`/api/bookmarks/${bookmarkId}`)
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
                    .get(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .expect(200, expectedBookmark)
                ;
            })
        })

        context('Given an XSS attack bookmark', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
    
            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([ maliciousBookmark ])
                ;
            })
    
            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/bookmarks/${maliciousBookmark.id}`)
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedBookmark.title)
                        expect(res.body.description).to.eql(expectedBookmark.description)
                    })
                ;
            })
        })
    })

    describe('DELETE /api/bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it('responds with 404 not found', () => {
                const bookmarkId = 123;
                return supertest(app)
                    .delete(`/api/bookmarks/${bookmarkId}`)
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
            
            it('responds with 204 and deletes bookmark', () => {
                const idToRemove = 2;
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove);
                return supertest(app)
                    .delete(`/api/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .expect(204)
                    .then(() => 
                        supertest(app)
                            .get('/api/bookmarks')
                            .set('Authorization', `Bearer ${API_TOKEN}`)
                            .expect(expectedBookmarks)
                    )
                ;
            })
        })

        context('Given an XSS attack bookmark', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark();
    
            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([ maliciousBookmark ])
                ;
            })
    
            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/bookmarks/${maliciousBookmark.id}`)
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedBookmark.title)
                        expect(res.body.description).to.eql(expectedBookmark.description)
                    })
                ;
            })
        })
    })

    describe(`PATCH /api/bookmarks/:id`, () => {
        context(`Given no bookmarks`, () => {
            it(`responds with 404`, () => {
                const bookmarkId = 123456;
                return supertest(app)
                    .patch(`/api/bookmarks/${bookmarkId}`)
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .expect(404, { error: { message: `Bookmark not found` } })
                ;
            })
        })

        context('Given there are articles in the database', () => {
            const testBookmarks = makeBookmarksArray();
            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
                ;
            })

            it('responds with 204 and updates the bookmark when updating all fields', () => {
                const idToUpdate = 2;
                const updateBookmark = {
                    title: 'Updated bookmark',
                    url: 'www.newurl.com',
                    description: 'Updated description',
                    rating: 3
                };    
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                };
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .send(updateBookmark)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${API_TOKEN}`)
                            .expect(expectedBookmark)
                    )
                ;
            })

            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2;
                const updateBookmark = {
                    title: 'Updated bookmark',
                    description: 'Updated description',
                };    
                const expectedBookmark = {
                    ...testBookmarks[idToUpdate - 1],
                    ...updateBookmark
                };
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .send({
                        ...updateBookmark,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/bookmarks/${idToUpdate}`)
                            .set('Authorization', `Bearer ${API_TOKEN}`)
                            .expect(expectedBookmark)
                    )
                ;
            })

            // note: should really add tests to validate rating of patch request

            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2;
                return supertest(app)
                    .patch(`/api/bookmarks/${idToUpdate}`)
                    .set('Authorization', `Bearer ${API_TOKEN}`)
                    .send({ irrelevantField: 'foo' })
                    .expect(400, {
                        error: { message: `Request body must contain title, url, description, or rating` }
                    })
                ;
            })
        })
    })
})