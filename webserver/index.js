// start webserver
// run bot.js as a child process
var secrets = JSON.parse(process.env.secrets || JSON.stringify(require("../secrets.json")))
const express = require('express');
const app = express();
const database = require("../helpers/db.js")
var bodyParser = require('body-parser')
var fork = require('child_process').fork;
var crypto = require('crypto');

app.use(express.static('static'))
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.set('port', secrets.port);
const session = require('cookie-session');

let sessionParser = session({
    secret: secrets,
    keys: [secrets.secret_key],
    name: "session",
    resave: false,
    saveUninitialized: false,
})
app.use(sessionParser);

const { MongoClient } = require('mongodb')
//const mongoclient = new MongoClient(secrets.mongodb);
MongoClient.connect(secrets.mongodb, async function (err, mongoclient) {
    const db = mongoclient.db("RICIsessions")


    // view routes
    app.get('/', (req, res) => {
        res.render("error.ejs", { website: secrets.website, error: "Hey! You seem lost! You need a valid session ID to be able to access the RICI app! <br>Try following the link sent in your DM's again." })
    })
    app.get('/session', async (req, res) => {
        res.render("error.ejs", { website: secrets.website, error: "That was an invalid session ID!" })
    })
    app.get('/session/:sessionId', async (req, res) => {
        var sessionId = req.params.sessionId;
        if (!sessionId) res.render("error.ejs", { website: secrets.website, error: "That was an invalid session ID!" })

        let results = await database.getDocument(db.collection(sessionId), {
            id: "metadata"
        })

        if (!results) return res.render("error.ejs", { website: secrets.website, error: "That was an invalid session ID!" })
        if (results.lockTime < Date.now()) return res.render("error.ejs", { website: secrets.website, error: "That session has expired already! <br>Submissions are locked :(" })

        var user = null;
        if (req.session.user && req.session.user.sessionId === sessionId) {
            user = await database.getDocument(db.collection(sessionId), {
                id: req.session.user.discordTag
            })
        } else {
            return res.render("login.ejs", { website: secrets.website, sessionData: results})
        }
        
        res.render("session.ejs", { website: secrets.website, sessionData: results, user: user})
    })
    app.get('/admin', async (req, res) => {
        res.render("error.ejs", { website: secrets.website, error: "To access the admin panel, run the following command inside of your Discord server: <br>v! get-access-link" })
    })
    app.get('/admin/:token/:sessionId', async (req, res) => {
        const token = req.params.token;
        const sessionId = req.params.sessionId;

        const correctToken = crypto.createHash('sha256').update("ADMIN_TOKEN").update(secrets.secret_key).update(sessionId).digest('hex');
        if (correctToken !== token) return res.render("error.ejs", {website: secrets.website, error: "Those were invaild credentials! Please use the login link provided by running the following command: <br>v! get-access-link"})
        
        var allDocuments = db.collection(sessionId).find();
        allDocuments = await allDocuments.toArray();

        return res.render("admin.ejs", {website: secrets.website, allDocuments: allDocuments})
    })


    // api routes
    app.post("/create-environment", async (req, res) => {
        const discordTag = req.body.discordTag || "";
        const submittedPassword = req.body.submittedPassword || "";
        const sessionId = req.body.sessionId || ""
        const secretKey = secrets.secret_key;

        var correctPassword = crypto.createHash('sha256').update(discordTag).update(secretKey).update(sessionId).digest('hex');
        if (correctPassword === submittedPassword) {
            req.session.user = {
                discordTag: discordTag,
                sessionId: sessionId
            }
            let user = await database.getDocument(db.collection(sessionId), {
                id: discordTag
            });
            if (!user.started) {
                await database.editDocument(db.collection(sessionId), {
                    id: discordTag
                }, {
                    $set: {
                        started: Date.now()
                    }
                })
            }
            return res.send({status: "ok"})
        } else {
            return res.send({status: "invalid_credentials"})
        }
    })
    app.post("/verify-credentials", async (req, res) => {
        const discordTag = req.body.discordTag || "";
        const submittedPassword = req.body.submittedPassword || "";
        const sessionId = req.body.sessionId || ""
        const secretKey = secrets.secret_key;

        var correctPassword = crypto.createHash('sha256').update(discordTag).update(secretKey).update(sessionId).digest('hex');
        if (correctPassword === submittedPassword) {
            req.session.user = {
                discordTag: discordTag,
                sessionId: sessionId
            }
            return res.send({status: "ok"})
        } else {
            return res.send({status: "invalid_credentials"})
        }
    })
    app.post("/save-submission-link", async (req, res) => {
        if (!req.session.user) return res.send({status: "invalid_credentials"})
        const discordTag = req.session.user.discordTag;
        const sessionId = req.session.user.sessionId
        const link = req.body.submissionLink;


        let sessionInformation = await database.getDocument(db.collection(sessionId), {
            id: "metadata"
        })
        let user = await database.getDocument(db.collection(sessionId), {
            id: discordTag
        })
        if (user.started + (Number(sessionInformation.time) * 60*1000) + (Number(sessionInformation.grace) * 60*1000) < Date.now()) return res.send({status: "too_late"})

        await database.editDocument(db.collection(sessionId), {
            id: discordTag
        }, {
            $set: {
                submissionLink: link
            }
        })
        return res.send({status: "ok"})
    })

    app.listen(secrets.port, () => {
        console.info(`Listening on port ${secrets.port}`)
        console.info("Starting bot process...")
        var child = fork("./discordbot/bot.js")
    });

})