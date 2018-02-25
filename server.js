if (process.env.botuseenv) {
    var settings = {
        "api_path": process.env.api_path,
        "pokemon_list": JSON.parse(process.env.pokemon_list),
        "latitude": process.env.latitude,
        "longitude": process.env.longitude,
        "max_distance": process.env.max_distance,
        "ivMin": process.env.ivMin,
        "ivMax": process.env.ivMax,
        "token": process.env.token,
        "port": process.env.PORT
    }
} else {
    var settings = require('./settings.json')
}

var zlib = require('zlib');

async function process_results(pokemons, msg)
{
    console.log('response with ' + pokemons.points.length + ' pokemons')
    for (var i = 0; i < pokemons.points.length; i++) {
        var a = settings.longitude - pokemons.points[i].longitude;
        var b = settings.latitude - pokemons.points[i].latitude;
        if ((a*a + b*b) < settings.max_distance) {
            var pokemon = pokemons.points[i];
            console.log(`Pokemon met criteria: ${pokemon}`);
            const newEmbed = new Discord.RichEmbed()
            .setTitle(`Pokemon found: ${pokemon.name}`)
            .setDescription(`**${pokemon.name}**\nAttack: ${pokemon.individual_attack}\nDefense: ${pokemon.individual_defense}\nStamina: ${pokemon.individual_stamina}`)
            .setThumbnail(`https://poketoolset.com/assets/img/pokemon/images/${pokemon.pokemon_id}.png`)
            .setURL(`https://www.google.com/maps/search/?api=1&query=${pokemon.latitude},${pokemon.longitude}`);
            msg.channel.send({embed: newEmbed})
        }
    }
}

var request = require('request');
var url = settings.api_path;
var headers = { 
    'Host': 'lodz.pogomapy.pl',
    'Connection': 'keep-alive',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Origin': 'https://lodz.pogomapy.pl',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Referer': 'https://lodz.pogomapy.pl/worldopole/pokemon/42',
    //'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cookie': 'gsScrollPos-141=0; gsScrollPos-435=0; gsScrollPos-1865=0; PHPSESSID=56ae90db6c94b7c65bbc7736276b59ce; gs_v_GSN-765085-M=email:u439398@mvrht.net; _ga=GA1.2.305684431.1519380310; _gid=GA1.2.1131796530.1519380310; gs_u_GSN-765085-M=0a51795aa3f97ad7f6256b3a44af085c:11883:17507:1519492775394'
    };

function scan(msg){
    console.log('starting scan... Number of pokemons: ' + settings.pokemon_list.length)
    for (i=0; i<settings.pokemon_list.length; i++){
        var form = {
            'type': 'pokemon_live',
            'pokemon_id':  settings.pokemon_list[i],
            'inmap_pokemons': [],
            'ivMin': settings.ivMin,
            'ivMax': settings.ivMax
        };
        request.post({ url: url, form: form, headers: headers }, function(err, res, body) {
            if (!body) {
                console.log('Undefined body of response!')
                console.log("err: " + err + " res: " + res)
            }

            process_results(JSON.parse(body), msg)
        });
    }
};

process.on('unhandledRejection', (reason) => {
  console.error(reason);
  process.exit(1);
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

try {
} catch (e){
	console.log("Please create an auth.json like auth.json.example with a bot token or an email and password.\n"+e.stack);
	process.exit();
}

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
  });
  
bot.on('message', msg => {
if (msg.content === 'ping') {
    msg.reply('pong');
} else if(msg.content === 'scan') {
    scan(msg)
}
});

var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Hello!');
  res.end();
}).listen(settings.port);
  
console.log("logging in with token");
bot.login(settings.token);