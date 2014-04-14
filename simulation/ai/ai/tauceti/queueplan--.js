var TAUCETI = function(ai)
{
/* 
 * Common functions and variables to all queue plans.
 * has a "--" suffix because it needs to be loaded before the other queueplan files.
 */

ai.QueuePlan = function(gameState, type, metadata) {
	this.type = gameState.applyCiv(type);
	this.metadata = metadata;

	this.template = gameState.getTemplate(this.type);
	if (!this.template)
	{
		warn ("Tried to add the inexisting tempalte " + this.type + " to TauCeti. Please report thison the forums")
		return false;
	}
	this.ID = ai.playerGlobals[PlayerID].uniqueIDBOPlans++;
	this.cost = new API3.Resources(this.template.cost());
	this.number = 1;

	this.category = "";
	this.lastIsGo = undefined;

	return true;
};

// if true, the queue manager will begin increasing this plan's account.
ai.QueuePlan.prototype.isGo = function(gameState) {
	return true;
};

// can we start this plan immediately?
ai.QueuePlan.prototype.canStart = function(gameState) {
	return false;
};

// needs to be updated if you want this to do something
ai.QueuePlan.prototype.onStart = function(gameState) {
}

// process the plan.
ai.QueuePlan.prototype.start = function(gameState) {
	// should call onStart.
};

ai.QueuePlan.prototype.getCost = function() {
	var costs = new API3.Resources();
	costs.add(this.cost);
	if (this.number !== 1)
			costs.multiply(this.number);
	return costs;
};

// On Event functions.
// Can be used to do some specific stuffs
// Need to be updated to actually do something if you want them to.
// this is called by "Start" if it succeeds.
ai.QueuePlan.prototype.onStart = function(gameState) {
}

// This is called by "isGo()" if it becomes true while it was false.
ai.QueuePlan.prototype.onGo = function(gameState) {
}

// This is called by "isGo()" if it becomes false while it was true.
ai.QueuePlan.prototype.onNotGo = function(gameState) {
}

return ai;
}(TAUCETI);
