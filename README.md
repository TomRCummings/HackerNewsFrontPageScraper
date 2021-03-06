# HackerNewsFrontPageScraper
A simple Node-based scraper that extracts information from the Hacker News front page at set intervals and stores it to a local SQLite database.

## Environmental variables
Create a ".env" file to hold the following variables and their values in the format required by the dotenv package:

* dbFile: the path to the SQLite database file containing the "posts" and "slices" tables
* scrapingInterval: the interval in seconds that scraper will download, process, and store the HN front page
* searchable: a boolean indicating whether or not to insert the id and title fields to a separate table (for the purpose of efficient full-text searching)

## Database Schema
The scraper assumes that the 'dbFile' environmental variable points to a SQLite database which contains two tables, "posts" and "slices", with the following schemas:

* `CREATE TABLE posts (
    id                   PRIMARY KEY
                         UNIQUE,
    title       CHAR,
    url         CHAR,
    author      CHAR,
    siteStub    CHAR,
    dateCreated DATETIME
);`

* `CREATE TABLE slices (
    sliceid            PRIMARY KEY
                       UNIQUE,
    slicetime DATETIME,
    postid             REFERENCES posts (id),
    comments  INTEGER,
    points    INTEGER,
    rank      INTEGER
);`

If `searchable` is enabled, you will also need a table called `posts_searchable` which contains id and title fields. The way you create this table will depend on the full-text search module that you want to employ, the only requirement for the scraper is that the table will allow `INSERT INTO posts_searchable(id, title) VALUES(foo, bar)`.
