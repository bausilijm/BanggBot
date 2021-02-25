/*
todo: fix adding quotes with emojis (switch to mysql or mariadb?)
add search quote function, add other things besides just quotes and talking :]
*/
const { prefix, token, randomMessages, sql, reactWords } = require('./config.json');
const pg = require('pg');
const Discord = require("discord.js");
const bot = new Discord.Client();
const axios = require('axios').default;
const cheerio = require('cheerio');
const fs = require('fs');
let infoMatch = new RegExp("<tr>.+</tr>", "g");
let htmlStrip = new RegExp("<\/?[^>]+(>|$)", "g");
let guildMatch = new RegExp("&lt;", "g");
var connectionString = sql;
var pgClient = new pg.Client(connectionString);
var numQuotes = 0;
var randomMessageChance = 1; //%  
var reactChance = 100; //%
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

//fomelo bot

characterSheet = (character) => {
  let sheet = [];
  let hp = new RegExp("Hit Points", "g");
  let ac = new RegExp("AC", "g");
  let mana = new RegExp("Mana", "g");
  let AA = new RegExp("Earned", "g");

  sheet.push(`[NAME]: ${character[0]}`, `[CLASS]: ${character[1]}`);
  if (character[2].match(guildMatch)) { sheet.push(`[GUILD]: ${character[2].replace(guildMatch, '<').replace(/&gt;/g, '>')}`); }
  let statsOne = [];
  character.forEach(ele => {
      if (ele.match(hp)) statsOne.push(`[HP: ${ele.split(" ")[2]} |`);
      if (ele.match(ac)) statsOne.push(`AC: ${ele.split(" ")[1]} |`);
      if (ele.match(mana)) statsOne.push(`MANA: ${ele.split(" ")[1]}]`);
      if (ele.match(AA)) sheet.push(`[AA: ${ele}]`);
  })
  sheet.splice(sheet.length-1, 0, statsOne.join(" "));
  return sheet;
}
const fomelo = (character, channel) => {
  async function parseCharacter(info) {
      const result = await characterSheet(info);
      result.forEach(stat => {
        talk(stat, channel);
      });
  }
  axios.get(`http://shardsofdalaya.com/fomelo/fomelo.php?char=${character}`)
  .then((response) => {
      if (response.status === 200) {
          let notFound = new RegExp("Character not found", "g");
          let result;
          let resultArray = [];
          thing = response.data;
          if (thing.match(notFound)) { talk("Character not found in Fomelo database.", channel); return; }
          else {
              let a = thing.match(infoMatch).toString().replace(htmlStrip, ' ');
              result = a.split(",");
              result.forEach(element => {
              resultArray.push(element.trim().split(" ").filter(word => word).join(" "));
              });
              parseCharacter(resultArray);
          }
      }
  }, (error) => console.log(err));
}
//quote bot
const addQuote = (author, quote, channel) => {
  pgClient.query(`insert into quotes (author, quote) values ( '${author}', '${quote}' )`);
  getNumQuotes();
  lastQuote = quote;
  talk(`Quote ${Number(numQuotes)+1} added.`, channel);
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
    console.log(`DEBUG: Quote count is ${numQuotes}`);
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

const modifyAccess = (args, msg) => {
  //1: admin 2: normal
  switch (args[0]) {
    case 'add':
      pgClient.query(`insert into user_access (username, access_level) values (${args[1]}, ${args[2]})`);
      talk(`User ${args[1]} added with access level ${args[2]}`, msg);
    break;
    case 'del':
      pgClient.query(`delete from user_access where username like ${args[1]}`).then(r=>{
        if (r.rowCount < 1) talk(`User ${args[1]} doesn't exist.`, msg);
        else {
          talk(`User ${args[1]} removed.`, msg);
        }
      });
    break;
    default:
  }
}

const reactCheck = (txt) => {
  reactWords.forEach(word => {
    let regex = new RegExp(word.split(" ")[0], "g");
    if (txt.content.match(regex)) {
      let x = Math.floor(Math.random() * 100);
      if (x < reactChance) txt.react(word.split(" ")[1]);
    }
  });
}

const commandCheck = (msg) => {
  const args = msg.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  //admin command block
  if (msg.author.tag == "shaggers#3237") {
    switch (command) {
    case 'reactchance':
    reactChance = args[0];
    talk(`React chance set to ${reactChance}%! :]]`, msg);
    break;
    case 'test':
    break;
    case 'access':
    modifyAccess(args, msg);
    break;
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
  let stripLetters = new RegExp("[^A-Z+|^a-z+]", "g");
  let stripNumbers = new RegExp("[^0-9+]");
  switch (command) {
    case 'fomelo':
      if (!args[0]) talk('[Fomelo Bot] USAGE: .fomelo <character name>', msg);
      if (!isNaN(args[0])) talk('[Fomelo Bot]: Type a player name, not a number.', msg);
      else {
        args[0] = args[0].replace(stripLetters, '');
        fomelo(args[0], msg);
      }
    break;
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
    case 'avatar':
      talk(`ur dunce avatar:`, msg);
      talk(`${msg.author.displayAvatarURL()}`, msg);
    break;
    case 'help':
      talk('Commands: .addquote, .getquote, .numquotes', msg);
    default:
  }
}

//end of functions, begin event checks

bot.once('ready', () => {
  console.log(`DEBUG: Ready!`);
});

bot.on("message", (msg) => {
  commandCheck(msg);
  reactCheck(msg);
  if (msg.author.tag !== "Tweetster#1823") randomMessageCheck(msg);
});

const main = () => {
  numQuotes = getNumQuotes();
  bot.login(token);
}

main();