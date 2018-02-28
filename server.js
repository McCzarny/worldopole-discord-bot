if (process.env.botuseenv) {
    var settings = {
        "worldopole_host": process.env.worldopole_host,
        "api_path": process.env.api_path,
        "pokemon_list": JSON.parse(process.env.pokemon_list),
        "latitude": process.env.latitude,
        "longitude": process.env.longitude,
        "max_distance": process.env.max_distance,
        "ivMin": process.env.ivMin,
        "ivMax": process.env.ivMax,
        "token": process.env.token,
        "port": process.env.PORT,
        "ping_address": process.env.ping_address
    }
} else {
    var settings = require('./settings.json')
}

var zlib = require('zlib');
var request = require('request');
var url = settings.api_path;
var headers = { 
    'Host': `${settings.worldopole_host}`,
    'Connection': 'keep-alive',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Origin': `https://${settings.worldopole_host}`,
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Referer': `https://${settings.worldopole_host}/worldopole/pokemon/42`,
    //'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cookie': 'gsScrollPos-141=0; gsScrollPos-435=0; gsScrollPos-1865=0; PHPSESSID=56ae90db6c94b7c65bbc7736276b59ce; gs_v_GSN-765085-M=email:u439398@mvrht.net; _ga=GA1.2.305684431.1519380310; _gid=GA1.2.1131796530.1519380310; gs_u_GSN-765085-M=0a51795aa3f97ad7f6256b3a44af085c:11883:17507:1519492775394'
    };

var encounterIds = [];
function removeEncounterId(encounter_id) {
	for (var i = 0; i < encounterIds.length; i++) {
		if (encounterIds[i] == encounter_id) {
			encounterIds.splice(i, 1);
			break;
		}
	}
}

function saveEncounterId(pokemon) {
    encounterIds.push(pokemon.encounter_id);
	var now = new Date().getTime();
	var endTime = new Date(pokemon.disappear_time_real.replace(/-/g, '/')).getTime();
	setTimeout(function() { removePokemonMarker(pokemon.encounter_id) }, endTime - now);
}

async function process_results(pokemons, msg, point)
{
    console.log('response with ' + pokemons.points.length + ' pokemons')
    for (var i = 0; i < pokemons.points.length; i++) {
        var a = point.longitude - pokemons.points[i].longitude;
        var b = point.latitude - pokemons.points[i].latitude;
        if ((a*a + b*b) < settings.max_distance) {
            var pokemon = pokemons.points[i];
            console.log(`Pokemon met criteria: ${pokemon}`);
            const newEmbed = new Discord.RichEmbed()
            .setTitle(`${pokemon.name} found!`)
            .setDescription(`**${pokemon.name}**\nAttack: ${pokemon.individual_attack}\nDefense: ${pokemon.individual_defense}\nStamina: ${pokemon.individual_stamina}\nWill disappear: ${pokemon.disappear_time_real}`)
            .setThumbnail(`https://poketoolset.com/assets/img/pokemon/images/${pokemon.pokemon_id}.png`)
            .setURL(`https://www.google.com/maps/search/?api=1&query=${pokemon.latitude},${pokemon.longitude}`);

            if (pokemon.individual_attack + pokemon.individual_defense + pokemon.individual_stamina > 40) {
                console.log("Wonderful pokemon!");
                newEmbed.setColor('[255, 255, 0]');
            }

            msg.channel.send({embed: newEmbed});
            saveEncounterId(pokemon);
        }
    }
}

var lastScan;

function scan(msg, point={'longitude': settings.longitude, 'latitude': settings.latitude}){
    console.log(`starting scan... Number of pokemons: ${settings.pokemon_list.length}, point ${point.longitude}, ${point.latitude}.`);
    lastScan = new Date().getTime();
    for (i=0; i<settings.pokemon_list.length; i++){
        var form = {
            'type': 'pokemon_live',
            'pokemon_id':  settings.pokemon_list[i],
            'inmap_pokemons': encounterIds,
            'ivMin': settings.ivMin,
            'ivMax': settings.ivMax
        };
        request.post({ url: url, form: form, headers: headers }, function(err, res, body) {
            if (!body) {
                console.log('Undefined body of response!')
                console.log("err: " + err + " res: " + res)
            }

            process_results(JSON.parse(body), msg, point)
        });
    }
};

