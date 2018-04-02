# worldopole-discord-bot
Simple bot for discord that polls wordopole API and sends notifications

[![pipeline status](https://gitlab.com/McCzarny/worldopole-discord-bot/badges/master/pipeline.svg)](https://gitlab.com/McCzarny/worldopole-discord-bot/commits/master)

## Settings
Settings could be loaded by settings.json file or using environment variables.

List of variables (:exclamation: required):  

**worldopoleHost** :exclamation: - host with wordopole without protocole prefix e.g. "host.com"  
**latitude** :exclamation: - default latitude for scans  
**longitude** :exclamation: - default longitude for scans  
**discordBotToken** :exclamation: - discord bot token needed to log in  
**apiPath** - path to aru.php relative to **wordpoleHost**, default: "worldopole/core/process/aru.php"  
**commonPokemonList** - list of pokemon numbers considered as common, default: []  
**commonMaxDistance** - max distance in meters for common pokemon notification, default: 500  
**uncommonPokemonList** - list of pokemon numbers considered as uncommon, default: []  
**uncommonMaxDistance** - max distance in meters for uncommon pokemon notification, default: 1000  
**rarePokemonList** - list of pokemon numbers considered as rare, default: []  
**rareMaxDistance** - max distance in meters for rare pokemon notification, default: 2000  
**ivMin** - mininmum iv for a scan, default: 0  
**ivMax** - maximum iv for scan, deafault: 100  
**pingAddress** - if set, bot will ping given address once in 5 minutes. Helpful for host like Heroke to not sleep webapp  
**wonderDistanceFactor** - factor that extends max distance in case if pokemon has high IV, default: 2  
**mapsApiKey** - optional key for google static maps, if set bot will attach map with pokemon position  
**locations** - optional list of location to use instead of coordinates, example "{'home': [50,50]}", default: {}  
**timeZone** - needed to correctly clear already notified pokemons, default:  Date().timeZone  
**scanIntervalSeconds** - interval of the scans, default: 300  


## Commands
**start** - Starts scans in default coordinates  
**start _[latitude]_,_[longitude]_** - Starts scans in given position  
**start _[location]_** - If **locations** contains coordinated for given name, then scan will be started  
**stop** - Stops current periodic scans  
**ping** - pong  
**status** - Displays current status like periodic scans and list of encounters  
**add-common _[number]_** - Temporarly adds number to the list of common pokemons  
**rem-common _[number]_** - Temporarly removes number to the list of common pokemons  


## Optional Google static maps
![Example of static map](http://maps.googleapis.com/maps/api/staticmap?&size=256x256&zoom=17&style=feature:landscape%7Ccolor:0xafffa0&style=feature:landscape.man_made%7Ccolor:0x37bda2&style=feature:road%7Celement:geometry%7Ccolor:0x59a499&style=feature:water%7Ccolor:0x1a87d6&markers=icon:https://process.filestackapi.com/AhTgLagciQByzXpFGRI0Az/resize=width:32/https://poketoolset.com/assets/img/pokemon/images/150.png%7C51.793879,19.589599&key=AIzaSyBtLSOU9cJv9iWFEEUzYzC_y8biwX0IJ-c)
