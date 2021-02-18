const { prefix, token, randomMessages } = require('./config.json');
const Discord = require("discord.js");
const bot = new Discord.Client();
var randomMessageChance = 100; //%
 
const randomMessageCheck = (message) => {
  let random = Math.floor(Math.random() * 100);
  if (random <= randomMessageChance) {
    let msgNo = Math.floor(Math.random() * randomMessages.length);
    message.channel.send(`${randomMessages[msgNo]}`);
  }
}

bot.once('ready', () => {
  console.log(`DEBUG: Ready!`);
});

bot.on("message", (message) => {
  if (message.author.tag != "Tweetster#1823") randomMessageCheck(message);
  let msg = message.content;
  //admin command block
  if (message.author.tag == "shaggers#3237") {
    console.log(msg);
    if (msg.startsWith(`${prefix}tweetChance`)) {
      randomMessageChance = msg.split(" ")[1];
      message.channel.send(`Tweeters set to ${randomMessageChance}%!`);
    }
  }
  //normal command block
});
 
bot.login(token);