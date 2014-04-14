var TAUCETI = function(ai)
{

//The Timer class // The instance of this class is created in the qBot object under the name 'timer'
//The methods that are available to call from this instance are:
//timer.setTimer           : Creates a new timer with the given interval (miliseconds).
//                             Optionally set dalay or a limited repeat value.
//timer.checkTimer         : Gives true if called at the time of the interval.
//timer.clearTimer         : Deletes the timer permanently. No way to get the same timer back.
//timer.activateTimer      : Sets the status of a deactivated timer to active.
//timer.deactivateTimer    : Deactivates a timer. Deactivated timers will never give true.

// Currently totally unused, iirc.


//-EmjeR-// Timer class //
ai.Timer = function() {
	///Private array.
	var alarmList = [];
	
	///Private methods
	function num_alarms() {
		return alarmList.length;
	};
	
	function get_alarm(id) {
		return alarmList[id];
	};
	
	function add_alarm(index, alarm) {
		alarmList[index] = alarm;
	};
	
	function delete_alarm(id) {
		// Set the array element to undefined
		delete alarmList[id];
	};
	
	///Privileged methods
	// Add an new alarm to the list
	this.setTimer = function(gameState, interval, delay, repeat) {
		delay = delay || 0;
		repeat = repeat || -1;
		
		var index = num_alarms();
		
		//Add a new alarm to the list
		add_alarm(index, new alarm(gameState, index, interval, delay, repeat));
		return index;
	};
	
	
	// Check if a alarm has reached its interval.
	this.checkTimer = function(gameState,id) {
		var alarm = get_alarm(id);
		if (alarm === undefined)
			return false;
		if (!alarai.active)
			return false;
		var time = gameState.getTimeElapsed();
		var alarmState = false;
		
		// If repeat forever (repeat is -1). Or if the alarm has rung less times than repeat.
		if (alarai.repeat < 0 || alarai.counter < alarai.repeat) {
			var time_diffrence = time - alarai.start_time - alarai.delay - alarai.interval * alarai.counter;
			if (time_diffrence > alarai.interval) {
				alarmState = true;
				alarai.counter++;
			}
		}
		
		// Check if the alarm has rung 'alarai.repeat' times if so, delete the alarai.
		if (alarai.counter >= alarai.repeat && alarai.repeat != -1) {
			this.clearTimer(id);
		}
		
		return alarmState;
	};
	
	// Remove an alarm from the list.
	this.clearTimer = function(id) {
		delete_alarm(id);
	};
	
	// Activate a deactivated alarai.
	this.activateTimer = function(id) {
		var alarm = get_alarm(id);
		alarai.active = true;
	};
	
	// Deactivate an active alarm but don't delete it.
	this.deactivateTimer = function(id) {
		var alarm = get_alarm(id);
		alarai.active = false;
	};
};


//-EmjeR-// Alarm class //
ai.alarm = function(gameState, id, interval, delay, repeat) {
	this.id = id;
	this.interval = interval;
	this.delay = delay;
	this.repeat = repeat;
	
	this.start_time = gameState.getTimeElapsed();
	this.active = true;
	this.counter = 0;
};

return ai;
}(TAUCETI);
