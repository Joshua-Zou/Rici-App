# Rici App
 ![image](https://user-images.githubusercontent.com/77520157/185002677-07193298-fd91-4dc4-954b-99ea27fa82e6.png)

### What it is

RICI App is a simple, self-hosted application that allows you to run your own Run-it-Code-it events! Run it Code it is a fun event where users will try to replicate an already-created application by just interacting with it, and without viewing the source code at all! This is all done under an extremely small window of time, normally just 30-60 minutes!\

RICI App allows event organizers to easily host and judge events, while still creating an environment that makes it extremely hard to cheat! Here's how it works.
 1) First, organizers can create a RICI session with a unique ID
 2) Then, organizers can send every participant in their Discord server with a specific role their own password, which is a hash calculated from your secret key, session ID, and their Discord tag
 3) Users can log in and download the compiled application to replicate
 4) Users then submit their own replicated project within a time limit

### Installation
 1) Clone this repository, and run `npm install`
 2) Rename secrets.example.json to secrets.json
 3) Setup a Discord bot account by following [this](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot) guide
 4) Copy the bot token and replace the `discordbot` key inside of `secrets.json`
 5) Generate an invite link with admin privileges and invite the Bot to your Discord server
 6) Create a MongoDB instance and replace the `mongodb` field inside of `secrets.json` with it's connection string. It **must** include the database name of `RICIsessions` as its pathname (like below)\
 `mongodb+srv://username:pass@clusterid.mongodb.net/RICIsessions`
 7) Replace the `secret_key` field with a random string that's **secret**. (it can literally be anything)
 8) Set port as whatever port you want the server to listen on
 9) Set website_location as the place where your website will be hosted on
 10) Inside of `website.navbar`, include an array of objects describing navbar objects. (see below)\
 ```js
 {
    "title": "Hello!",
    "url": "https://my-website.com",
    "target": "_blank"
 }
 ```
 11) Now, just run `npm run start` and your RICI App will automatically spin up your Discord bot and Database connection!
 

### Usage
Here's a quick example of setting up a RICI session!
1) Go to your Discord server, and make sure your bot is invited!
2) Run `v! create-session`
3) Input the name of your session
4) Input the time in minutes that you want to give participants to replicate your application (min: 30, max: 120)
5) Input the amount of buffer time in minutes that you want to give participants. (Extra time that they are allowed to submit projects) (min: 1, max: 10)
6) Input the time when you want to lock submissions. This is the latest time that users can **start** submissions. Adhere to this format: `8/10/2022 PST 6:30 PM`
7) Enter the download link users will use for Windows machines
8) Enter the download link users will use for MacOS machines
9) Enter the download link users will use for Linux machines
10) Review the info provided, and if everything looks good, then enter `create`
11) run `v! active-sessions`, to check out your session!
12) run `v! send-passwords [sessionID]` to send users their passwords
13) Then, enter the role you would like to target for sending passwords. Type `all` to select everyone
14) Enter `yes` to confirm!
15) Users will now recieve a DM that looks like the following\
```
Hey, I'm the RICI bot!
            It looks like you're part of the RICI session: My RICI Session!
            Go to this website: https://rici-app.joshuazou.repl.co/session/5nqJiTTqPb
            and enter the below password. (This password only works for you! Please do not share this password!)
                0b924440c0f37fcc7bca8482bcf0af4a4ff0d22a62cd71b8b207edc29801d584
```
16) Now, simply navigate to the admin panel by running the command `v! get-access-link [sessionID]` and navigating to the link provided! 
17) Here, you'll see all of your user's progress, and their submissions![image](https://user-images.githubusercontent.com/77520157/185002503-558d5055-043f-4c92-a583-1c2c1eec7486.png)

Users will see this screen:![image](https://user-images.githubusercontent.com/77520157/185002656-e1e74a8d-4498-4d53-bfea-8890281fed03.png)

