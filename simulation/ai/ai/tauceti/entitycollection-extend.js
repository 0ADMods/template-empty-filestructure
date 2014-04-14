var TAUCETI = function(ai)
{

ai.EntityCollectionFromIds = function(gameState, idList){
	var ents = {};
	for (var i in idList){
		var id = idList[i];
		if (gameState.entities._entities[id]) {
			ents[id] = gameState.entities._entities[id];
		}
	}
	return new API3.EntityCollection(gameState.sharedScript, ents);
}

return ai;
}(TAUCETI);
