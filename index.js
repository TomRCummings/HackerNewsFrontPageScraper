const https = require('https');

require('dotenv').config();

const { v4: uuidv4 } = require('uuid');
const { JSDOM } = require('jsdom');
const sqlite3 = require('sqlite3').verbose();


const db = new sqlite3.Database(process.env.dbFile);

const options = {
    hostname: 'news.ycombinator.com',
    port: 443,
    path: '/',
    method: 'GET',
};

const secInMS = 1000;
const intervalInMS = process.env.scrapingInterval * secInMS;

setInterval(skimFrontPage, intervalInMS);

function skimFrontPage() {
    const req = https.request(options, res => {
        let body = '';
        res.on('data', d=> {
            body += d;
        });

        res.on('end', () => {
            console.log(res.headers.date);
            extractData(new JSDOM(body), res.headers.date);
        });
    });

    req.on('error', error => {
        console.error(error);
    })

    req.end();
}

function extractData(dom, time) {
    let things = dom.window.document.querySelectorAll(".athing");
    let subs = dom.window.document.querySelectorAll(".subtext");
    let posts = {
        ids: [],
        titles: [],
        urls: [],
        authors: [],
        sitestubs: [],
        dateCreated: [],
        slicetime: [],
        comments: [],
        points: [],
        ranks: [],
    }
    things = Array.from(things);
    subs = Array.from(subs);
    things.map((thing) => {
        posts.ids.push(thing.getAttribute("id"));
        posts.titles.push(thing.querySelector(".titlelink").textContent);
        let url = thing.querySelector(".titlelink").href;
        if (url.substring(0,4) !== "http") {
            url = "https://news.ycombinator.com/" + url;
        }
        posts.urls.push(url);
        if (thing.querySelector(".sitestr") !== null) {
            posts.sitestubs.push(thing.querySelector(".sitestr").textContent);
        } else {
            posts.sitestubs.push("news.ycombinator.com");
        }
        posts.ranks.push(thing.querySelector(".rank").textContent);
    });
    subs.map((sub) => {
        if (sub.querySelector(".hnuser") !== null) {
            posts.authors.push(sub.querySelector(".hnuser").textContent);
        } else {
            posts.authors.push("ycombinator");
        }
        posts.dateCreated.push(sub.querySelector(".age").title);
        let comment = "0 comments";
        if (Array.from(sub.querySelectorAll("a")).length > 3) {
            comment = Array.from(sub.querySelectorAll("a"))[3].textContent;
            if (comment == "discuss") {
                comment = "0 comments";
            }
        }
        posts.comments.push(comment);
        if (sub.querySelector(".score") !== null) {
            posts.points.push(sub.querySelector(".score").textContent);
        } else {
            posts.points.push("0 points");
        }
    });

    savePosts(posts, time);    
}

function savePosts(posts, time) {
    db.run("BEGIN TRANSACTION", () => {
        for (let i = 0; i < 30; i++) {
            db.run("INSERT INTO slices (sliceid, slicetime, postid, comments, points, rank) VALUES(?,?,?,?,?,?)", [uuidv4(), time, posts.ids[i], posts.comments[i], posts.points[i], posts.ranks[i]]);
        }
        db.run("COMMIT", () => {
            for (let i = 0; i < 30; i++) {
                db.all(`SELECT title FROM posts WHERE id = ?`, posts.ids[i], (err, rows) => {
                    if (rows.length == 0) {
                        db.run("INSERT INTO posts (id, title, url, author, siteStub, dateCreated) VALUES(?,?,?,?,?,?)", [posts.ids[i],posts.titles[i],posts.urls[i],posts.authors[i],posts.sitestubs[i], posts.dateCreated[i]]);
                    }
                })
            }
        });


    });

}
