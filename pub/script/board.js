/* board js */

'use strict';

//==========================================================================
// Global Variables needed
//==========================================================================

// General purpose user class
function userClass(username, password, id)
{
	this.username = username,
	this.password = password,
	this.id = id,
	this.fullname = null,
	this.email = null,
	this.ownedPieces = [],
	this.isAdmin = false
};

let login = new userClass(localStorage.getItem("username"), localStorage.getItem("username"), "0");
login.isAdmin = (/true/i).test(localStorage.getItem("admin"));

let diceRolling = false;

//==========================================================================
// Elements that would normally be stored in an .h file
//==========================================================================

// Some constants needed to construct the board
const maxTiles = 40;
const maxDoubles = 3;
const unbuyableTiles = [0, 2, 4, 7, 10, 17, 20, 22, 30, 33, 36, 38];
const chanceTiles = [7, 22, 36];
const communityTiles = [2, 17, 33];
const taxTiles = [4, 38];
const cornerTiles = [0, 10, 20, 30];
const utilityTiles = [12, 28];
const ttcTiles = [5, 15, 25, 35];

// Tile Flags
const TILE_FLAG_NORMAL = 0
const TILE_FLAG_GO = 1;
const TILE_FLAG_COMMUNITY = 2;
const TILE_FLAG_CHANCE = 4;
const TILE_FLAG_JAIL = 8;
const TILE_FLAG_FREEPARKING = 16;
const TILE_FLAG_GOTOJAIL = 32;
const TILE_FLAG_TAX = 64;
const TILE_FLAG_UTILITY = 128;
const TILE_FLAG_TTC = 256; 

// Game State Flags
const GAMESTATE_END = 0;
const GAMESTATE_PLAYER_TURN = 1;
const GAMESTATE_PLAYER_ROLL = 2;
const GAMESTATE_PLAYER_MOVE = 4;
const GAMESTATE_PLAYER_INFO = 8;
const GAMESTATE_PLAYER_DECISION = 16;
const GAMESTATE_AI_TURN = 32;
const GAMESTATE_AI_ROLL = 64;
const GAMESTATE_AI_MOVE = 128;
const GAMESTATE_AI_INFO = 256;
const GAMESTATE_AI_DECISION = 512;

// AI Profiles
const AI_PROFILE_TEST = -1;
const AI_PROFILE_RANDOM = 0;
const AI_PROFILE_AGGRESSIVE = 1;

// Game Type
const GAME_TYPE_PVE = 0;
const GAME_TYPE_PVEP = 1;
const GAME_TYPE_PVP = 2;

// Jail Turns
const JAIL_TURN_NONE = 0;
const JAIL_TURN_DEFAULT = 3;

// Player Colors
const playerColors = [ "magenta", "blue", "green", "orange" ];

// Building codes, building names and descriptions are stored here for convenience
const tileNames = [ ["GO", "GO",],
					["MB","Mining Building"],
					["COMMUNITY","Community"],
					["PB","Pharmacy Building"],
					["TUITION FEES","Tuition Fees"],
					["TTC SOUTH","TTC South"],
					["BA","Bahen Center"],
					["CHANCE","Chance"],
					["ES","Earth Sciences"],
					["SS","Sidney Smith"],
					["AS","Academic Suspension"],
					["IN","Innis"],
					["RL","Robarts Library"],
					["KS","Koeffler Student Center"],
					["LB","Lassonde Building"],
					["TTC WEST","TTC West"],
					["RW","Ramsay Wright Labs"],
					["COMMUNITY","Community"],
					["HH","Hart House"],
					["MP","M-Physics Labs"],
					["AB","Anthropology Building"],
					["AC","Architecture Building"],
					["CHANCE","Chance"],
					["VC","Victoria College"],
					["BC","Bancroft Building"],
					["TTC NORTH","TTC North"],
					["SC","Student Commons"],
					["CA","Sid's Cafe"],
					["CL","Claude T. Bissell Building"],
					["CR","Carr Hall"],
					["PO","Political Offense"],
					["CF","Cardinal Flahiff Building"],
					["WH","Whitney Hall"],
					["COMMUNITY","Community"],
					["CO","Convocation Hall"],
					["TTC EAST","TTC East"],
					["CHANCE","Chance"],
					["EX","Exam Center"],
					["INCOME TAX","Income Tax"],
					["AH","Alumni Hall"]
];

const tileColorGroups = [	[1, 3],
							[6, 8, 9],
							[11, 13, 14],
							[16, 18, 19],
							[21, 23, 24],
							[26, 27, 29],
							[31, 32, 34],
							[37, 39]

];


// Descriptions for chance and community cards need to be hardcoded as well as their effects,
// incremental selection of cards not recommended
// One-based indexes here to match the image file names!
const NUM_CHANCE_CARDS = 16;
const NUM_COMMUNITY_CARDS = 16;
let chanceCounter = 1;
let communityChestCounter = 1;

//==========================================================================
// 'Class' definitions
//==========================================================================

// Placeholder for piece class
function pieceClass(id, name, description)
{
	this.name = name,
	this.description = description,
	this.id = id
};

// This is the player class, starts with default money, unjailed and generally null information. Users are players, but not all players are users (AI)
function playerClass()
{
	this.user = null,
	this.piece = null,
	this.color = null,
	this.money = 1500,
	this.jailed = false,
	this.jailturns = 0,
	this.pastfirst = true, //false,
	this.passedgo = false,
	this.gorestrict = false,
	this.previousposition = 0,
	this.position = 0
};

// This is board class, it contains the tiles, a tracker of player turn, and in which order players play. The game state is also saved here
function boardClass()
{
	this.tiles = [],
	this.players = [],
	this.playerTurns = [],
	this.playerTurn = 0,
	this.gameState = 0,
	this.dice = [ 1, 1 ],
	this.infoedTile = null
}

// This is where all information pertinent to a tile is stored
function tileClass()
{
	// basic information about the tiles
	this.name = "",
	this.fullname = ""
	this.desc = "",
	this.image = null,
	
	// Do we deal a random community or chance card
	this.tileflags = TILE_FLAG_NORMAL;
	
	// Is this a purchasable property
	this.purchaseable = false, // Can you even buy this
	this.price = 0, // price is used to calculate rent and construction prices as well as tax tile payup and utility/ttc paying computations
	this.owner = null,
	this.building = false
}

