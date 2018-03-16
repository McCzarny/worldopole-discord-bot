"use strict";

if (process.env.botuseenv) {
    var settings = {
        "worldopoleHost": process.env.worldopoleHost,
        "apiPath": process.env.apiPath,
        "commonPokemonList": JSON.parse(process.env.commonPokemonList),
        "uncommonPokemonList": JSON.parse(process.env.uncommonPokemonList),
        "rarePokemonList": JSON.parse(process.env.rarePokemonList),
        "latitude": process.env.latitude,
        "longitude": process.env.longitude,
        "commonMaxDistance": process.env.commonMaxDistance,
        "uncommonMaxDistance": process.env.uncommonMaxDistance,
        "rareMaxDistance": process.env.rareMaxDistance,
        "ivMin": process.env.ivMin,
        "ivMax": process.env.ivMax,
        "discordBotToken": process.env.discordBotToken,
        "pingAddress": process.env.pingAddress,
        "wonderFactor": process.env.wonderFactor,
        "mapsApiKey": process.env.mapsApiKey,
        "locations": JSON.parse(process.env.locations),
        "timeZone": process.env.timeZone,
        "scanIntervalSeconds": process.env.scanIntervalSeconds
    }
} else {
    var settings = require('./settings.json')
}

const {
    worldopoleHost,
    apiPath = "worldopole/core/process/aru.php",
    commonPokemonList = [],
    uncommonPokemonList = [],
    rarePokemonList = [],
    latitude,
    longitude,
    commonMaxDistance = 500,
    uncommonMaxDistance = 1000,
    rareMaxDistance = 2000,
    ivMin = 0,
    ivMax = 100,
    discordBotToken,
    pingAddress,
    wonderDistanceFactor = 2,
    mapsApiKey,
    locations = {},
    timeZone = Date().timeZone,
    scanIntervalSeconds = 300
 } = settings;

 if (!worldopoleHost || !latitude || !longitude || !discordBotToken) {
     console.error('One of mandatory settings missing. Cannot continue.')
     exit(1)
 }

var zlib = require('zlib');
var request = require('request');
var url = `https://${worldopoleHost}/${apiPath}`;
var headers = {
    'Host': `${worldopoleHost}`,
    'Connection': 'keep-alive',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Origin': `https://${worldopoleHost}`,
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Referer': `https://${worldopoleHost}/worldopole/pokemon/42`,
    'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cookie': 'gsScrollPos-141=0; gsScrollPos-435=0; gsScrollPos-1865=0; PHPSESSID=56ae90db6c94b7c65bbc7736276b59ce; gs_v_GSN-765085-M=email:u439398@mvrht.net; _ga=GA1.2.305684431.1519380310; _gid=GA1.2.1131796530.1519380310; gs_u_GSN-765085-M=0a51795aa3f97ad7f6256b3a44af085c:11883:17507:1519492775394'
};

console.log(`url: ${url} \nheaders: ${headers}`)

var encounterIds = [];

function removeEncounterId(encounterId) {
    for (var i = 0; i < encounterIds.length; i++) {
        if (encounterIds[i] == encounterId) {
            encounterIds.splice(i, 1);
            break;
        }
    }
}

function saveEncounterId(pokemon) {
    encounterIds.push(pokemon.encounter_id);
    var now = new Date().getTime();
    var endTime = new Date(`${pokemon.disappear_time_real.replace(/-/g, '/')} ${timeZone}`).getTime();
    setTimeout(function () {
        removeEncounterId(pokemon.encounter_id)
    }, endTime - now);
}

const MetersPerDegreeLatitude = 111320
const NaiveEarthPerimeter = 40057000
const MetersPerDegreeLongitude = (NaiveEarthPerimeter * Math.cos(longitude) / 360)
function getDistanceMetersPow(pointA, pointB) {
    var latitudeMeters = (pointA.latitude - pointB.latitude) * MetersPerDegreeLatitude
    var longitudeMeters = (pointA.longitude - pointB.longitude) * MetersPerDegreeLongitude
    return latitudeMeters * latitudeMeters + longitudeMeters * longitudeMeters
}

