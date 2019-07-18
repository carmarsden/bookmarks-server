const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');

const testBookmarks = [
    {
        id: 1,
        title: "Thinkful",
        url: "https://www.thinkful.com",
        description: "Think outside the classroom",
        rating: 5
    },
    {
        id: 2,
        title: "Google",
        url: "https://www.google.com",
        description: "Where we find everything else",
        rating: 4
    },
    {
        id: 3,
        title: "MDN",
        url: "https://developer.mozilla.org",
        description: "The only place to find web documentation",
        rating: 5
    },
    {
        id: 4,
        title: "Reddit",
        url: "https://www.reddit.com",
        description: "The front page of the internet",
        rating: 2
    },
];

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
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, [])
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
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, { error: { message: 'Bookmark not found' } })
                ;
            })
        })
    })

})