//==========================================================================
// Initializing and testing
//==========================================================================

window.addEventListener('load', readyBoard);

// This function populates the board with a tile
function initializeBoard(board)
{
	// Generate tiles to place in the board
	for (let i = 0; i < maxTiles; i++)
	{
		// Set name, full name, description and image using the const array
		const newTile = new tileClass();
		newTile.name = tileNames[i][0];
		newTile.fullname = tileNames[i][1];
		//newTile.desc = 
		newTile.image = newTile.name + ".png";
		
		// Check if those are corner tiles and apply the necessary properties
		if (cornerTiles.includes(i))
		{
			switch(i)
			{
				case 10:
					newTile.tileflags = TILE_FLAG_JAIL;
					newTile.image = "as.png";
					break;			
				case 20:
					newTile.tileflags = TILE_FLAG_FREEPARKING;
					newTile.image = "fp.png";
					break;			
				case 30:
					newTile.tileflags = TILE_FLAG_GOTOJAIL;
					newTile.image = "go2jail.png";
					break;			
				default:
					newTile.tileflags = TILE_FLAG_GO;
					newTile.image = "go4it.png";
					break;
			}
		}
		

		// Check if you can buy said tiles
		if (!unbuyableTiles.includes(i))
		{
			newTile.purchaseable = true;
			// Check if this a utility tile
			if (utilityTiles.includes(i))
			{
				newTile.tileflags = TILE_FLAG_UTILITY;
				newTile.price = 250;
			}
			else if (ttcTiles.includes(i))
			{
				newTile.tileflags = TILE_FLAG_TTC;
				newTile.price = 200;
				newTile.image = "ttc.svg"
			}
			else
			{
				newTile.price = 100 + (i - 1) * 20;
			}
		}
		else
		{
			if (taxTiles.includes(i))
			{
				newTile.tileflags = TILE_FLAG_TAX;
				if (i == taxTiles[1])
				{
					newTile.price = 200;
					newTile.image = "specimen.png";
				}
				else
				{
					newTile.price = 100;
					newTile.image = "ACORN.png";
				}
			}
		}
		
		// Check if this is a community tile
		if (communityTiles.includes(i))
		{
			newTile.tileflags = TILE_FLAG_COMMUNITY;
			newTile.image = "communityChest.gif";
		}

		// Check if this a chance tile
		if (chanceTiles.includes(i))
		{
			newTile.tileflags = TILE_FLAG_CHANCE;
			newTile.image = "/Chance/Chance" + chanceCounter + ".PNG";
			chanceCounter = (chanceCounter + 1)%NUM_CHANCE_CARDS;
		}
		
		
		board.tiles.push(newTile);
		
		// Set the names
		const boardHTML = document.getElementById('board');
		const boardHTMLTile = boardHTML.children[i + 1];
		if (cornerTiles.includes(i))
		{
			//boardHTMLTile.innerHTML = newTile.name;
		}
		else if (communityTiles.includes(i) || chanceTiles.includes(i))
		{
			boardHTMLTile.children[0].innerHTML = newTile.name;
		}
		else if (utilityTiles.includes(i) || ttcTiles.includes(i) || taxTiles.includes(i))
		{
			boardHTMLTile.children[0].innerHTML = newTile.name;
			boardHTMLTile.children[1].innerHTML = '$' + newTile.price;
		}
		else
		{
			boardHTMLTile.children[1].innerHTML = newTile.name;
			boardHTMLTile.children[2].innerHTML = '$' + newTile.price;
		}
		
		// Set the prices
	}
}

// Get the players ready
function initializePlayers(board, numPlayers)
{
	if (numPlayers < 2)
		alert("Insufficent player number.");
	
	if (numPlayers > 4)
		alert("Too many players.");
	
	if (!login)
		alert("No user logged in");
	
	// Add actual player
	const newPlayer = new playerClass()
	newPlayer.user = login;
	newPlayer.color = playerColors[0];
	board.players.push(newPlayer);
	board.playerTurns.push(0);
	
	// Add AI players
	for (let i = 1; i < numPlayers; i++)
	{
		const newAI = new playerClass();
		newAI.color = playerColors[i];
		board.players.push(newAI)
		board.playerTurns.push(i);
	}
	
	// Get the player pieces in position
	for (let i = 0; i < numPlayers; i++)
	{	
		offsetPiece(i, 0);
	}
	
	// Shuffle playing order
	board.playerTurns.sort(() => Math.random() - 0.5);
	
	if (board.players[board.playerTurns[0]].user == null)
	{
		board.gameState = GAMESTATE_AI_TURN;
		setTimeout(aiRollTheDice, 2000);
	}
	else
	{
		board.gameState = GAMESTATE_PLAYER_TURN;
		highlightDice();
	}
	
	console.log('Player ' + board.playerTurns[board.playerTurn] + "'s turn ");
}

// Get the player list prepared. Add a resign button for human player and highlight whoever's turn it is, if human is logged as admin, he can kick other players out
function initializePlayerList(board)
{
	const playerList = document.getElementById("playerList");
	
	// Add the players in descending order of the playerturn list	
	for (let i = 0; i < board.players.length; i++)
	{
		const actualPlayerId = board.playerTurns[i];
		const playerSlot = document.createElement("div");
		playerSlot.setAttribute("id","playerSlot");
		
		if (board.playerTurn == i)
			playerSlot.setAttribute("style","color:red");
		else
			playerSlot.setAttribute("style","color:" + board.players[actualPlayerId].color);
		
		if (board.players[actualPlayerId].user)
		{
			const playerSlotText = document.createTextNode(board.players[actualPlayerId].user.username + " - $" + board.players[actualPlayerId].money + " " );
			playerSlot.appendChild(playerSlotText);
		}
		else
		{
			const playerSlotText = document.createTextNode("AI " + actualPlayerId + " - $" + board.players[actualPlayerId].money + " " );
			playerSlot.appendChild(playerSlotText);			
		}
		
		if (actualPlayerId == 0)
		{
			const playerResignButton = document.createElement("button");
			playerResignButton.setAttribute("id","resignButton");
			playerResignButton.setAttribute("onclick","playerResign(event)");
			const playerResignButtonText = document.createTextNode("RESIGN");
			playerResignButton.appendChild(playerResignButtonText);
			playerSlot.appendChild(playerResignButton);
		}
		else
		{
			if (login.isAdmin)
			{
				const playerKickButton = document.createElement("button");
				playerKickButton.setAttribute("id","kickButton");
				playerKickButton.setAttribute("onclick","playerKick(event, " + actualPlayerId + ")");
				const playerKickButtonText = document.createTextNode("KICK");	
				playerKickButton.appendChild(playerKickButtonText);
				playerSlot.appendChild(playerKickButton);
			}
		}
		
		playerList.appendChild(playerSlot);
	}
}