function getInterval() {
    return settings.interval || 5;
}

function announce(text) {
    if (bot) {
        bot.guilds.forEach((guild) => { //for each guild the bot is in
            guild.channels.some((channel) => {
                if(channel.type == "text"
                && channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
                    channel.send(text);
                    return true;
                }
                return false;
            })
        });
    }
}

var interval=-1

process.on('unhandledRejection', (reason) => {
  console.error(reason);
  announce("Ups, I have a problem. Needs to go now.")
  process.exit(1);
});

process.on('SIGTERM', function () {
    announce("Needs to go now.")
    process.exit(0);
  });
  
try {
	var Discord = require("discord.js");
} catch (e){
	console.log(e.stack);
	console.log(process.version);
	console.log("Please run npm install and ensure it passes with no errors!");
	process.exit();
}
console.log("Starting DiscordBot\nNode version: " + process.version + "\nDiscord.js version: " + Discord.version);

// Initialize Discord Bot
console.log('Initializing bot...');
var bot = new Discord.Client();
console.log('Done.');

bot.on("disconnected", function () {

	console.log("Disconnected!");
	process.exit(1); //exit node.js with an error
});

bot.on('ready', () => {
    console.log(`Logged in as ${bot.user.tag}!`);
    announce(":robot: hello everyone!");
  });

var scanPointRegexp = /^scan ([0-9\.]+),([0-9\.]+)$/g

bot.on('message', msg => {
    if (msg.content === 'ping') {
        msg.reply('pong');
    } else if(msg.content === 'scan') {
        msg.reply("Ok, I will check if there are some pokemons around!");
        scan(msg)
    } else if(msg.content === 'start') {
        msg.reply('Starting periodic scan...');
        if (interval != -1) {
            msg.reply('There is already active scan.');
        } else {
            interval = setInterval (function () {
                scan(msg)
            }, 60000 * (getInterval()));
            scan(msg);
        }
    } else if(msg.content === 'stop') {
        msg.reply('Stopping periodic scan...');
        
        if(interval != -1) {
            clearInterval(interval);
            interval = -1;
        } else {
            msg.reply('There is no active periodic scan...');
        }
    } else if(msg.content === 'status') {
        var encounterIdsString = `Current encounterIds(${encounterIds.length}): ${encounterIds}`;
        if(interval != -1) {
            var lastScanTime = new Date(lastScan).toLocaleTimeString();
            var nextScanTime = new Date(lastScan + (getInterval() * 60 * 1000)).toLocaleTimeString();
            msg.reply(`There is an active periodic scan...\nLast scan was performed ${lastScanTime} and next will be started ${nextScanTime}.\n${encounterIdsString}`);
        } else {
            msg.reply(`There is no active periodic scan...\n${encounterIdsString}`);
        }
    } else if (msg.content.startsWith('announce')) {
        announce(':loudspeaker: < ' + msg.content.slice(start=8));
    } else if (scanPointRegexp.test(msg.content)) {
        scanPointRegexp.lastIndex = 0;
        var match = scanPointRegexp.exec(msg.content);
        console.log(match, msg.content)
        if (match) {
            msg.reply(`Ok, I will check if there are some pokemons in position: ${match[1]}, ${match[2]}`);
            scan(msg, {'latitude': match[1], 'longitude': match[2]});
        }
    }
});

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Hello!');
  res.end();
}).listen(settings.port);

if (settings.ping_address) {
    console.log(`Ping address set. Running auto ping for ${settings.ping_address}`);
    setInterval (function () {
        request(settings.ping_address, function () {});
    }, 60000 * (getInterval()));
}
  
console.log("logging in with token");
bot.login(settings.token);