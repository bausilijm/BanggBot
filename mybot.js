/*
todo: fix adding quotes with emojis (switch to mysql or mariadb?)
add search quote function, add other things besides just quotes and talking :]
*/
const { prefix, token, randomMessages, quote, sql } = require('./config.json');
const pg = require('pg');
const Discord = require("discord.js");
const { last } = require('ramda');
const pgp = require('pg-promise')();
const bot = new Discord.Client();
var connectionString = sql;
var pgClient = new pg.Client(connectionString);
var numQuotes = 0;
var randomMessageChance = 1; //%  
var lastQuote = '';

try {
  pgClient.connect();
} catch(error) { console.error(error); }

const talk = (txt, msg) => {
  msg.channel.send(txt);
}

const randomMessageCheck = (msg) => {
  let random = Math.random() * 100;
  if (random <= randomMessageChance) {
    let msgNo = Math.floor(Math.random() * randomMessages.length);
    msg.channel.send(`${randomMessages[msgNo]}`);
  }
}

const addQuote = (author, quote, channel) => {
  pgClient.query(`insert into quotes (author, quote) values ( '${author}', '${quote}' )`);
  getNumQuotes();
  lastQuote = quote;
  talk(`Quote added.`, channel);
}

const getQuote = (number, channel) => {
  pgClient.query(`select * from quotes`).then(r => {
    if (Number(number) > r.rowCount || Number(number) <= 0) {
      talk(`Quote doesn't exist. There are ${numQuotes} quote(s) ya dunce.`, channel);
      return;
    }
    else {
      pgClient.query(`select * from quotes where id=` + Number(number)).then(res => {
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
     return r.rows[0].count;
   });
}

const delQuote = (txt, chan) => {
  getNumQuotes();
  if (txt > numQuotes || txt < 0 || isNaN(txt)) {
    talk(`ur a stupid dunce...`, chan);
    return;
  }
  else {
    pgClient.query(`delete from quotes where id=${txt}`).then(r => {
      console.log('deleted record.');
    });
    if (txt < numQuotes) {
        for (let a = Number(txt); a < numQuotes; a++) {
          pgClient.query(`update quotes set id=${a} where id=${a + 1}`).then(r => {
            console.log(`update quotes set id=${a} where id=${a + 1}`);
          });
        }
    }
    pgClient.query(`alter sequence quotes_id_seq restart with ${numQuotes}`);
    getNumQuotes();
    talk(`Deleted quote ${txt}. Now there's only ${numQuotes - 1} u jerk.`, chan);
  }
};

const checkDuplicate = (text) => {
  let count = 0;
  for (let a = 0; a < text.split(" ").length; a++) {
    if (text.split(" ")[0] === text.split(" ")[a]) count++;
  }
  return count;
}

const commandCheck = (msg) => {
  const args = msg.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  //admin command block
  if (msg.author.tag == "shaggers#3237") {
    switch (command) {
    case 'tweet':
      if (!args[0]) msg.channel.send(`Tweeters are currently set to ${randomMessageChance}%! :]]`);
      else {
      randomMessageChance = args[0];
      msg.channel.send(`Tweeters set to ${randomMessageChance}%!`);
      }
    break;
    case 'quotethat':
      msg.channel.messages.fetch({ limit: 2 }).then(aaa => {
      let lastMsg = aaa.last();
      addQuote(lastMsg.author.username, lastMsg.content, msg);
      });
      break;
    case 'delquote':
      delQuote(args[0], msg);
    break;
    case 'repeat':
      talk(`${args}`, msg);
      console.log(args);
      break;
    default:
    }
  }
  //normal command block
  switch (command) {
    case 'addquote':
      if (!args[0]) talk('USAGE: !addquote <text>', msg);
      else if (msg.author.tag !== "Tweetster#1823") {
        let author = msg.author.username;
        let quote = args.join(' ');
        if (checkDuplicate(quote) > 2) { talk('stop repeating yourself dunce', msg); return; }
        if (quote === lastQuote) {
          talk('stop repeating urself dunce', msg);
         return;
        }
        else addQuote(author, quote, msg);
      }
    break;
    case 'getquote':
      if (args[0] == null) {
        getNumQuotes();
        let x = Math.floor(Math.random() * (numQuotes - 1));
        console.log(x);
        if (x == 0) x = 1;
        getQuote(Number(x), msg);
      }
      else if (isNaN(args[0])) talk('u big dunce thats not a number', msg);
      else {
        if (msg.author.tag !== "Tweetster#1823") getQuote(args[0], msg);
      }
    break;
    case 'numquotes':
      getNumQuotes();
      talk(`${numQuotes} total quote(s) in the database dunce.`, msg);
    break;
    case 'help':
      talk('Commands: .addquote, .getquote, .numquotes', msg);
    default:
  }
}

//end of functions, begin event checks

bot.once('ready', () => {
  console.log(`DEBUG: Ready!`);
  numQuotes = getNumQuotes();
});

bot.on("message", (msg) => {
  commandCheck(msg);
  if (msg.author.tag !== "Tweetster#1823") randomMessageCheck(msg);
});

bot.login(token);