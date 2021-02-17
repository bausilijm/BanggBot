require('dotenv').config();
const Discord = require("discord.js");
const bot = new Discord.Client();
const token = process.env.token;
 
 
bot.on("message", (message) => {
  if (message.content.startsWith("ping")) {
    message.channel.send("pong!");
  }
});
 
bot.login(token);