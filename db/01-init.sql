-- -*- mode: sql; sql-product: postgres -*-

-- The database for DevNews.
BEGIN;

CREATE TABLE users (
       -- The ID of the user.
       id int NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
       -- The unique username.
       username varchar(32) NOT NULL UNIQUE,
       -- The password of the user. Stored as 10000$SALT$HASHED_PW.
       password varchar(96) NOT NULL,
       -- E-mail of the user.
       email varchar(80) NOT NULL UNIQUE,
       -- Homepage of the user listed in the about page.
       homepage varchar(80),
       -- About info of the user.
       about text NOT NULL,
       -- About info parsed into HTML.
       about_html text NOT NULL,
       -- Avatar URL.
       avatar_image varchar(160) NOT NULL,
       -- Registration date of this user.
       registered_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
       -- Last time this user's profile was updated.
       updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stories (
       -- The ID of the story.
       id int NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
       -- The ID of the user who submitted this story.
       submitter_id int NOT NULL REFERENCES users,
       -- Whether the submitter authored the story.
       is_authored boolean NOT NULL,
       -- The unique short URL for this post.
       short_url varchar(8) NOT NULL UNIQUE,
       -- The title of the story.
       title varchar(100) NOT NULL,
       -- The url for this story if it's a link.
       url varchar(200),
       -- The text for this story if it's a text post.
       text text,
       -- The parsed HTML.
       text_html text,
       -- When this story was submitted.
       submitted_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX stories_submitter_idx ON stories (submitter_id);

CREATE TABLE tags (
       -- The ID of the tag.
       id int NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
       -- The name of the tag.
       name varchar(32) NOT NULL UNIQUE,
       -- A short description for the tag.
       description varchar(128) NOT NULL
);

CREATE TABLE story_tags (
       story_id int NOT NULL REFERENCES stories,
       tag_id int NOT NULL REFERENCES tags,
       PRIMARY KEY (story_id, tag_id)
);

CREATE TABLE story_votes (
       story_id int NOT NULL REFERENCES stories,
       user_id int NOT NULL REFERENCES users,
       PRIMARY KEY (story_id, user_id)
);

CREATE TABLE story_follows (
       story_id int NOT NULL REFERENCES stories,
       user_id int NOT NULL REFERENCES users,
       PRIMARY KEY (story_id, user_id)
);

CREATE TABLE comments (
       -- The ID of the comment.
       id int NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
       -- The ID of the story the comment is on.
       story_id int NOT NULL REFERENCES stories,
       -- The ID of the user who commented.
       user_id int NOT NULL REFERENCES users,
       -- The comment this comment is replying to.
       parent_id int REFERENCES comments,
       -- Short URL for this comment.
       short_url varchar(8) NOT NULL UNIQUE,
       -- Comment date.
       commented_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
       -- The comment contents.
       comment text NOT NULL,
       -- The comment contents parsed into HTML.
       comment_html text NOT NULL
);
CREATE INDEX comments_story_idx ON comments (story_id);
CREATE INDEX comments_user_idx ON comments (user_id);

CREATE TABLE comment_votes (
       comment_id int NOT NULL REFERENCES comments,
       user_id int NOT NULL REFERENCES users,
       PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE read_comments (
       comment_id int NOT NULL REFERENCES comments,
       user_id int NOT NULL REFERENCES users,
       PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE messages (
       -- The ID of the message.
       id int NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
       -- Sender of the mesage.
       sender_id int NOT NULL REFERENCES users,
       -- Receiver of the message
       receiver_id int NOT NULL REFERENCES users,
       -- The message this message is in reply to. null if this is the start of a
       -- message thread
       in_reply_to int REFERENCES messages,
       -- The date/time this message was sent.
       sent_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
       -- The message contents.
       message text NOT NULL,
       -- The message contents parsed into HTML.
       message_html text NOT NULL
);
CREATE INDEX messages_in_reply_to_idx ON messages (in_reply_to);

-- The statistics for a story.
CREATE VIEW story_stats AS
SELECT S.id,
       (SELECT COUNT(*) FROM story_votes WHERE story_id = S.id) AS score,
       (SELECT COUNT(*) FROM comments WHERE story_id = S.id) AS comment_count
FROM stories S;

CREATE VIEW story_rank AS
-- A story's rank is calculated as the log10 of the current score for this story,
-- plus the age of this story. Since the rank is sorted descending, it is given
-- a negative score (so newer stories have a higher rank).
SELECT S.id, -round((
       LOG10(GREATEST(COUNT(V.*) + 1, 1::bigint))
       + EXTRACT(EPOCH FROM S.submitted_at) / (60 * 60 * 24))::numeric, 7)
       AS story_rank
FROM stories S
LEFT OUTER JOIN story_votes V ON V.story_id = S.id
GROUP BY S.id;

-- Score for a comment.
CREATE VIEW comment_score AS
SELECT C.id, COUNT(V.*) AS score
FROM comments C
LEFT OUTER JOIN comment_votes V on V.comment_id = C.id
GROUP BY C.id;

COMMIT;
