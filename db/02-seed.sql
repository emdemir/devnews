-- -*- mode: sql; sql-product: postgres -*-

-- Feed the database with a little sample data.

BEGIN;

-- Admin user
INSERT INTO users
    (username, password, email, about, about_html, avatar_image)
VALUES
    -- Password is "admin".
    ('admin',
    '10000$A6Q3La1iS2ijlxTG$xWG0liIVX+1MQQ3KMM+aCKn7iIj5czVZC8uMBHOANaLLXrBRV3ZYawq797RRKf3f',
    'admin@devnews.org',
    'Administrator at DevNews.', '<p>Administrator at DevNews.</p>',
    'https://gravatar.com/avatar/a3e388c670b463396065d4293834f35b?d=identicon');

-- Example stories
INSERT INTO stories
    (submitter_id, is_authored, short_url, title, url, text, text_html)
VALUES
    -- Authored story with URL
    (1, true, '1df8vz', 'Android Developers', 'https://developer.android.com/', NULL, NULL),
    -- Story with text
    (1, true, 'adjf8x', 'Some question', NULL, 'What do you think of this?', '<p>What do you think of this?</p>'),
    -- Plain story with URL
    (1, false, '812erf', 'StackOverflow', 'https://stackoverflow.com/', NULL, NULL);

-- Example tags
INSERT INTO tags
    (name, description)
VALUES
    ('programming', 'Stories about programming and development'),
    ('ask', 'For community questions or discussion'),
    ('debugging', 'Debugging tools and practices'),
    ('service', 'Online services and toolkits');

-- Vote on all stories
INSERT INTO story_votes (story_id, user_id) VALUES
    (1, 1),
    (2, 1),
    (3, 1);

-- Story tags
INSERT INTO story_tags (story_id, tag_id) VALUES
    (1, 1),
    (2, 2),
    (3, 3),
    (3, 4),
    (3, 1);

COMMIT;
