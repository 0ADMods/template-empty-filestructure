var TAUCETI = function(ai)
{

ai.ResearchPlan = function(gameState, type, rush) {
	if (!ai.QueuePlan.call(this, gameState, type, {}))
		return false;

	if (this.template.researchTime === undefined)
		return false;

	this.category = "technology";

	this.rush = rush ? true : false;
	
	return true;
};

ai.ResearchPlan.prototype = Object.create(ai.QueuePlan.prototype);

ai.ResearchPlan.prototype.canStart = function(gameState) {
	// also checks canResearch
	return (gameState.findResearchers(this.type).length !== 0);
};

ai.ResearchPlan.prototype.start = function(gameState) {
	var self = this;
	
	//ai.debug ("Starting the research plan for " + this.type);
	var trainers = gameState.findResearchers(this.type).toEntityArray();

	//for (var i in trainers)
	//	warn (this.type + " - " +trainers[i].genericName());
	
	// Prefer training buildings with short queues
	// (TODO: this should also account for units added to the queue by
	// plans that have already been executed this turn)
	if (trainers.length > 0){
		trainers.sort(function(a, b) {
			return (a.trainingQueueTime() - b.trainingQueueTime());
		});
		// drop anything in the queue if we rush it.
		if (this.rush)
			trainers[0].stopAllProduction(0.45);
		trainers[0].research(this.type);
	}
	this.onStart(gameState);
};

return ai;
}(TAUCETI);
