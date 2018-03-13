"use strict";

if (process.env.botuseenv) {
    var settings = {
        "worldopole_host": process.env.worldopole_host,
        "api_path": process.env.api_path,
        "common_pokemon_list": JSON.parse(process.env.common_pokemon_list),
        "uncommon_pokemon_list": JSON.parse(process.env.uncommon_pokemon_list),
        "rare_pokemon_list": JSON.parse(process.env.rare_pokemon_list),
        "latitude": process.env.latitude,
        "longitude": process.env.longitude,
        "common_max_distance": process.env.common_max_distance,
        "uncommon_max_distance": process.env.uncommon_max_distance,
        "rare_max_distance": process.env.rare_max_distance,
        "ivMin": process.env.ivMin,
        "ivMax": process.env.ivMax,
        "token": process.env.token,
        "ping_address": process.env.ping_address,
        "wonder_factor": process.env.wonder_factor,
        "maps_api_key": process.env.maps_api_key,
        "locations": JSON.parse(process.env.locations)
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
    setTimeout(function () {
        removePokemonMarker(pokemon.encounter_id)
    }, endTime - now);
}

var map_style = "style=feature:landscape%7Ccolor:0xafffa0&style=feature:landscape.man_made%7Ccolor:0x37bda2&style=feature:road%7Celement:geometry%7Ccolor:0x59a499&style=feature:water%7Ccolor:0x1a87d6"

async function process_results(pokemons, msg, point, max_distance) {
    console.log('response with ' + pokemons.points.length + ' pokemons')
    for (var i = 0; i < pokemons.points.length; i++) {
        var pokemon = pokemons.points[i];
        var a = point.longitude - pokemon.longitude;
        var b = point.latitude - pokemon.latitude;
        var iv = Number(pokemon.individual_attack) + Number(pokemon.individual_defense) + Number(pokemon.individual_stamina);
        var isWonder = iv > 38;
        if ((a * a + b * b) < max_distance * (isWonder ? settings.wonder_factor : 1)) {
            console.log(`Pokemon met criteria: ${pokemon}`);
            const newEmbed = new Discord.RichEmbed()
                .setTitle(`${pokemon.name} ${(iv / 0.45).toFixed(2)}% found!`)
                .setDescription(`**${pokemon.name}**\nAttack: ${pokemon.individual_attack}\nDefense: ${pokemon.individual_defense}\nStamina: ${pokemon.individual_stamina}\nWill disappear: ${pokemon.disappear_time_real}`)
                .setThumbnail(`https://poketoolset.com/assets/img/pokemon/images/${pokemon.pokemon_id}.png`)
                .setURL(`https://www.google.com/maps/search/?api=1&query=${pokemon.latitude},${pokemon.longitude}`)
                .setImage(`http://maps.googleapis.com/maps/api/staticmap?&size=256x256&zoom=17&${map_style}&markers=icon:https://process.filestackapi.com/AhTgLagciQByzXpFGRI0Az/resize=width:32/https://poketoolset.com/assets/img/pokemon/images/${pokemon.pokemon_id}.png%7C${pokemon.latitude},${pokemon.longitude}&key=${settings.maps_api_key}`);

            if (isWonder) {
                console.log("Wonderful pokemon!");
                newEmbed.setColor([255, 255, 0]);
            }

            msg.channel.send({
                embed: newEmbed
            });
            saveEncounterId(pokemon);
        }
    }
}

function sendRequest(msg, pokemon_id, point, max_distance)
{
    var form = {
        'type': 'pokemon_live',
        'pokemon_id': pokemon_id,
        'inmap_pokemons': encounterIds,
        'ivMin': settings.ivMin,
        'ivMax': settings.ivMax
    };
    request.post({
        url: url,
        form: form,
        headers: headers
    }, function (err, res, body) {
        if (!body) {
            console.log('Undefined body of response!')
            console.log("err: " + err + " res: " + res)
        }

        process_results(JSON.parse(body), msg, point, max_distance)
    });
}

var lastScan;

function scan(msg, point = {
    'longitude': settings.longitude,
    'latitude': settings.latitude
}) {
    console.log(`Starting scan, at point ${point.longitude}, ${point.latitude}.`);
    lastScan = new Date().getTime();
    for (var i = 0; i < settings.common_pokemon_list.length; i++) {
        sendRequest(msg, settings.common_pokemon_list[i], point, settings.common_max_distance)
    }

    for (var i = 0; i < settings.uncommon_pokemon_list.length; i++) {
        sendRequest(msg, settings.uncommon_pokemon_list[i], point, settings.uncommon_max_distance)
    }

    for (var i = 0; i < settings.rare_pokemon_list.length; i++) {
        sendRequest(msg, settings.rare_pokemon_list[i], point, settings.rare_max_distance)
    }
};

function getInterval() {
    return settings.interval || 5;
}

function announce(text) {
    if (bot) {
        bot.guilds.forEach((guild) => {
            guild.channels.some((channel) => {
                if (channel.type == "text" &&
                    channel.permissionsFor(guild.me).has("SEND_MESSAGES")) {
                    channel.send(text);
                    return true;
                }
                return false;
            })
        });
    }
}

var interval = -1

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
} catch (e) {
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


bot.on('message', msg => {
    var scanPointRegexp = /^scan ([0-9\.]+),([0-9\.]+)$/g

    if (msg.content === 'ping') {
        msg.reply('pong');
    } else if (msg.content === 'scan') {
        msg.reply("Ok, I will check if there are some pokemons around!");
        scan(msg)
    } else if (msg.content.startsWith('start')) {
        if (interval != -1) {
            msg.reply('There is already active scan.');
        } else {
            var startPointRegexp = /^start ([0-9\.]+),([0-9\.]+)$/g
            if (msg.content === 'start') {
                msg.reply('Starting periodic scan...');
                interval = setInterval(function () {
                    scan(msg)
                }, 60000 * (getInterval()));
                scan(msg);
            } else if (startPointRegexp.test(msg.content)) {
                startPointRegexp.lastIndex = 0;
                var match = startPointRegexp.exec(msg.content);
                console.log(match, msg.content)
                if (match) {
                    msg.reply(`Starting periodic scan in position: ${match[1]}, ${match[2]}`);
                    interval = setInterval(function () {
                        scan(msg, {
                            'latitude': match[1],
                            'longitude': match[2]
                        })
                    }, 60000 * (getInterval()));
                    scan(msg, {
                        'latitude': match[1],
                        'longitude': match[2]
                    });
                }
            } else if(msg.content.slice('start '.length) in settings.locations) {
                msg.reply(`Position found ${settings.locations[msg.content.slice('start '.length)]}`)
            } else {
                console.log(`There is something wrong with this command: [${msg.content}]`);
                msg.reply('I do not understand this start command.');
            }
        }
    } else if (msg.content === 'stop') {
        msg.reply('Stopping periodic scan...');

        if (interval != -1) {
            clearInterval(interval);
            interval = -1;
        } else {
            msg.reply('There is no active periodic scan...');
        }
    } else if (msg.content === 'status') {
        var encounterIdsString = `Current encounterIds(${encounterIds.length}): ${encounterIds}`;
        var meminfo = '';
        const used = process.memoryUsage();
        for (let key in used) {
            meminfo += `${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB\n`;
        }

        if (interval != -1) {
            var lastScanTime = new Date(lastScan).toLocaleTimeString();
            var nextScanTime = new Date(lastScan + (getInterval() * 60 * 1000)).toLocaleTimeString();
            msg.reply(`There is an active periodic scan...\nLast scan was performed ${lastScanTime} and next will be started ${nextScanTime}.\n${encounterIdsString}\n${meminfo}`);
        } else {
            msg.reply(`There is no active periodic scan...\n${encounterIdsString}\n${meminfo}`);
        }
    } else if (msg.content.startsWith('announce')) {
        announce(':loudspeaker: < ' + msg.content.slice(start = 8));
    } else if (scanPointRegexp.test(msg.content)) {
        scanPointRegexp.lastIndex = 0;
        var match = scanPointRegexp.exec(msg.content);
        console.log(match, msg.content)
        if (match) {
            msg.reply(`Ok, I will check if there are some pokemons in position: ${match[1]}, ${match[2]}`);
            scan(msg, {
                'latitude': match[1],
                'longitude': match[2]
            });
        }
    } else if (msg.content.startsWith('set ')) {
        var tokens = msg.content.split(' ');
        if (tokens.length < 3) {
            msg.reply('Wrong format. Should be "set option value"');
        } else {
            msg.reply(`Changing settings: ${tokens[1]}=${tokens[2]}`);
            settings[tokens[1]] = tokens[2];
        }
    } else if (msg.content.startsWith('add-common ')) {
        var num = Number(msg.content.substr('add-common '.length));

        if (num) {
            msg.reply(`Adding pokemon: ${num}`);
            settings.common_pokemon_list.push(num);
        } else {
            msg.reply('Wrong format. Should be like "add 1"')
        }
    } else if (msg.content.startsWith('rem-common ')) {
        var num = Number(msg.content.substr('rem-common '.length));

        if (num) {
            msg.reply(`Removing pokemon: ${num}`);
            var index = settings.pokemon_list.indexOf(num);
            if (index > -1) {
                settings.pokemon_list.splice(index, 1);
            }
        } else {
            msg.reply('Wrong format. Should be like "rem 1"')
        }
    }
});

var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    res.write('Hello!');
    res.end();
}).listen(process.env.PORT);

if (settings.ping_address) {
    console.log(`Ping address set. Running auto ping for ${settings.ping_address}`);
    setInterval(function () {
        request(settings.ping_address, function () {});
    }, 60000 * (getInterval()));
}

console.log("logging in with token");
bot.login(settings.token);