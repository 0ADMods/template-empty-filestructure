var TAUCETI = function(ai)
{

// Specialization of Armies used by the defense manager.
ai.DefenseArmy = function(gameState, defManager, ownEntities, foeEntities)
{
	if (!ai.Army.call(this, gameState, defManager, ownEntities, foeEntities))
		return false;

	this.watchTSMultiplicator = this.Config.Defence.armyStrengthWariness;
	this.watchDecrement = this.Config.Defence.prudence;

	this.foeSubStrength = {
		"spear" : ["Infantry", "Spear"],	//also pikemen
		"sword" : ["Infantry", "Sword"],
		"ranged" : ["Infantry", "Ranged"],
		"meleeCav" : ["Cavalry", "Melee"],
		"rangedCav" : ["Cavalry", "Ranged"],
		"Elephant" : ["Elephant"],
		"meleeSiege" : ["Siege", "Melee"],
		"rangedSiege" : ["Siege", "Ranged"]
	};
	this.ownSubStrength = {
		"spear" : ["Infantry", "Spear"],	//also pikemen
		"sword" : ["Infantry", "Sword"],
		"ranged" : ["Infantry", "Ranged"],
		"meleeCav" : ["Cavalry", "Melee"],
		"rangedCav" : ["Cavalry", "Ranged"],
		"Elephant" : ["Elephant"],
		"meleeSiege" : ["Siege", "Melee"],
		"rangedSiege" : ["Siege", "Ranged"]
	};

	this.checkDangerosity(gameState);	// might push us to 1.
	this.watchLevel = this.foeStrength * this.watchTSMultiplicator;
	
	return true;
}

ai.DefenseArmy.prototype = Object.create(ai.Army.prototype);

ai.DefenseArmy.prototype.assignUnit = function (gameState, entID)
{
	// we'll assume this defender is ours already.
	// we'll also override any previous assignment
	
	var ent = gameState.getEntityById(entID);
	if (!ent)
		return false;
	
	// TODO: improve the logic in there.
	var maxVal = 1000000;
	var maxEnt = -1;
		
	for each (var id in this.foeEntities)
	{
		var eEnt = gameState.getEntityById(id);
		if (!eEnt)	// probably can't happen.
			continue;

		if (maxVal > this.assignedAgainst[id].length)
		{
			maxVal = this.assignedAgainst[id].length;
			maxEnt = id;
		}
	}
	if (maxEnt === -1)
		return false;
	
	// let's attack id
	this.assignedAgainst[maxEnt].push(entID);
	this.assignedTo[entID] = maxEnt;
	
	ent.attack(maxEnt);
	
	return true;
}

// TODO: this should return cleverer results ("needs anti-elephant"…)
ai.DefenseArmy.prototype.needsDefenders = function (gameState, events)
{
	// some preliminary checks because we don't update for tech
	if (this.foeStrength < 0 || this.ownStrength < 0)
		this.recalculateStrengths(gameState);
	
	if (this.foeStrength * this.defenceRatio < this.ownStrength)
		return false;
	return this.foeStrength * this.defenceRatio - this.ownStrength;
}

ai.DefenseArmy.prototype.getState = function (gameState)
{
	if (this.foeEntities.length === 0)
		return 0;
	if (this.state === 2)
		return 2;
	if (this.watchLevel > 0)
		return 1;
	return 0;
}

// check if we should remain at state 2 or drift away
ai.DefenseArmy.prototype.checkDangerosity = function (gameState)
{
	this.territoryMap = ai.createTerritoryMap(gameState);
	// right now we'll check if our position is "enemy" or not.
	if (this.territoryMap.getOwner(this.ownPosition) !== PlayerID)
		this.state = 1;
	else if (this.state === 1)
		this.state = 2;
}

ai.DefenseArmy.prototype.update = function (gameState)
{
	var breakaways = this.onUpdate(gameState);

	this.checkDangerosity(gameState);
	
	var normalWatch = this.foeStrength * this.watchTSMultiplicator;
	if (this.state === 2)
		this.watchLevel = normalWatch;
	else if (this.watchLevel > normalWatch)
		this.watchLevel = normalWatch;
	else
		this.watchLevel -= this.watchDecrement;
	
	// TODO: deal with watchLevel?
	
	return breakaways;
}

ai.DefenseArmy.prototype.debug = function (gameState)
{
	ai.debug(" ");
	ai.debug ("Army " + this.ID)
//	ai.debug ("state " + this.state);
//	ai.debug ("WatchLevel " + this.watchLevel);
//	ai.debug ("Entities " + this.foeEntities.length);
//	ai.debug ("Strength " + this.foeStrength);
	//	debug (gameState.getEntityById(ent)._templateName + ", ID " + ent);
	//debug ("Defenders " + this.ownEntities.length);
	for each (ent in this.foeEntities)
	{
		if (gameState.getEntityById(ent) !== undefined)
		{
			ai.debug (gameState.getEntityById(ent)._templateName + ", ID " + ent);
		Engine.PostCommand(PlayerID,{"type": "set-shading-color", "entities": [ent], "rgb": [0.5,0,0]});
		} else
			ai.debug("ent "  + ent);
	}
	//debug ("Strength " + this.ownStrength);
	ai.debug ("");
	
}
return ai;
}(TAUCETI);