const MapStyle = "style=feature:landscape%7Ccolor:0xafffa0&style=feature:landscape.man_made%7Ccolor:0x37bda2&style=feature:road%7Celement:geometry%7Ccolor:0x59a499&style=feature:water%7Ccolor:0x1a87d6"
const IvWonder = 38
async function processResults(pokemons, msg, point, maxDistanceMetersPow) {
    console.log('response with ' + pokemons.points.length + ' pokemons')
    for (var i = 0; i < pokemons.points.length; i++) {
        var pokemon = pokemons.points[i];
        var iv = Number(pokemon.individual_attack) + Number(pokemon.individual_defense) + Number(pokemon.individual_stamina);
        var isWonder = iv >= IvWonder;
        console.log(`Distance ${Math.sqrt(getDistanceMetersPow(point, pokemon))} meters. ${getDistanceMetersPow(point, pokemon)}`);
        if (getDistanceMetersPow(point, pokemon) <= maxDistanceMetersPow * (isWonder ? wonderDistanceFactor : 1)) {
            console.log(`Pokemon met criteria: ${pokemon}`);
            const newEmbed = new Discord.RichEmbed()
                .setTitle(`${pokemon.name} ${(iv / 0.45).toFixed(2)}% found!`)
                .setDescription(`**${pokemon.name}**\nAttack: ${pokemon.individual_attack}\nDefense: ${pokemon.individual_defense}\nStamina: ${pokemon.individual_stamina}\nWill disappear: ${pokemon.disappear_time_real}`)
                .setThumbnail(`https://poketoolset.com/assets/img/pokemon/images/${pokemon.pokemon_id}.png`)
                .setURL(`https://www.google.com/maps/search/?api=1&query=${pokemon.latitude},${pokemon.longitude}`)
              
            if (mapsApiKey) {
                newEmbed.setImage(`http://maps.googleapis.com/maps/api/staticmap?&size=256x256&zoom=17&${MapStyle}&markers=icon:https://process.filestackapi.com/AhTgLagciQByzXpFGRI0Az/resize=width:32/https://poketoolset.com/assets/img/pokemon/images/${pokemon.pokemon_id}.png%7C${pokemon.latitude},${pokemon.longitude}&key=${mapsApiKey}`);
            }
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

function sendRequest(msg, pokemonId, point, maxDistanceMetersPow)
{
    var form = {
        'type': 'pokemon_live',
        'pokemon_id': pokemonId,
        'inmap_pokemons': encounterIds,
        'ivMin': ivMin,
        'ivMax': ivMax
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

        processResults(JSON.parse(body), msg, point, maxDistanceMetersPow)
    });
}

var lastScan;

function scan(msg, point = {
    'longitude': longitude,
    'latitude': latitude
}) {
    console.log(`Starting scan, at point ${point.longitude}, ${point.latitude}.`);
    lastScan = new Date().getTime();
    for (var i = 0; i < commonPokemonList.length; i++) {
        sendRequest(msg, commonPokemonList[i], point, commonMaxDistance * commonMaxDistance)
    }

    for (var i = 0; i < uncommonPokemonList.length; i++) {
        sendRequest(msg, uncommonPokemonList[i], point, uncommonMaxDistance * uncommonMaxDistance)
    }

    for (var i = 0; i < rarePokemonList.length; i++) {
        sendRequest(msg, rarePokemonList[i], point, rareMaxDistance * rareMaxDistance)
    }
};

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

var pendingInterval = -1
function startScan(msg, point = {
    'longitude': longitude,
    'latitude': latitude
}) {
    if (pendingInterval != -1) {
        return false
    }

    pendingInterval = setInterval(function () {scan(msg, point)}, scanIntervalSeconds * 1000);
    scan(msg, point);

    return true
};

function stopScan() {
    if (pendingInterval != -1) {
        clearInterval(pendingInterval);
        pendingInterval = -1;
        return true
    }

    return false
}

function getStatus() {
    var statusMessage;
    var encounterIdsString = `Current encounterIds(${encounterIds.length}): ${encounterIds}`;
    var meminfo = '';
    const used = process.memoryUsage();
    for (let key in used) {
        meminfo += `${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB\n`;
    }

    if (interval != -1) {
        var lastScanTime = new Date(lastScan).toLocaleTimeString();
        var nextScanTime = new Date(lastScan + (getInterval() * 60 * 1000)).toLocaleTimeString();
        statusMessage = `There is an active periodic scan...\nLast scan was performed ${lastScanTime} and next will be started ${nextScanTime}.\n${encounterIdsString}\n${meminfo}`;
    } else {
        statusMessage = `There is no active periodic scan...\n${encounterIdsString}\n${meminfo}`;
    }

    return statusMessage;
}

const scanPointRegexp = /^scan ([0-9\.]+),([0-9\.]+)$/g 
const startPointRegexp = /^start ([0-9\.]+),([0-9\.]+)$/g
bot.on('message', msg => {
    var msgContentLowerCase = msg.content.toLocaleLowerCase()
    if (msgContentLowerCase === 'ping') {
        msg.reply('pong');
    } else if (msgContentLowerCase === 'scan') {
        msg.reply("Ok, I will check if there are some pokemons around!");
        scan(msg)
    } else if (msgContentLowerCase.startsWith('start')) {
        if (pendingInterval != -1) {
            msg.reply('There is already active scan.');
        } else {
            if (msgContentLowerCase === 'start') {
                msg.reply('Starting periodic scan...');
                startScan(msg, {'latitude': latitude,'longitude': longitude})
            } else if (startPointRegexp.test(msgContentLowerCase)) {
                startPointRegexp.lastIndex = 0;
                var match = startPointRegexp.exec(msgContentLowerCase);
                console.log(match, msgContentLowerCase)
                if (match) {
                    msg.reply(`Starting periodic scan in position: ${match[1]}, ${match[2]}`);
                    startScan(msg, {'latitude': match[1],'longitude': match[2]})
                }
            } else if(msg.content.slice('start '.length) in locations) {
                var location = msg.content.slice('start '.length)
                msg.reply(`Starting periodic scan in location: ${location}`);
                startScan(msg, {'latitude': locations[location][0],'longitude': locations[location][1]})
            } else {
                console.log(`There is something wrong with this command: [${msg.content}]`);
                msg.reply('I do not understand this start command.');
            }
        }
    } else if (msgContentLowerCase === 'stop') {
        msg.reply('Stopping periodic scan...');

        if (!stopScan()) {
            msg.reply('There is no active periodic scan...');
        }
    } else if (msgContentLowerCase === 'status') {
        msg.reply(getStatus())
    } else if (msgContentLowerCase.startsWith('announce')) {
        announce(':loudspeaker: < ' + msg.content.slice('announce '.length));
    } else if (scanPointRegexp.test(msgContentLowerCase)) {
        scanPointRegexp.lastIndex = 0;
        var match = scanPointRegexp.exec(msgContentLowerCase);
        console.log(match, msg.content)
        if (match) {
            msg.reply(`Ok, I will check if there are some pokemons in position: ${match[1]}, ${match[2]}`);
            scan(msg, {
                'latitude': match[1],
                'longitude': match[2]
            });
        }
    } else if (msgContentLowerCase.startsWith('add-common ')) {
        var num = Number(msg.content.substr('add-common '.length));

        if (num) {
            msg.reply(`Adding pokemon: ${num}`);
            commonPokemonList.push(num);
        } else {
            msg.reply('Wrong format. Should be like "add 1"')
        }
    } else if (msgContentLowerCase.startsWith('rem-common ')) {
        var num = Number(msg.content.substr('rem-common '.length));

        if (num) {
            msg.reply(`Removing pokemon: ${num}`);
            var index = commonPokemonList.indexOf(num);
            if (index > -1) {
                commonPokemonList.splice(index, 1);
            }
        } else {
            msg.reply('Wrong format. Should be like "rem 1"')
        }
    }
});

if (process.env.PORT) {
    console.log(`PORT set. Binding to ${process.env.PORT}`)

    var http = require('http');
    http.createServer(function (req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/plain'
        });
        res.write(getStatus());
        res.end();
    }).listen(process.env.PORT);
}

if (pingAddress) {
    console.log(`Ping address set. Running auto ping for ${pingAddress}`);
    setInterval(function () {
        request(pingAddress, function () {});
    }, 60000 * (getInterval()));
}

console.log("logging in with token");
bot.login(discordBotToken);