// Create an instance of the gameboard, this is essentially where most of the game takes place and where most of the vital information is also kept
const gameBoard = new boardClass();

// Ready the board for testing
function readyBoard()
{
	initializeBoard(gameBoard);
	initializePlayers(gameBoard, 4);
	initializePlayerList(gameBoard);
}

// Tile information displayed on propertyInfo
function getTileInfo(tile)
{
	switch(tile.tileflags)
	{
		case TILE_FLAG_GO: return "Collect $200 if you pass and an extra $200 if you land on it."; break;
		case TILE_FLAG_COMMUNITY: return "Community card!"; break;
		case TILE_FLAG_CHANCE: return "Chance card!"; break;
		case TILE_FLAG_JAIL: return "If you're just visting, stay put. Otherwise, wait three turns, use a Get out of Jail free card or score a double to be freed."; break;
		case TILE_FLAG_FREEPARKING: return "Free parking! Stay put or get a your tax returns if you landed here with a double."; break;
		case TILE_FLAG_GOTOJAIL: return "You've said or done something politically offensive, get academically suspended."; break;
		case TILE_FLAG_TAX: return "Pay your taxes! $" + tile.price; break;
		case TILE_FLAG_UTILITY: return "Pay 50% of the tile price of every utility the owner has."; break;
		case TILE_FLAG_TTC: return "Pay $50 for every TTC the owner has."; break;
		default: return "Price: $" + tile.price + "<br /> Pay 25% of the buying price,<br />double its color group is owned by a single person,<br />double more if a building is on it."; break;
	}
	return "";
}

// This is a dummy event handler, as when children's handlers are called, so are their parent's
function dummyClick(e)
{
	e.preventDefault();
	
	// Setup
	const tile = e.target;
	let tileIterate = tile;
	
	while (tileIterate.getAttribute("onclick") != "parseInfo(event)")
	{
		tileIterate = tileIterate.parentElement;
	}
	
	const boardTile = document.getElementById("board");
	let tileInfo = null;
	let index = 1;

	// Find corresponding tile
	for (let i = 1; i < maxTiles + 1; i++)
	{
		if (boardTile.children[i] == tileIterate)
		{
			tileInfo = gameBoard.tiles[i - 1];
			index = i - 1;
			break;
		}
	}

	if (tileInfo)
	{
		// Get element and purge its inner contents
		const infoTile = document.getElementById("propertyInfo");
		clearTileInfo();
		
		// Let the board know which tile we're displaying for refreshing purposes
		gameBoard.infoedTile = index;
		
		// Set the header
		const infoTileHeader = document.createElement("div")
		if (tile.children[0])
		{
			infoTileHeader.className = "propertyInfoHeader"
			infoTileHeader.style.backgroundColor = window.getComputedStyle(tile.children[0], null).getPropertyValue("background-color");
		}
		else
		{
			infoTileHeader.className = "propertyInfoHeaderNoColor"
		}
		const infoTileHeaderText = document.createTextNode(gameBoard.tiles[index].fullname)
		infoTileHeader.appendChild(infoTileHeaderText)
		infoTile.appendChild(infoTileHeader)
		
		// Set the image
		if (gameBoard.tiles[index].image)
		{
			const infoTileImage = document.createElement("img")
			infoTileImage.className = "propertyInfoImage"
			if (gameBoard.tiles[index].image)
				infoTileImage.setAttribute("src", "./img/" + gameBoard.tiles[index].image)
			else
				infoTileImage.setAttribute("src", "./img/placeholder.png")
			infoTile.appendChild(infoTileImage)
		}
		
		// Set the information
		const infoTileText = document.createElement("div")
		//infoTileText.style = "white-space: pre;" // To avoid white space culling and allowing the newline to work
		infoTileText.className = "propertyInfoText"
		infoTileText.innerHTML = getTileInfo(tileInfo);
		infoTile.appendChild(infoTileText);
		infoTile.style.backgroundColor = window.getComputedStyle(boardTile.children[index + 1], null).getPropertyValue("background-color");
	}
}

// Event handler, this purges the property information display and replaces it with up-to-date information from the last clicked tile
function parseInfo(e)
{
	// prevent default form action
	e.preventDefault();
	
	// Setup
	const tile = e.target;
	const boardTile = document.getElementById("board");
	let tileInfo = null;
	let index = 1;

	// Find corresponding tile
	for (let i = 1; i < maxTiles + 1; i++)
	{
		if (boardTile.children[i] == tile)
		{
			tileInfo = gameBoard.tiles[i - 1];
			index = i - 1;
			break;
		}
	}

	if (tileInfo)
	{
		// Get element and purge its inner contents
		const infoTile = document.getElementById("propertyInfo");
		clearTileInfo();
		
		// Let the board know which tile we're displaying for refreshing purposes
		gameBoard.infoedTile = index;
		
		// Set the header
		const infoTileHeader = document.createElement("div")
		if (tile.children[0])
		{
			infoTileHeader.className = "propertyInfoHeader"
			infoTileHeader.style.backgroundColor = window.getComputedStyle(tile.children[0], null).getPropertyValue("background-color");
		}
		else
		{
			infoTileHeader.className = "propertyInfoHeaderNoColor"
		}
		const infoTileHeaderText = document.createTextNode(gameBoard.tiles[index].fullname)
		infoTileHeader.appendChild(infoTileHeaderText)
		infoTile.appendChild(infoTileHeader)
		
		// Set the image
		if (gameBoard.tiles[index].image)
		{
			const infoTileImage = document.createElement("img")
			infoTileImage.className = "propertyInfoImage"
			if (gameBoard.tiles[index].image)
				infoTileImage.setAttribute("src", "./img/" + gameBoard.tiles[index].image)
			else
				infoTileImage.setAttribute("src", "./img/placeholder.png")
			infoTile.appendChild(infoTileImage)
		}
		
		// Set the information
		const infoTileText = document.createElement("div")
		//infoTileText.style = "white-space: pre;" // To avoid white space culling and allowing the newline to work
		infoTileText.className = "propertyInfoText"
		infoTileText.innerHTML = getTileInfo(tileInfo);
		infoTile.appendChild(infoTileText);
		infoTile.style.backgroundColor = window.getComputedStyle(boardTile.children[index + 1], null).getPropertyValue("background-color");
		
		if (tileInfo.building == true)
		{
			infoTile.style.backgroundImage = "url('./img/built.png')";
			infoTile.style.backgroundPosition = "bottom center";
			infoTile.style.backgroundSize = "25%";
			infoTile.style.backgroundRepeat = "no-repeat";
		}
	}
}

