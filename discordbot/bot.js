const { MongoClient } = require('mongodb');
var secrets = JSON.parse(process.env.secrets || JSON.stringify(require("../secrets.json")))
const fetch = require("node-fetch")
const Discord = require('discord.js');
const database = require("../helpers/db.js")
var crypto = require('crypto');
const path = require("path")
var urljoin = require('url-join');

const prefix = "v! "


const client = new Discord.Client({});

String.prototype.replaceAll = function (find, replace) {
    var regex = new RegExp(find, 'g');
    return this.replace(regex, replace)
}

MongoClient.connect(secrets.mongodb, async function (err, mongoclient) {
    const db = mongoclient.db("RICIsessions")
    client.login(secrets.discordbot);
    client.once('ready', () => {
        console.log(`Logged in as ${client.user.username}.`);
    })
    client.on("message", async message => {
        if (!message.guild) return;
        if (message.author.bot) return;
        if (!message.member.hasPermission('ADMINISTRATOR')) return;
        if (!message.content.startsWith(prefix)) return;
        // only admins are here
        const command = message.content.slice(prefix.length)
        if (command.split(" ")[0] === "send-passwords") {
            let sessionId = command.split(" ")[1];
            if (!sessionId) return message.channel.send("You must send a valid session ID: 'send-passwords __sessionID__'");
            // get session information from mongodb
            const session = await database.getDocument(db.collection(sessionId), {
                id: "metadata"
            });
            if (!session) return message.channel.send("You must send a valid session ID!");
            if (session.sentPasswords) return message.channel.send("We've already sent everyone their passwords for this session!");

            let role = await confirm(message, "What role do you want to target? I will send everyone with this role their password (this is cAsE SenSitVE). Type \"all\" to target everyone\n(cancel to cancel)")
            if (role.toLowerCase() === "cancel") return message.channel.send("Canceled! Nothing was changed.");
            var allMembers;
            if (role.toLowerCase() === "all") {
                role = "@everyone"
            }

            let roleObj = message.guild.roles.cache.find(rolez => {
                return rolez.name === role
            });
            if (!roleObj) return message.channel.send("I couldn't find that role! Please make sure I have adequate permissions, or that you spelled it correctly!");
            allMembers = message.guild.roles.cache.get(roleObj.id).members;
            var members = []
            allMembers.forEach(member => {
                if (member.user.bot) return;
                members.push(member)
            })
            let shouldSend = await confirm(message, `Are you sure you would like to send passwords to the ${members.length} people who have the ${role === "@everyone" ? "all" : role} role? Type yes to send, or anything else to cancel`)
            if (shouldSend.toLowerCase() !== "yes") return message.channel.send("Ok! Nothing was sent!")
            message.channel.send("Sending passwords to everyone who has the role!")
            members.forEach(member => {
                var tag = `${member.user.username}#${member.user.discriminator}`
                var pass = crypto.createHash('sha256').update(tag).update(secrets.secret_key).update(sessionId).digest('hex');
                member.user.send(`
        Hey, I'm the RICI bot!
            It looks like you're part of the RICI session: ${session.name}! 
            Go to this website: ${urljoin(secrets.website_location, "session/" + sessionId)}
            and enter the below password. (This password only works for you! Please do not share this password!)
                \`${pass}\` 
                `)
                database.insertDocument(db.collection(sessionId), {
                    id: tag,
                    started: false,
                    submissionLink: ""
                })
            })
            await database.editDocument(db.collection(sessionId), { id: "metadata" }, {
                $set: {
                    sentPasswords: true
                }
            })
            message.channel.send("Successfully sent everyone their passwords!")
        } else if (command.split(" ")[0] === "create-session") {
            message.channel.send("Welcome to the session creator! To get started, we'll ask you a couple of questions!")
            // name
            let name = await confirm(message, "First of all, what is the name of this session? You can use the same name twice! (Type cancel to cancel)");
            if (name.toLowerCase() === "cancel") return message.channel.send("Ok! Nothing was changed and successfully canceled!");
            // time
            let time = await confirm(message, "Now, how long in minutes do you want to give users to code? This time starts when the user first logs in. (Type cancel to cancel)")
            if (time.toLowerCase() === "cancel") return message.channel.send("Ok! Nothing was changed and successfully canceled!");
            console.log(time, Number(time).toString().toLowerCase(), Number(time))
            if (Number(time).toString().toLowerCase() === "nan" || Number(time) < 30 || Number(time) > 120) return message.channel.send("Sorry! That wasn't a valid number! Minimum value is 30 min, and max is 120 min!")
            // grace
            let grace = await confirm(message, "How long in minutes of grace period do you want to give users? This is to allow users time to upload last minute work! (Type cancel to cancel)")
            if (grace.toLowerCase() === "cancel") return message.channel.send("Ok! Nothing was changed and successfully canceled!");
            if (Number(grace).toString().toLowerCase() === "nan" || Number(grace) < 1 || Number(grace) > 10) return message.channel.send("Sorry! That wasn't a valid number! Minimum value is 1 min, and max is 10 min!")
            // lockTime
            let lockTime = await confirm(message, "When do you want to lock submissions? This is the latest time users will be able to **start** a submission! Enter like the below example: `8/10/2022 PST 6:30 PM`\n (cancel to cancel)");
            if (lockTime.toLowerCase() === "cancel") return message.channel.send("Ok! Nothing was changed and successfully canceled!");
            if (Date(lockTime).toString() === "Invalid Date") return message.channel.send("Sorry! That wasn't a valid date! Remember to enter a valid date!")
            lockTime = new Date(lockTime);
            lockTime = lockTime.getTime()
            // downloadLinks
            var downloadLinks = [{
                name: "Windows Download"
            }, {
                name: "MacOS Download"
            }, {
                name: "Linux Download"
            }]
            // windows download url
            downloadLinks[0].url = await confirm(message, "Enter the download URL to your compiled program (users will replicate this) for **WINDOWS**. \n(cancel to cancel)");
            if (downloadLinks[0].url.toLowerCase() === "cancel") return message.channel.send("Ok! Nothing was changed and successfully canceled!");
            if (downloadLinks[0].url === ".") downloadLinks[0].url = ""
            // macos download url
            downloadLinks[1].url = await confirm(message, "Enter the download URL to your compiled program (users will replicate this) for **MACOS**. \n(cancel to cancel)");
            if (downloadLinks[1].url.toLowerCase() === "cancel") return message.channel.send("Ok! Nothing was changed and successfully canceled!");
            if (downloadLinks[1].url === ".") downloadLinks[0].url = ""
            // linux download url
            downloadLinks[2].url = await confirm(message, "Enter the download URL to your compiled program (users will replicate this) for **LINUX**. \n(cancel to cancel)");
            if (downloadLinks[2].url.toLowerCase() === "cancel") return message.channel.send("Ok! Nothing was changed and successfully canceled!");
            if (downloadLinks[2].url === ".") downloadLinks[2].url = ""

            var response = await confirm(message, `
                Please confirm the below info!
                Name: ${name}
                Max submission time: ${time} minutes
                Grace period: ${grace} minutes
                Lock submissions at: ${lockTime.toString()}
                Windows download link: ${downloadLinks[0].url}
                MacOS download link: ${downloadLinks[1].url}
                Linux download link: ${downloadLinks[2].url}

Type "create" to create this session, or anything else to cancel!
            `);
            if (response.toLowerCase() !== "create") return message.channel.send("Ok! Nothing was changed and successfully canceled!");
            let results = await database.createSession(db, name, downloadLinks, time, lockTime, grace);
            message.channel.send("Success! Created a session with ID: " + results)
        } else if (command.split(" ")[0] === "active-sessions") {
            let collections = await database.listCollections(db);
            var activeSessions = []
            for (let i in collections) {
                let col = collections[i];
                let metadata = await database.getDocument(db.collection(col.name), {
                    id: "metadata"
                });
                if (metadata.lockTime > Date.now()) {
                    activeSessions.push([metadata, col.name])
                }
            }
            return message.channel.send(`
Active Sessions, as of now:
    ${activeSessions.map(([session, id]) => {
                return (`
    Name: \`${session.name}\`
        Lock submission time: \`${Date(session.lockTime).toString()}\`
        ID: \`${id}\`
        Sent Passwords: \`${session.sentPasswords}\`
        Link: ${urljoin(secrets.website_location, "session/" + id)}
        
        `)
            })}    
            `)

        } else if (command.split(" ")[0] === "get-access-link") {
            let sessionId = command.split(" ")[1];
            if (!sessionId) return message.channel.send("You must send a valid session ID: 'get-access-link __sessionID__'");

            const token = crypto.createHash('sha256').update("ADMIN_TOKEN").update(secrets.secret_key).update(sessionId).digest('hex');
            message.author.send(`
Hey! Here's the access link you requested!
        ${urljoin(secrets.website_location, "admin/" + token + "/" + sessionId)}
            **DO NOT SHARE THIS WITH ANYONE!**`)
        } else if (command.split(" ")[0] === "help") {
            message.channel.send(`
**Commands**
    - \`${prefix}send-passwords\` [sessionId]
       This command sends all users their passwords for a specific session. This command can ONLY be run once!
    - \`${prefix}\`create-session
        This command launches an interactive config maker for a session!
    - \`${prefix}\`active-sessions
        This command returns a list of all active sessions and their details!
    - \`${prefix}\`get-access-link
        This command returns an access link for admins to access the admin panel (it'll DM it to you)
            `)
        }
    })
})


function confirm(message, text) {
    return new Promise((resolve, reject) => {
        let replyMessage = message.reply(text)
        let filter = msg => msg.author.id == message.author.id
        message.channel.awaitMessages(filter, { max: 1, time: 60000 }).then(collected => {
            try {
                resolve(collected.first().content)
            } catch (e) {
                reject(message.channel.send("Sorry, you took too long to respond! Please try again."))
            }
        });
    })
}