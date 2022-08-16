const random = require("./random.js")

module.exports = {
    createSession: async function (db, name, downloadLinks, time, lockTime, grace) {
        // name: string
        // downloadLinks: array of strings
        let sessionId = random.string(10)
        await db.createCollection(sessionId);
        await this.insertDocument(db.collection(sessionId), {
            id: "metadata",
            date: Date.now(),
            name: name,
            downloadLinks: downloadLinks,
            time: time,
            lockTime: lockTime,
            grace: grace,
            sentPasswords: false
        })
        return sessionId;
    },
    insertDocument: async function (collection, document) {
        let result = await collection.insertOne(document);
        return result
    },
    getDocument: async function (collection, query) {
        return await collection.findOne(query);
    },
    editDocument: async function (collection, query, update) {
        return await collection.updateOne(query, update)
    },
    listCollections: async function (db) {
        return await db.listCollections().toArray()
    }
}