// Get the information of the tile the last player landed on
function landedTileInfo(playerNum)
{
	const position = gameBoard.players[playerNum].position;
	const player = gameBoard.players[playerNum];
	const boardTile = document.getElementById("board");
	let tileInfo = null;
	let index = 1;
	let tile = null;
	
	// Find corresponding tile
	for (let i = 1; i < maxTiles + 1; i++)
	{
		if (i - 1 == position)
		{
			tile = boardTile.children[i];
			tileInfo = gameBoard.tiles[i - 1];
			index = i - 1;
			break;
		}
	}
	
	if (tileInfo && tile)
	{
		// Get element and purge its inner contents
		const infoTile = document.getElementById("propertyInfoAlt");
		clearLandedTileInfo();
		
		// Set the header
		const infoTileHeader = document.createElement("div")
		if (tile.children[0])
		{
			infoTileHeader.className = "propertyInfoHeaderAlt"
			infoTileHeader.style.backgroundColor = window.getComputedStyle(tile.children[0], null).getPropertyValue("background-color");
		}
		else
		{
			infoTileHeader.className = "propertyInfoHeaderNoColorAlt"
		}
		const infoTileHeaderText = document.createTextNode(gameBoard.tiles[index].fullname)
		infoTileHeader.appendChild(infoTileHeaderText)
		infoTile.appendChild(infoTileHeader)
		
		// Set the image
		if (gameBoard.tiles[index].image)
		{
			const infoTileImage = document.createElement("img")
			infoTileImage.className = "propertyInfoImageAlt"
			if (gameBoard.tiles[index].image)
				infoTileImage.setAttribute("src", "./img/" + gameBoard.tiles[index].image)
			else
				infoTileImage.setAttribute("src", "./img/placeholder.png")
			infoTile.appendChild(infoTileImage)
		}
		
		// Set the information
		const infoTileText = document.createElement("div")
		//infoTileText.style = "white-space: pre;" // To avoid white space culling and allowing the newline to work
		infoTileText.className = "propertyInfoTextAlt"
		infoTileText.innerHTML = getTileInfo(tileInfo);
		infoTile.appendChild(infoTileText);
		
		// Add the buttons depending on conditions, you can only build or buy in this version of the game to make it fast
		if (gameBoard.tiles[index].purchaseable == true)
		{
			const infoTileButtonBox = document.createElement("div");
			infoTileButtonBox.setAttribute("id", "propertyInfoButtonBoxAlt");
			
			// Buy Button
			const infoTileBuyButton = document.createElement("button");
			
			if (checkCanBuy(playerNum, index) && gameBoard.gameState < GAMESTATE_AI_TURN)
			{
				infoTileBuyButton.setAttribute("id","propertyInfoButtonBuy");
				infoTileBuyButton.setAttribute("onclick", "buyTile(event)");
			}
			else
			{
				infoTileBuyButton.setAttribute("id","propertyInfoButtonBuyDisabled");
				infoTileBuyButton.setAttribute("disabled", "");
			}
			
			const infoTileBuyButtonText = document.createTextNode("BUY");
			infoTileBuyButton.appendChild(infoTileBuyButtonText);
			infoTileButtonBox.appendChild(infoTileBuyButton);
			
			const infoTileBuildButton = document.createElement("button");
			
			if (checkCanBuild(playerNum, index) && gameBoard.gameState < GAMESTATE_AI_TURN)
			{
				infoTileBuildButton.setAttribute("id","propertyInfoButtonBuild");
				infoTileBuildButton.setAttribute("onclick", "buildTile(event)");
			}
			else
			{
				infoTileBuildButton.setAttribute("id","propertyInfoButtonBuildDisabled");
				infoTileBuildButton.setAttribute("disabled", "");
			}
			
			const infoTileBuildButtonText = document.createTextNode("BUILD");
			infoTileBuildButton.appendChild(infoTileBuildButtonText);
			infoTileButtonBox.appendChild(infoTileBuildButton);
			infoTile.appendChild(infoTileButtonBox);
			
			infoTile.style.backgroundColor = window.getComputedStyle(tile, null).getPropertyValue("background-color");
			
			if (tileInfo.building == true)
			{
				infoTile.style.backgroundImage = "url('./img/built.png')";
				infoTile.style.backgroundPosition = "bottom center";
				infoTile.style.backgroundSize = "25%";
				infoTile.style.backgroundRepeat = "no-repeat";
			}
		}
	}
}

