const { prefix, token, randomMessages, quote, sql } = require('./config.json');
const pg = require('pg');
const Discord = require("discord.js");
const bot = new Discord.Client();
var connectionString = sql;
var pgClient = new pg.Client(connectionString);
var numQuotes = 0;
var randomMessageChance = 8; //%

try {
pgClient.connect();
} catch(error) { console.error(error); }

const talk = (txt, msg) => {
  msg.channel.send(txt);
}

const randomMessageCheck = (msg) => {
  let random = Math.floor(Math.random() * 100);
  if (random <= randomMessageChance) {
    let msgNo = Math.floor(Math.random() * randomMessages.length);
    msg.channel.send(`${randomMessages[msgNo]}`);
  }
}

const addQuote = (author, quote, channel) => {
  pgClient.query(`insert into quotes (author, quote) values ( '${author}', '${quote}' )`);
  getNumQuotes();
  talk(`Quote added!`, channel);
}

const getQuote = (number, channel) => {
  pgClient.query(`select * from quotes`).then(r => {
    if (number > r.rowCount || number < 0) {
      talk(`Quote doesn't exist. There are ${r.rowCount} quote(s) ya dunce.`, channel);
      return;
    }
    else {
      pgClient.query(`select * from quotes where id=` + number).then(res => {
        const data = res.rows;
        talk(`Quote #${res.rows[0].id} by ${res.rows[0].author}:`, channel);
        talk(res.rows[0].quote, channel);
      });
    }
  });
}

const getNumQuotes = () => {
    pgClient.query(`select count(*) from quotes`).then(r => {
      numQuotes = r.rows[0].count;
    });
}

bot.once('ready', () => {
  console.log(`DEBUG: Ready!`);
  numQuotes = getNumQuotes();
  console.log(numQuotes);
});

bot.on("message", (msg) => {
  if (msg.author.tag != "Tweetster#1823") randomMessageCheck(msg);
  const args = msg.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  //admin command block
  if (msg.author.tag == "shaggers#3237") {
    if (command === 'tweet') {
      if (!args[0]) msg.channel.send(`Tweeters are currently set to ${randomMessageChance}%! :]]`);
      else {
      randomMessageChance = args[0];
      msg.channel.send(`Tweeters set to ${randomMessageChance}%!`);
      }
    }
  }
  //normal command block
  switch (command) {
  case 'addquote':
    if (!args[0]) talk('USAGE: !addquote <text>', msg);
    else {
      let author = msg.author.username;
      let quote = args.join(' ');
      addQuote(author, quote, msg);
    }
    break;
  case 'getquote':
    if (!args[0]) { talk('USAGE: !getquote <number>', msg); return; }
    else if (isNaN(args[0])) talk('u big dunce thats not a number', msg);
    else {
      getQuote(args[0], msg);
    }
  break;
  case 'numquotes':
    getNumQuotes();
    talk(`${numQuotes} total quote(s) in the database dunce.`, msg);
    break;
  default:
  }
});
 
bot.login(token);