var TAUCETI = function(ai)
{

ai.TrainingPlan = function(gameState, type, metadata, number, maxMerge) {
	if (!ai.QueuePlan.call(this, gameState, type, metadata))
		return false;

	this.category = "unit";
	this.cost = new API3.Resources(this.template.cost(), this.template._template.Cost.Population);
	
	this.number = number !== undefined ? number : 1;
	this.maxMerge = maxMerge !== undefined ? maxMerge : 5;

	return true;
};

ai.TrainingPlan.prototype = Object.create(ai.QueuePlan.prototype);

ai.TrainingPlan.prototype.canStart = function(gameState) {
	if (this.invalidTemplate)
		return false;

	// TODO: we should probably check pop caps

	var trainers = gameState.findTrainers(this.type);

	return (trainers.length != 0);
};

ai.TrainingPlan.prototype.start = function(gameState) {
	//warn("Executing TrainingPlan " + uneval(this));
	var self = this;
	var trainers = gameState.findTrainers(this.type).toEntityArray();

	// Prefer training buildings with short queues
	// (TODO: this should also account for units added to the queue by
	// plans that have already been executed this turn)
	if (trainers.length > 0){
		trainers.sort(function(a, b) {
			var aa = a.trainingQueueTime();
			var bb = b.trainingQueueTime();
			if (a.hasClass("Civic") && !self.template.hasClass("Support"))
				aa += 0.9;
			if (b.hasClass("Civic") && !self.template.hasClass("Support"))
				bb += 0.9;
			return (aa - bb);
		});
		if (this.metadata && this.metadata.base !== undefined && this.metadata.base === 0)
			this.metadata.base = trainers[0].getMetadata(PlayerID,"base");
		trainers[0].train(this.type, this.number, this.metadata);
	}
	this.onStart(gameState);
};

ai.TrainingPlan.prototype.addItem = function(amount) {
	if (amount === undefined)
		amount = 1;
	this.number += amount;
};

return ai;
}(TAUCETI);