// Refresh tile info in case the purchase button is pressed, you never know
function refreshTileInfo(tileNum)
{
	if (gameBoard.infoedTile == null)
	{
		clearTileInfo();
		return;
	}
	
	if (tileNum != gameBoard.infoedTile)
		return;
	
	// Setup	
	const boardTile = document.getElementById("board");
	let tileInfo = null;
	let tile = null;

	// Find corresponding tile
	for (let i = 1; i < maxTiles + 1; i++)
	{
		if (i - 1 == tileNum)
		{
			tileInfo = gameBoard.tiles[tileNum];
			tile = boardTile.children[i];
			break;
		}
	}

	if (tileInfo && tile)
	{
		// Get element and purge its inner contents
		const infoTile = document.getElementById("propertyInfo");
		clearTileInfo();
		
		// Let the board know which tile we're displaying for refreshing purposes
		gameBoard.infoedTile = tileNum;
		
		// Set the header
		const infoTileHeader = document.createElement("div")
		if (tile.children[0])
		{
			infoTileHeader.className = "propertyInfoHeader"
			infoTileHeader.style.backgroundColor = window.getComputedStyle(tile.children[0], null).getPropertyValue("background-color");
		}
		else
		{
			infoTileHeader.className = "propertyInfoHeaderNoColor"
		}
		const infoTileHeaderText = document.createTextNode(gameBoard.tiles[tileNum].fullname)
		infoTileHeader.appendChild(infoTileHeaderText)
		infoTile.appendChild(infoTileHeader)
		
		// Set the image
		if (gameBoard.tiles[tileNum].image)
		{
			const infoTileImage = document.createElement("img")
			infoTileImage.className = "propertyInfoImage"
			if (gameBoard.tiles[tileNum].image)
				infoTileImage.setAttribute("src", "./img/" + gameBoard.tiles[tileNum].image)
			else
				infoTileImage.setAttribute("src", "./img/placeholder.png")
			infoTile.appendChild(infoTileImage)
		}
		
		// Set the information
		const infoTileText = document.createElement("div")
		//infoTileText.style = "white-space: pre;" // To avoid white space culling and allowing the newline to work
		infoTileText.className = "propertyInfoText"
		infoTileText.innerHTML = getTileInfo(tileInfo);
		infoTile.appendChild(infoTileText);
		infoTile.style.backgroundColor = window.getComputedStyle(boardTile.children[tileNum + 1], null).getPropertyValue("background-color");
		
		if (tileInfo.building == true)
		{
			infoTile.style.backgroundImage = "url('./img/built.png')";
			infoTile.style.backgroundPosition = "bottom center";
			infoTile.style.backgroundSize = "25%";
			infoTile.style.backgroundRepeat = "no-repeat";
		}
	}
}

// Clear onclick tile-info
function clearTileInfo()
{
	// Get element and purge its inner contents
	const infoTile = document.getElementById("propertyInfo");
	infoTile.innerHTML = "";
	infoTile.style.backgroundColor = "";
	infoTile.style.backgroundImage = "";
	gameBoard.infoedTile = null;
}
 
// Clear landed tile info
function clearLandedTileInfo()
{
	// Get element and purge its inner contents
	const infoTile = document.getElementById("propertyInfoAlt");
	infoTile.innerHTML = "";
	infoTile.style.backgroundColor = "";
	infoTile.style.backgroundImage = "";
}

// Event handler for human player
function playerRollTheDice(e)
{
	// Prevent Default
	e.preventDefault();
	
	// If it's not the player's turn do not roll the dice
	if (gameBoard.gameState != GAMESTATE_PLAYER_TURN)
		return;
	
	// Immediately roll the dice for the player
	gameBoard.gameState = GAMESTATE_PLAYER_ROLL;
	startDiceRoll();
	lowlightDice();
	setTimeout(rollTheDice, 2000);
	
}

// AI function for rolling the dice
function aiRollTheDice()
{
	// If it's not the player's turn do not roll the dice
	if (gameBoard.gameState != GAMESTATE_AI_TURN)
		return;
	
	// Roll the dice
	gameBoard.gameState = GAMESTATE_AI_ROLL;
	startDiceRoll();
	setTimeout(rollTheDice, 2000);
}

// Rolling the dice
function rollTheDice()
{
	const currentPlayer = gameBoard.players[gameBoard.playerTurns[gameBoard.playerTurn]];
		
	// Dice rolling away
	gameBoard.dice[0] = 1 + Math.floor(Math.random() * Math.floor(6));
	gameBoard.dice[1] =  1 + Math.floor(Math.random() * Math.floor(6));
	stopDiceRoll(gameBoard.dice[0], gameBoard.dice[1]);
	
	console.log('Player ' + gameBoard.playerTurns[gameBoard.playerTurn] + ' has rolled ' + gameBoard.dice[0] + ' ' + gameBoard.dice[1]);
	
	// Delay player movement
	setTimeout(playerMove, 1000);
}

// Moving the player
function playerMove()
{
	const player = gameBoard.players[gameBoard.playerTurns[gameBoard.playerTurn]];
	
	if (player.jailed == true)
	{
		if (gameBoard.dice[0] == gameBoard.dice[1])
			playerReleaseFromJail(gameBoard.playerTurns[gameBoard.playerTurn]);
		
		setTimeout(nextTurn, 2000);
			return;
	}

	// Default behavior
	player.previousposition = player.position;
	if (player.position + gameBoard.dice[0] + gameBoard.dice[1] > maxTiles - 1)
	{
		if (!playerCheckJailed(gameBoard.playerTurn))
		{
			player.passedgo = true;
			player.pastfirst = true;
		}
		
		player.position = player.position + gameBoard.dice[0] + gameBoard.dice[1] - 40;
	}
	else
	{
		player.position = player.position + gameBoard.dice[0] + gameBoard.dice[1];
	}
	
	console.log('Player ' + gameBoard.playerTurns[gameBoard.playerTurn] + ' is now at position ' + player.position);
	
	// Move physical piece for that player
	offsetPiece(gameBoard.playerTurns[gameBoard.playerTurn], player.position);
	
	// Apply effects
	setTimeout(playerEffects, 2000);
}

// Apply tile and movement effects to the player
function playerEffects()
{
	const player = gameBoard.players[gameBoard.playerTurns[gameBoard.playerTurn]];
	
	if (player.user != null)
	{
		gameBoard.gameState = GAMESTATE_PLAYER_INFO;
	}
	else
	{
		gameBoard.gameState = GAMESTATE_AI_INFO;
	}
	
	tileLand(gameBoard.playerTurns[gameBoard.playerTurn], gameBoard.players[gameBoard.playerTurns[gameBoard.playerTurn]].position);
	landedTileInfo(gameBoard.playerTurns[gameBoard.playerTurn]);
	
	setTimeout(playerDecisionTime, 2000);
}

