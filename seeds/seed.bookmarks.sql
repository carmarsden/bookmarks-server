BEGIN;
-- Test data with all values
INSERT INTO bookmarks (title, url, description, rating) VALUES
    ('Thinkful', 'https://www.thinkful.com', 'Think outside the classroom', 5),
    ('Google', 'https://www.google.com', 'Where we find everything else', 4),
    ('MDN', 'https://developer.mozilla.org', 'The only place to find web documentation', 5),
    ('Reddit', 'https://www.reddit.com', 'The front page of the internet', 2),
    ('Stack Overflow', 'https://stackoverflow.com/', 'Get your questions answered!', 4),
    ('Smitten Kitchen', 'https://smittenkitchen.com/recipes/', 'Find something to eat', 5),
    ('The Atlantic', 'https://www.theatlantic.com/', 'Some mid-form journalism', 3)
;

-- Test data missing rating
INSERT INTO bookmarks (title, url, description) VALUES
    ('Facebook', 'http://www.facebook.com', 'Kind of a waste of time')
;

-- Test data missing description
INSERT INTO bookmarks (title, url, rating) VALUES
    ('YNAB', 'https://www.youneedabudget.com/', 4)
;

-- Test data missing description & rating
INSERT INTO bookmarks (title, url) VALUES
    ('Slack', 'https://slack.com/')
;

COMMIT;