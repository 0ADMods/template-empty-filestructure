var TAUCETI = function(ai)
{

// Some functions that could be part of the gamestate but are TauCeti specific.

// The next three are to register that we assigned a gatherer to a resource this turn.
// expects an entity
ai.IsSupplyFull = function(gamestate, supply)
{
	if (supply.isFull(PlayerID) === true)
		return true;
	var count = supply.resourceSupplyGatherers(PlayerID).length;
	if (gamestate.turnCache["ressourceGatherer"] && gamestate.turnCache["ressourceGatherer"][supply.id()])
		count += gamestate.turnCache["ressourceGatherer"][supply.id()];
	if (count >= supply.maxGatherers())
		return true;
	return false;
}

// add a gatherer to the turn cache for this supply.
ai.AddTCGatherer = function(gamestate, supplyID)
{
	if (gamestate.turnCache["ressourceGatherer"] && gamestate.turnCache["ressourceGatherer"][supplyID])
		++gamestate.turnCache["ressourceGatherer"][supplyID];
	else if (gamestate.turnCache["ressourceGatherer"])
		gamestate.turnCache["ressourceGatherer"][supplyID] = 1;
	else
		gamestate.turnCache["ressourceGatherer"] = { "supplyID" : 1 };
}

ai.GetTCGatherer = function(gamestate, supplyID)
{
	if (gamestate.turnCache["ressourceGatherer"] && gamestate.turnCache["ressourceGatherer"][supplyID])
		return gamestate.turnCache["ressourceGatherer"][supplyID];
	else
		return 0;
}

// The next two are to register that we assigned a gatherer to a resource this turn.
ai.AddTCRessGatherer = function(gamestate, resource)
{
	if (gamestate.turnCache["ressourceGatherer-" + resource])
		++gamestate.turnCache["ressourceGatherer-" + resource];
	else
		gamestate.turnCache["ressourceGatherer-" + resource] = 1;
}

ai.GetTCRessGatherer = function(gamestate, resource)
{
	if (gamestate.turnCache["ressourceGatherer-" + resource])
		return gamestate.turnCache["ressourceGatherer-" + resource];
	else
		return 0;
}

return ai;
}(TAUCETI);