// Give the player some time to make decisions about his purchases
function playerDecisionTime()
{
	const player = gameBoard.players[gameBoard.playerTurns[gameBoard.playerTurn]];
	
	if (player.user)
	{
		gameBoard.gameState = GAMESTATE_PLAYER_DECISION;
	}
	else
	{
		gameBoard.gameState = GAMESTATE_AI_DECISION;
	}
	
	setTimeout(nextTurn, 2000); // Should be 10000 for ten seconds
}

// Giving the dice to the next player
function nextTurn()
{	
	// Clear the information once turn is done
	clearLandedTileInfo();
	
	// Player keeps his turn if he lands double, so check before incrementing.
	if (gameBoard.dice[0] != gameBoard.dice[1])
	{
		// Start off by turning the original player name back to black
		playerListColor(gameBoard.playerTurn, playerColors[gameBoard.playerTurns[gameBoard.playerTurn]]);
		
		if (gameBoard.playerTurn + 1 >= gameBoard.players.length)
			gameBoard.playerTurn = 0;
		else
			gameBoard.playerTurn += 1;
		
		// Turn the next player's name to red
		playerListColor(gameBoard.playerTurn, "red");
	}
	
	// Check whose turn it is
	if (gameBoard.players[gameBoard.playerTurns[gameBoard.playerTurn]].user == null)
	{
		gameBoard.gameState = GAMESTATE_AI_TURN;
		setTimeout(aiRollTheDice, 2000);
	}
	else
	{
		gameBoard.gameState = GAMESTATE_PLAYER_TURN
		highlightDice();
	}
	console.log('Player ' + gameBoard.playerTurns[gameBoard.playerTurn] + "'s turn ");
	
	// Jailing mechanic
	if (gameBoard.players[gameBoard.playerTurns[gameBoard.playerTurn]].jailed)
	{
		if (gameBoard.players[gameBoard.playerTurns[gameBoard.playerTurn]].jailturns > 0)
			--gameBoard.players[gameBoard.playerTurns[gameBoard.playerTurn]].jailturns;
		
		if (gameBoard.players[gameBoard.playerTurns[gameBoard.playerTurn]].jailturns <= 0)
			playerReleaseFromJail(gameBoard.playerTurns[gameBoard.playerTurn]);
	}
	
}

// What happens if you land on a certain tile
function tileLand(playerNum, tileNum)
{
	const playerPtr = gameBoard.players[playerNum];
	
	// Check to make sure player has passed go
	if (playerPtr.passedgo == true)
	{
		if (playerPtr.gorestrict == true)
		{
			gorestrict = false;
		}
		else
		{
			flowFunds(playerNum, 200, true);
			gameBoard.players[playerNum].passedgo = false;
		}
	}
	
	const tile = gameBoard.tiles[tileNum];
	const tileFlags = gameBoard.tiles[tileNum].tileflags;
	
	if (tileFlags == TILE_FLAG_NORMAL || tileFlags == TILE_FLAG_UTILITY || tileFlags == TILE_FLAG_TTC)
	{
		if (tile.owner != playerPtr && tile.owner != null)
		{
			console.log("Landed at " + gameBoard.tiles[tileNum].fullname + ".");
			
			if (tileFlags == TILE_FLAG_UTILITY)
			{
				const loot = numOwnedUtility(tile.owner) * (tile.price / 2);
				
				flowFunds(playerNum, loot, false);
				flowFunds(tile.owner, loot, true);
			}
			else if (tileFlags == TILE_FLAG_TTC)
			{
				const loot = numOwnedTTC(tile.owner) * (tile.price / 4);
				
				flowFunds(playerNum, loot, false);
				flowFunds(tile.owner, loot, true);				
			}
			else
			{
				let loot = tile.price / 4;
				
				if (ownsCorrespondingColorTiles(tile.owner, tileNum))
					loot *= 2;
				
				if (tile.building == true)
					loot *= 2;

				flowFunds(playerNum, loot, false);
				flowFunds(tile.owner, loot, true);
			}
		}
		
	}
	else if (tileFlags == TILE_FLAG_TAX)
	{
		flowFunds(playerNum, gameBoard.tiles[tileNum].price, false);
		gameBoard.tiles[20].price += gameBoard.tiles[tileNum].price;
		console.log("Paying tax of " + gameBoard.tiles[tileNum].price + ".");
	}
	else if (tileFlags == TILE_FLAG_COMMUNITY)
	{
		drawCommunityCard(playerNum);
		console.log("Drawing community card!");
	}
	else if (tileFlags == TILE_FLAG_CHANCE)
	{
		drawChanceCard(playerNum);
		console.log("Drawing chance card!");
	}
	else if (tileFlags == TILE_FLAG_GOTOJAIL)
	{
		playerSendToJail(playerNum);
		console.log("Go to jail scumbag!");
	}
	else if (tileFlags == TILE_FLAG_FREEPARKING)
	{
		if (gameBoard.dice[0] == gameBoard.dice[1])
		{
			flowFunds(playerNum, gameBoard.tiles[tileNum].price, true);
			console.log("Nice! You get your tax returns!");
		}
		else
		{
			console.log("Free parking!");
		}
	}
	else if (tileFlags == TILE_FLAG_GO)
	{
		flowFunds(playerNum, 200, true);
		console.log("Get double salary!");
	}
}

// What happens if the player runs out of funds
function checkFunds(playerNum)
{
	if (gameBoard.players[playerNum].money >= 0)
		return;
	
	return true;
}

// Does the player have a sufficient amount of funds to perform a certain action
function hasSufficentFunds(playerNum, fundsAmount)
{
	if (gameBoard.players[playerNum].money < fundsAmount)
		return false;
	
	return true;
}

// Check if the player can purchase a certain property
function checkCanBuy(playerNum, tileNum)
{
	if (gameBoard.players[playerNum].pastfirst == false)
		return false;
	
	if (gameBoard.tiles[tileNum].purchasable == false)
		return false;
	
	if (gameBoard.tiles[tileNum].owner != null)
		return false;
	
	if (!hasSufficentFunds(playerNum,gameBoard.tiles[tileNum].price))
		return false;
	
	return true;
}

// Check if the player can build on a certain property
function checkCanBuild(playerNum, tileNum)
{
	const tile = gameBoard.tiles[tileNum];
	
	// If this already has a building, don't bother
	if (tile.building == true)
		return false;
	
	// All special tiles can't be built on anyways
	if (tile.tileflags != TILE_FLAG_NORMAL)
		return false;
	
	// If this doesn't have an owner or the player in question isn't the owner, you can't build here
	if (tile.owner != playerNum)
		return false;
	
	// You must own all tiles of the same color code to build
	if (!ownsCorrespondingColorTiles(playerNum, tileNum))
		return false;
	
	if (!hasSufficentFunds(playerNum,tile.price))
		return false;
	
	return true;
}

// Helper to the above function to see the player owns buildings of corresponding colors, use the const table at the top of the page
function ownsCorrespondingColorTiles(playerNum, tileNum)
{
	let result = false;
	
	for (let i = 0; i < tileColorGroups.length; i++)
	{
		if (tileColorGroups[i].includes(tileNum))
		{
			let answer = true;
			for (let j = 0; j < tileColorGroups[i].length; j++)
			{
				if (tileColorGroups[i][j].owner != playerNum);
				{
					answer = false
					break;
				}
			}
			
			if (answer == true)
				result = true;
			
			break;
		}
	}
	
	return result;
}

// Return the number of 
function numOwnedTTC(playerNum)
{
	let result = 0;
	
	for (let i = 0; i < ttcTiles.length; i++)
	{
		if (gameBoard.tiles[ttcTiles[i]].owner == playerNum)
			result++;
	}
	
	return result;
}

// Return the number of owned utility tiles
function numOwnedUtility(playerNum)
{
	let result = 0;
	
	for (let i = 0; i < utilityTiles.length; i++)
	{
		if (gameBoard.tiles[utilityTiles[i]].owner == playerNum)
			result++;
	}
	
	return result;	
}

// This changes a player's money, fundsDirection controls whether it's removed or added
function flowFunds(playerNum, fundsAmount, fundsDirection)
{
	if (fundsDirection)
		gameBoard.players[playerNum].money += fundsAmount;
	else
		gameBoard.players[playerNum].money -= fundsAmount;
	
	updateFundsDisplay(playerNum);
	checkFunds(playerNum);
}

function updateFundsDisplay(playerNum)
{
	let playerList = document.querySelector('#playerList');
		
	// Get the index on the player list
	let index = 0;
	for (let i = 0; i < gameBoard.playerTurns.length; i++)
	{
		if (gameBoard.playerTurns[i] == playerNum)
		{
			index = i;
			break;
		}
	}
	
	const actualPlayerId = gameBoard.playerTurns[index];
	const playerSlot = document.createElement("div");
	playerSlot.setAttribute("id","playerSlot");
	
	if (gameBoard.playerTurn == index)
		playerSlot.setAttribute("style","color:red");
	else
		playerSlot.setAttribute("style","color:" + playerColors[actualPlayerId]);
	
	if (gameBoard.players[actualPlayerId].user)
	{
		const playerSlotText = document.createTextNode(gameBoard.players[actualPlayerId].user.username + " - $" + gameBoard.players[actualPlayerId].money + " " );
		playerSlot.appendChild(playerSlotText);
	}
	else
	{
		const playerSlotText = document.createTextNode("AI " + actualPlayerId + " - $" + gameBoard.players[actualPlayerId].money + " " );
		playerSlot.appendChild(playerSlotText);			
	}
	
	if (actualPlayerId == 0)
	{
		const playerResignButton = document.createElement("button");
		playerResignButton.setAttribute("id","resignButton");
		playerResignButton.setAttribute("onclick","playerResign(event)");
		const playerResignButtonText = document.createTextNode("RESIGN");
		playerResignButton.appendChild(playerResignButtonText);
		playerSlot.appendChild(playerResignButton);
	}
	else
	{
		if (login.isAdmin)
		{
			const playerKickButton = document.createElement("button");
			playerKickButton.setAttribute("id","kickButton");
			playerKickButton.setAttribute("onclick","playerKick(event, " + actualPlayerId + ")");
			const playerKickButtonText = document.createTextNode("KICK");	
			playerKickButton.appendChild(playerKickButtonText);
			playerSlot.appendChild(playerKickButton);
		}
	}
	
	playerList.children[index + 1].replaceWith(playerSlot);
}

// Player draws a community card
function drawCommunityCard(playerNum)
{
	
}

// Players draws a chance card
function drawChanceCard(playerNum)
{
	
}

// Player is sent to jail
function playerSendToJail(playerNum)
{
	const player = gameBoard.players[playerNum];
	player.jailed = true;
	player.jailturns = JAIL_TURN_DEFAULT;
	
	// Movement is directly manipulated in this particular case
	player.oldposition = player.position;
	player.position = 10;
	offsetPiece(playerNum, player.position);
	
	setTimeout(nextTurn, 2000);
}

// Method to check if the player is jailed or not
function playerCheckJailed(playerNum)
{
	if (gameBoard.players[playerNum].jailed)
		return true;
	
	return false;
}

// Release the player from jail, done either through 
function playerReleaseFromJail(playerNum)
{
	const player = gameBoard.players[playerNum];
	player.jailed = false;
	player.jailturns = JAIL_TURN_NONE;
	setTimeout(nextTurn, 2000);
}

// Change color of player in player list. Used to indicate whose turn it is
function playerListColor(playerIndex, color)
{
	const playerList = document.getElementById("playerList");
	playerList.children[playerIndex + 1].setAttribute("style","color:" + color);
}

// Buy the tile
function buyTile(e)
{
	e.preventDefault();
	
	purchaseTile(gameBoard.playerTurns[gameBoard.playerTurn], gameBoard.players[gameBoard.playerTurns[gameBoard.playerTurn]].position);
}

// Ditto, shared by both player and AI
function purchaseTile(playerNum, tileNum)
{
	// Game logic change
	
	if (playerNum > -1)
	{
		gameBoard.tiles[tileNum].owner = playerNum;
		flowFunds(playerNum, gameBoard.tiles[tileNum].price, false);
	}
	else
	{
		gameBoard.tiles[tileNum].owner = null;
	}
	
	// Board display change
	const board = document.getElementById("board");
	let tile = null;

	// Find corresponding tile
	for (let i = 1; i < maxTiles + 1; i++)
	{
		if (i - 1 == tileNum)
		{
			tile = board.children[i];
			break;
		}
	}
	
	if (tile)
	{
		const divId = tile.getAttribute("id");
		const divElement = document.getElementById(divId);
		if (playerNum < 0)
		{
			divElement.style.backgroundColor = "#CEE6D0";
		}
		else
		{
			if (gameBoard.players[playerNum].color == "magenta")
				divElement.style.backgroundColor = "rgba(255,0,255,0.2)";
			else if (gameBoard.players[playerNum].color == "blue")
				divElement.style.backgroundColor  = "rgba(0,0,255,0.2)";
			else if (gameBoard.players[playerNum].color == "green")
				divElement.style.backgroundColor = "rgba(0,128,0,0.2)";
			else if (gameBoard.players[playerNum].color == "orange")
				divElement.style.backgroundColor = "rgba(255,165,0,0.2)";
		}
		
		// Refresh the landTileInfo
		landedTileInfo(playerNum);
		refreshTileInfo(tileNum);
	}
}

// Build on the tile
function buildTile(e)
{
	e.preventDefault();
	
	constructTile(gameBoard.playerTurns[gameBoard.playerTurn], gameBoard.players[gameBoard.playerTurns[gameBoard.playerTurn]].position);
	//console.log("Built on it");
}

// Ditto shared by both player and AI
function constructTile(playerNum, tileNum)
{
	// Game logic change
	gameBoard.tiles[tileNum].building = true;
	flowFunds(playerNum, gameBoard.tiles[tileNum].price, false);
	
	// Board display change
	const board = document.getElementById("board");
	let tile = null;

	// Find corresponding tile
	for (let i = 1; i < maxTiles + 1; i++)
	{
		if (i - 1 == tileNum)
		{
			tile = board.children[i];
			break;
		}
	}
	
	if (tile)
	{
		const divId = tile.getAttribute("id");
		const divElement = document.getElementById(divId);

		divElement.style.backgroundRepeat = "no-repeat";
		divElement.style.backgroundPosition = "center";
		
		if (divId.includes("bottomRow") || divId.includes("topRow"))
		{
			divElement.style.backgroundImage = "url('./img/built.png')";
			divElement.style.backgroundSize = "40%";
		}
		else if (divId.includes("leftCol"))
		{
			divElement.style.backgroundImage = "url('./img/built-left.png')";
			divElement.style.backgroundSize = "25%";
		}
		else if (divId.includes("rightCol"))
		{
			divElement.style.backgroundImage = "url('./img/built-right.png')";
			divElement.style.backgroundSize = "25%";
		}
		
	}
	
	// Refresh the landTileInfo
	landedTileInfo(playerNum);
	refreshTileInfo(tileNum);
}

// Kick an AI player
function playerKick(e, id)
{
	// Prevent default
	e.preventDefault();
	
	if (gameBoard.gameState != GAMESTATE_PLAYER_TURN)
		return;
	
	console.log("Kick " + id + ".");
}

// Client resign
function playerResign(e)
{
	// Prevent default
	e.preventDefault();
	
	//if (gameBoard.gameState != GAMESTATE_PLAYER_TURN)
	//	return;
		
	window.location.replace('./newgame.html');
}

//==========================================================================
// Dice rolling animations functions
//==========================================================================

// Start rolling the dice
function startDiceRoll()
{
	// Immediately start and set dice rolling flag to true
	diceRolling = true;
	loopDiceRoll();
}

// Loop through and keep setting it away
function loopDiceRoll()
{
	// Only do this if the dice is rolling
	if (diceRolling)
	{
		const diceSection = document.getElementById("diceDisplay");
		const dice1 = diceSection.children[0];
		const dice2 = diceSection.children[1];
		
		dice1.setAttribute("src", "img/dice" + (1 + Math.floor(Math.random() * Math.floor(6))) + ".png" );
		dice2.setAttribute("src", "img/dice" + (1 + Math.floor(Math.random() * Math.floor(6))) + ".png" );
		
		// Do this every 10th of a second
		setTimeout(loopDiceRoll, 100);
	}
}

// Stop it, freeze with the die set to what the current player rolled
function stopDiceRoll(dice1val, dice2val)
{
	diceRolling = false;
	const diceSection = document.getElementById("diceDisplay");
	const dice1 = diceSection.children[0];
	const dice2 = diceSection.children[1];
	
	dice1.setAttribute("src", "img/dice" + dice1val + ".png" );
	dice2.setAttribute("src", "img/dice" + dice2val + ".png" );
}

//==========================================================================
// Border glowing shift for the Dice when it's the player's turn
//==========================================================================

// When it's the player's turn
function highlightDice()
{
	const diceSection = document.getElementById("diceDisplay");
	diceSection.style.border = "2px solid red";
}

// When it's no longer the player's turn
function lowlightDice()
{
	const diceSection = document.getElementById("diceDisplay");
	diceSection.style.border = "2px solid black";
}


//==========================================================================
// Additional Helper functions
//==========================================================================

// From https://plainjs.com/javascript/styles/get-the-position-of-an-element-relative-to-the-document-24/
// Returns the offset of input element
function offset(el) {
    var rect = el.getBoundingClientRect(),
    scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
}

// Get offset for each of the player pieces
function offsetPiece(playerNum, tile)
{
	const physicalBoard = document.getElementById("board");
	const tilePlate = physicalBoard.children[tile + 1];
	const tilePlateOffset = offset(tilePlate);
	const boardOffset = offset(physicalBoard);
    tilePlateOffset.top -= boardOffset.top;
    tilePlateOffset.left -= boardOffset.left;

	let leftOffset = 0;
	let topOffset = 0;
	
	switch(playerNum)
	{
		case 1: leftOffset = 40; topOffset = 0; break;
		case 2: leftOffset = 0; topOffset = 40; break;
		case 3: leftOffset = 40; topOffset = 40; break;
		default: leftOffset = 0; topOffset = 0; break;
	}
		
	const playerPiece = document.getElementById("player" + playerNum);
	playerPiece.style.left = (tilePlateOffset.left + (tilePlate.style.width / 2) + leftOffset ) + "px";
	playerPiece.style.top = (tilePlateOffset.top + (tilePlate.style.height / 2) + topOffset ) + "px";
}
