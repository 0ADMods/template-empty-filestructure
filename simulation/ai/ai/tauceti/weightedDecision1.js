var TAUCETI = function(ai/*scope*/){/*Wrapped in the object m of type/class Object. This is to scope all classes within an API or AI if there'd be another API or AI with the same classes. So to avoid a conflict if another API had BaseAI class too. 

[u]I thought a bit about the algorithm for decision weighting:[/u]


First I thought of something like the following, but this is misleading:
decisions[CURRENT_ROOT_DECISION_RESULT][INDEX_FOR_STATE] = new State();
decisions[CURRENT_ROOT_DECISION_RESULT][DECISION_TAKEN_THIS_TIME] = new Array();
decisions[CURRENT_ROOT_DECISION_RESULT][DECISION_TAKEN_ONE_BEFORE][INDEX_FOR_STATE] = new State();
decisions[CURRENT_ROOT_DECISION_RESULT][DECISION_TAKEN_ONE_BEFORE][DECISION_TAKEN_THIS_TIME] = new Array();
..



Then I came up with linked Decision objects that build a tree starting with the first decision taken as the root: (The good thing about it is that this way we have access to the previous decision that was taken in an equal situation. From this decision object we then can access the previous decision of the same kind for this found previous object of the same kind. This means we can use a differential weighting too for finding not only the best path in absolut numbers, but also we can see if the one or other decision we can choose from was actually very successful the last time despite the overall bad total value. This means if we find a very good decision path that works out nicely, the AI temporarily 'forgets' how bad this branch/approach to give it a chance because it performed so much better than any other branch in the previous attempt. Remember: There are many possibilities where the bad things might have happened before - we only know at this point that all possible decisions below this current decision object in the tree seem to have a very bad average rate of success in absolute numbers (units lost, .. ) but in this branch turned out much more useful than the other branches that we chose recently, so depsite the bad absolute figures we should rather go this way.

This makes the AI react to sudden changes on the battlefield in a special way. Special circumstances require special actions.
*/



/*The keys of the following map are the decisionPaths (the order the decisions were taken. This can be: 'DECISION_RESULT_ATTACK' --> 'DECISION_RESULT_INVADE_TEN_TRIBES_AT_ONCE_AT_MAX' --> 'DECISION_RESULT_ATTACK_THE_CIVIC_CENTER_DONT_GET_DISTRACTED_ON_YOUR_WAY' --> 'DECISION_RESULT_DRAW_RESERVES_FROM_OTHER_FRONT_NO_MATTER_WHAT_THE_OTHER_GENERAL_MAY_SAY' --> ...
This will result in a decision path of e.g "01420...". */


//for each decision possibility we store the outcome of the last time we went exactly that path. The following map therefore stores the element of each decision possibility that was settled on for every level. So fishing the subsequent decision that was made from any decision stored in the map will return another element of the map, where the decision path (the key of the map element) just is the same as the previous preceding decision of that kind but the decision possibility this decision stands for is appended to the path. e.g. {"000" => DecisionElement, "0003" => subsequentDecisionElementOfDecisionElement, ...}.
ai.globalPreviousDecisionsMap; /*<-- because we have to somehow remember the previous decision that came together the same way (by the same preceding decisions in the current root loop).*/


/*The above previousDecisionMap only stores the last decision object for each possible decisiontaking path. The following provides a snapshot of all last X rootDecisions. From a rootDecision it's possible to traverse into all leaves. */
ai.rootDecisionsCircularBuffer = new Array(/*ROOT_DECISIONS_CIRCULAR_BUFFER_COUNT*/); 
ai.rootDecisionsCircularBuffer_index = -1; /*<-- where we currently are*/
//Did we reach the end of the circular buffer?
if (++rootDecisionsCircularBuffer_index > ROOT_DECISIONS_CIRCULAR_BUFFER_COUNT - 1) {
    //Then reset it: (also possible using modulo)
    rootDecisionsCircularBuffer_index = 0;
}


ai.THRESHOLD_DISTANCE_TO_BE_A_COHERENT_GROUP = 10/* m^2? */;



/**
 * CLASS DECISION MAKING.
 * Makes a decision and stores a made decision as well as its predecessor (and successor decision).
 */
ai.DecisionMaking = function(decisionTreePathSoFar
        , commander_in_chief_in_charge
        , precedingDecisionMaking,
        , situationAtPointOfDecision /* Current state of the simulation at time of decision making. */
        , levelOrderOfDecisionMaking /*TODO This is to allow AI genetic order variation at a later point.Currently we have a 'guided' learning process by experimentation, while the direction and outline of timing is given. */
        ,/*optional-->*/ allDecisionPossibilities
        ) {


    //======= ATTRIBUTES =================================================//
    this.pathToRoot = decisionTreePathSoFar || [];
    this.commander = commander_in_chief_in_charge;
    this.precedingDecisionMaking = precedingDecisionMaking;

    this.subsequendDecision; /* <--at the point this 'constructor' is called we don't know the succeeding decision. Once we settled on one of the possibilities we will set that variable.*/
   
    //TODO To save the complete previous decisions of same kind history or not? => if yes, then the following attribute is required.  (and we needit for the differential in our weighted decision making).
    //cache currently needed for differential (to keep the complete history): otherwise use determinePreviousDecisionMakingWithSamePathToRoot() function without parameters instead for determining it on the fly!
    this.previousDecisionMakingWithSamePathToRoot = undefined; /*InEqualSituation; then we had to examine the childDecision that this decision settled on. This might be useful later, but we - for now - will instead iterate all our childDecisions, that are the same of course like the variable at the left that we will not set but instead leave as undefined for now. */

    this.levelOrderOfDecisionMaking = levelOrderOfDecisionMaking;
    this.situationAtPointOfDecision = situationAtPointOfDecision;

    //calculated or derived from previous decision making of same kind.
    this.averageOutcomeOfAllSubbranches = 0; // <-- this time.
    this.averageOutcomeOfAllSubbranches_total = 0; // <-- over all times we had to decide this same decision (a decision is only the same if the decisionpath to this decision is equal!).
    this.averageOutcomeOfAllSubbranches_total_count = 0; //<-- for determining the mean/average value of all averages sumed up.
    
    /*Decision*/this.situationAtPointOfDecision = situationAtPointOfDecision; /* <-- TODO: Determining the state will make more sense directly AFTER this decision decisiontaking process is finished and we have a optionTheDecisionFellOn. Then at a later point this currentStateCanBeUsed to get to the net happenings/losses of units et alia. Net happenings is the averageOutcomeAtTheVeryEndOfEachSubsequentBranch = Total sum of all averagesOfSubsequentBranchesSubbranches / #subbranches. This averageOutcomeForASubbranchOfOurs - currentStateOfOurTribe = netOutcome. So as the decisions from before are already passed in time and we have no more influence on it, so it must also not be included in our examinations. If we had high losses so far until we arrived at this decision point, then we will learn from that next time we have to decide upon whether to redecide on the same decisions that led to us or if we go another route. So we want to know only the difference of the last state to the current state. */
    
    this.averageStateAtEndOfAllOfThisElement_sSubBranches = undefined;




    this.allDecisionPossibilites = allDecisionPossibilities ||  this.commander.getCurrentCommand().decision_options_at_level[this.levelOfDecisionMaking + 1];
    this.optionTheDecisionFellOn = undefined;     /* <-- set this once the decision is decided.*/
    











    //======= FUNCTIONS ==================================================//
    /**
     * Get the path to root and if not cached as attribute reconstruct it from preceding decisions made.
       The decisionPathToRoot is necessary for the upcoming weighting process when we decide which branch to take best. The decisionPathToRoot is the key to the decision knowledge of the one previous decision that came along the same decision path if this is not the first time we made the decision.
     */
    this.getPathToRoot = function(elementToStartAt) {

        elementToStartAt = elementToStartAt || this;
        if (elementToStartAt.pathToRoot) {
            return elementToStartAt.pathToRoot;//<-- now it's an array + ""; /*ensure it's a string*/
        }
        if (elementToStartAt.precedingDecisionMaking) {
            elementToStartAt.pathToRoot = /*"" + */elementToStartAt.precedingDecisionMaking.getPathToRoot();
            //add the preceding decision result that led to this decision making:
            elementToStartAt.pathToRoot[] = precedingDecisionMaking.optionTheDecisionFellOn;
            return elementToStartAt.pathToRoot;
        }
        
	//=> Reached the root decision making.
        warn(
            'Is this the root element? Because there is no path to root from this Element: '
            + elementToStartAt + '.\r\nNeither pathToRoot is set: ' + elementToStartAt.pathToRoot
            + ' nor is this.precedingDecisionMaking: ' + elementToStartAt.precedingDecisionMaking
        );
        return [];//"";
        
    }


    
    /**
     * 
     */
    this.getHypotheticalPathToRootForSubsequentDecisionMaking = function() {
	var hypotheticalPathToRoot = this.getPathToRoot();
        if (hypotheticalPathToRoot || typeof hypotheticalPathToRoot != 'array' || hypotheticalPathToRoot.isEmpty()) {
 		warn('No path to root. Is this the root decision making?');	
                hypotheticalPathToRoot = []
        }
        hypotheticalPathToRoot[] = this.optionTheDecisionFellOn;
        return hypotheticalPathToRoot;
    }



    /**
     * Returns either:
       - the cached previous decision making with same path to root (mainly needed for going farther back in decision tree history).
         OR
       - determines the previous decision making with same path to root dynamically from this decision's commander's decision tree history (where usually only at maximum 1 decision making of same kind/with same path to root back in history is stored!). This result is also stored in the cache then.
     */
    this.getPreviousDecisionMakingWithSamePathToRoot() {
        if (!this.previousDecisionMakingWithSamePathToRoot) {
		this.previousDecisionMakingWithSamePathToRoot = this.determinePreviousDecisionMakingWithSamePathToRoot();
	}
        return this.previousDecisionMakingWithSamePathToRoot;
    }



   /*Note: A constant itself is an integer, an enum is a complification, but e.g. TYPE_MILITARY is more meaningful than simply using 3. It's easy to accidentally write 'types[3] = new TypeCivil()' but more difficult to type 'types[TYPE_MILITARY] = new TypeCivil()'.*/
    var DECISION_TREE_DECISION_MAKING_OBJECT_INDEX = 0;/*I wonder if it's not better to use a string->obj map instead as initially planned.*/
    var DECISION_TREE_SUBSEQUENT_OPTIONS_ARRAY_INDEX = 1;
    /**
     * If this decision was made already and the subsequent decision making has been set: The subsequent decision making.
     * If decision was already made but the subsequent decision making process has not been stored yet: The previous decision making of this kind.
     */
    this.getSubsequentDecisionMaking = function() {

        if (this.subsequentDecisionMaking) {
            return this.subsequentDecisionMaking; //the real decision.
        }
	warn('A decision making that followed this decision making is not stored yet. For leaf decision makings this is normal. Is this a leaf decision, i.e. the last of a decision sequence? (Also called decision_options_at_levelDepth, so is the levelDepth the deepest possible?)' );
        if (this.optionTheDecisionFellOn) {

            //previous decision of this kind (not necessarily the real subsequent decision element because only the last occurrence of this decision tree path is stored.)
            //return this.commander.previousDecisionMaking["" + this.pathToRoot + this.optionTheDecisionFellOn]
            /**/
            if (!this.commander) {
                return undefined;//<-- no decision of this kind yet of this commander.
	    }
            if (!this.optionTheDecisionFellOn) {
               return undefined;
            }
	    //else:
            return this.commander.getPreviousDecisionMaking(this.getHypotheticalPathToRootForSubsequentDecisionMaking(), command);
        }
        //okay, we don't have decided on/choosen a decision option yet, so we can't tell anything of the next decision making process:
        return undefined;

    }



    /**
     * The decision making that led to this decision making process.
     */
    this.getPrecedingDecision = function() {
        return this.precedingDecisionMakingMade;
    }

    /**
     *
     */
    this.getDecisionResultMadePriorToLandingHere = function() {
        return this.precedingDecisionMaking.optionTheDecisionFellOn;
    }


    

    /**
     *
     */
    this.getAverageRatingOfAllBranchesOutcomesRecursively = function() {

        //termination condition:
        if (!this.allDecisionPossibilities || typeof this.allDecisionPossibilities  != /*'array'*/'object' || this.allDecisionPossibilities.isEmpty() ) {
            return this.calculateOutcome();
        }
        
        //else:
        this.averageOutcomeOfAllSubbranches = 0;
        for (var candidate in this.allDecisionPossibilities) {
            this.averageOutcomeOfAllSubbranches += candidate.getAverageRatingOfAllBranchesOutcomesRecursively()
        }
        //keep track of the total rating (absolute value, might grow huge despite e.g. losses being counted negatively and e.g. gain in territory positively)
        this.averageOutcomeOfAllSubbranches_total += this.averageOutcomeOfAllSubbranches;
        this.averageOutcomeOfAllSubbranches_total_count++;
 
        return this.calculateOutcome() + this.averageOutcomeOfAllSubbranches;

    }


    
    /**
     * Decides weighted.
     * Stores the most promising DecisionMaking that initially only was temporarily crated from a decision option possibility.
     * Also returns that decision making.
     * And stores the decision option/possiblitity we settled on too.
     */
    this.decideWeighted = function() {

        //Determine the previousDecisionWhereWeHadBeen in the identical decisionFinding precedingly and settled upon this same possible DecisionResultCandidate (= childDecision in the decision tree).
        var previousDecisionMakingWithSamePathToRoot = this.determinePreviousDecisionMakingWithSamePathToRoot();


        var highestRatedCandidate;  //<-- our goal.
        //for the previous time we had to make the same decision calculate all ratings for all possible outcomes:
        for (var candidate in this.allDecisionPossibilities) {

  
            if (!highestRatedCandidate) {
                highestRatedCandidate = new DecisionMaking(getHypotheticalPathToRoot(candidate), this.commander, this, undefined, this.levelOrderOfDecisionMaking + 1) 
        ,  /*TODO This is to allow AI genetic order variation at a later point.Currently we have a 'guided' learning process by experimentation, while the direction and outline of timing is given. */
        , allDecisionPossibilities
);
                continue; /*because comparing the same candidate to itself is not useful.*/
   	    }

            //FIND THE DECISION MAKING WE ARRIVED AT BACK IN HISTORY ONCE WE HAD SETTLED UPON THIS CANDIDATE.
            var previousDecisionMakingWithSamePathToRootAsSeenFromCandidate = this.determinePreviousDecisionMakingWithSamePathToRoot(candidate);
            //Let's see how the outcome for this branch was last time if such a decision did already take place in history?
            if (!previousDecisionMakingWithSamePathToRootAsSeenFromCandidate) {
                //not yet happened in history for this commander. => So the rating is neutral.
                 
                //Now that we have the decision result from back in history when we made the same decision, let's learn from it:
                //1. calculate and store the average rating/outcome of a subbranch that followed once we made the decision.
                /* This unfortunately requires us to acquire the data of only one path as the others were not decided upon, so there is only one childDecisionCandidate that settled upon (and whose branch has outcome data as it produced an outcome in the end). All other branch possibilities had been possible but were not chosen and hence no results/outcome ratings are available for those.
                  => Effectively for summing up we climb down the decision tree following each decision possibility that was chosen in each level until the leaf is reached.
                  => This recursive algorithm is repeated for the other branches that we did not choose too, but to make this possible we have to fetch the branch from the history of all previous decisiontakings.
                  => Sum up all the different changes in state of each branch and get the average by dividing through the #branches i.e. the number of decision possibilites that can chosen froai.

               */
                candidate.averageOutcomeOfAll
                candidate.averageOutcomeOfAllSubbranches = candidate.getAverageRatingOfAllBranchesOutcomesRecursively();
            
            }

            
            var highestMinusCandidate_total = highestRatedCandidate.averageOutcomeOfAllSubbranches_total - candidate.averageOutcomeOfAllSubbranches_total;

            var highestMinusCandidate_total_average = highestRatedCandidate.averageOutcomeOfAllSubbranches_total / highestRatedCandidate.averageOutcomeOfAllSubbranches_total_count - candidate.averageOutcomeOfAllSubbranches_total / candidate.averageOutcomeOfAllSubbranches_total_count;

            var highestMinusCandidate_average = highestRatedCandidate.averageOutcomeOfAllSubbranches - candidate.averageOutcomeOfAllSubbranches;




            if (highestMinusCandidate_average < 0 || highestMinusCandidate_total < 0 || highestMinusCandidate_average < 0) {
                if (highestMinusCandidate_average + highestMinusCandidate_total + highestMinusCandidate_total_average < 0) {
                    //then the candidate had better outcome that the so far highest rated candidate.
                    


                    /*Learn from the differential between the previous and previous of the previous same decisiontaking situation:*/
                    var backInHistory_count = 0;
                    var previousDecisionInEqualSituation_backInHistory = previousDecisionInEqualSituation.previousDecisionInEqualSituation;
                    var 
            while (backInHistory_count + 1 < DECIDE_WEIGHTED_BACK_IN_HISTORY_COUNT && previousDecisionInEqualSituation_backInHistory) {
                
                var backInHistoryMinusCandidate_total = backInHistoryMinusCandidate_total.averageOutcomeOfAllSubbranches_total - candidate.averageOutcomeOfAllSubbranches_total;

                var highestMinusCandidate_total_average = highestRatedCandidate.averageOutcomeOfAllSubbranches_total / highestRatedCandidate.averageOutcomeOfAllSubbranches_total_count - candidate.averageOutcomeOfAllSubbranches_total / candidate.averageOutcomeOfAllSubbranches_total_count;

                var highestMinusCandidate_average = highestRatedCandidate.averageOutcomeOfAllSubbranches - candidate.averageOutcomeOfAllSubbranches;

            }

                    if (levelDepth  == DECIDE_WEIGHTED_PREVIOUS_DECISION_IN_EQUAL_SITUATION_LEVEL_DEPTH_MAX_FOR_OVERRULING - 1) {
                        //examine differential between this level depth back in history and the first previous decisiontaking in the same situation.
                        return ;
                    }

                        var differentialBackInHistoryByLevelDepthMinusInitial = this.decideWeighted(previousDecisionInEqualSituation.previousDecisionInEqualSituation, levelDepth + 1, candidate, highestRatedCandidate);

                        if (differentialBackInHistoryByLevelDepthMinusInitial < 0) {
                             /*back in history - initial first previous decision in equal situation differential < 0 means that the recent trials were very promising as the damage was limited */
  
                             

                        highestRatedCandidate = candidate;

                    }


                }
             }

             

        }
        

       
    }


    
    /**
     *
     */
    this.checkPrecondition = function() {
        return true;
    }

}


/*INHERIT*/
//ai.DecisionMaking.prototype = /*superclass*/;
/**
 * If this function is called without argument then the previousDecisionElementIsReturnedWhereThatSameDecisionHadToBeTaken as we currently want to make from any commander. TODO From any commander?
 * Otherwise the returned object is more specific and will directly return the childDecisionThatWeWouldReach now too if we settled on the parameter given (childDecisionDecidedOn).
 */
Decision.prototype.determinePreviousDecisionMakingWithSamePathToRoot = function(childOptionTheDecisionCouldFallOn) {

    var hypotheticalPathToRoot = this.getPathToRoot();
    
    //caching is needed though dynamic solutions are better to not get 'unsynchronized' problems, so we mix and also cache it as we elsewise not have a deep enough history for differential weighting. (currently the decision tree only saves one decision making back into history).
    this.previousDecisionWithSameRootPath = this.commander.getPreviousDecisionMaking(hypotheticalPathToRoot, command);
    //<-- will find root decision making if hypotheticalPathToRoot is undefined or empty.

    //get exactly the decision we picked last time we had to make the same decision?
    if (childOptionTheDecisionCouldFallOn) {
        //return getPathToRoot() + "" + childDecisionDecidedOn.getDecisionResultMadePriorToLandingHere();
        hypotheticalPathToRoot = this.getHypotheticalPathToRootForSubsequentDecisionMaking(childOptionTheDecisionCouldFallOn);
        if (!hypotheticalPathToRoot) {
            //a subsequent decision making can't be the root decision making! so prevent it from being declared a root decision:
            return undefined;
	}
    	return this.commander.getPreviousDecisionMaking(hypotheticalPathToRoot);
    }

    return this.previousDecisionWithSameRootPath;
    

};


















/**
 * Algorithm for picking weighting AI decisions and state machine hopping for Artificial Intelligence.
 */
function AI(states) {
    this.stateMachine = new StateMachine(states);
}
function StateMachine(states, start_state) {
    StateMachine.states = states;
    StateMachine.currentState = states[start_state || "init"];//<- Attention: not working for most languages but short.



    /* The state machine changes states on hard facts. Multiple child states can reach multiple parent states.
     Everything is possible. But currently this algorithm can't learn. 
     Also note the difference of state machine decisions (hard facts, execute ALL options if the facts allow it, i.e. preconditions are met. so that every option of the state is executed quite balanced. This is why long loops are not recommended.) to the command decision making (where we work through several levels (the tree) of decisions inbetween options (we choose only 1), while a lower level depends on a higher level, e.g. defending the targets with x troops depends on which targets were chosen and how many (otherwise we will not have enough soldiers, but this the AI might even learn by the very nature of the decision tree. For the targets to be picked it could also learn it. So finally even the order of decisions could be learned. But as we don't have any strategic gain from that as the best working order is quite obvious we can lead the AI in a direction by simplifying giving the order statically.  TODO dynamic order -> AI learns best order in which the decisions are to be taken.). */
    StateMachine.pickNextState = function() {
    
        if (!StateMachine.currentState) {
            for (var state in this.states) {
            
                //choose the first state:
                this.currentState = state;
                return;
                
            }
            
            return warn('No state found in the state machine! This renders the state machine useless unless you add states later on.');
        }
        
        //otherwise we choose one of the states that are reachable from the current state:
        var stateInWorstCondition = undefined;
        for (var state_key_or_callback in this.currentState) {/*NOTE: All callback functions are executed. So as to spare at least some time for each entry - more exactly: each time we change the current state/or repick the old state once again, that's the time to just execute all the callbacks once.*/
        
            //if (!this.states) return; <--don't check for this because it's possible to have one state only and many callback functions therein.
            var state_candidate = this.states[state_key_or_callback];
            if (this.states.hasOwnProperty(state_key_or_callback) && state_candidate) {
                //okay, it's a state:
                if (!stateInWorstCondition
                        /* is the situation in the new candidate worse than in the currently state? */
                        || stateInWorstCondition.getConditionReport().getOverallRating() > state_candidate.getConditionReport().getOverallRating()) {
                    stateInWorstCondition = state_candidate;
                }
            }
            else {
                //it's not a state, is it a callback function?
                if (state_key_or_callback && typeof state_key_or_callback === "function") {
                    //callback.call(newValueFor'This'Keyword);
                    state_key_or_callback(/*arguments*/);
                }
            }
            
        }
        if (stateInWorstCondition) {
            this.enterState(stateInWorstCondition);
        }
        
    }
    
    
    
    /* NOTE Commands can be seen as a subdivision of problems, so one might call them state divisions or ministries:
        - military (division for occupation, ministry for defense, ministry for attack, ministry for supply[lines], division of recruitment/peacetimes/headquarters(involved in diplomacy ... having assigned all military commanders in peacetime)),
        - legislative (laws,disputes, military tribunals, all judges ..),
        - judicative (, ..)
        - executive (leadership, councils/parliament/senate --> taxes, tolls, diplomacy, creating new commands).
        
      Commands can not create new commands but can request it.
      
      A command can issue a mission. Usually those missions are created, altered (e.g. assign more units, remove units, change goals, like from holding to attacking) or aborted wildly during the decision making while the focus is on this command. The goal of this process is to find out what works and what not, thus it's a learning process. 
      

     A command is not stored within units - that means the command is not fixed to a commander, because if the commander died unexpectedly the command/goals would be lost - so as if the country itself forgot why it was at war on this front of the command only because the commander no longer exists.
     
     The same is true for missions, so the strategic experience gained through the decision tree on a mission is not limited to the commander.
     
     
     
     IMPORTANT NOTE: I wonder if it'd not be even better to store the decision tree weights within units. That meant that once a commander had been
     reliefed from his/her command position, then there were a fresh air because of a completely different decision tree within the new general. 
     
     This would also make it more important to target officers. Or highly capable officers. 
     
     
     
     '''command decisions (learning algorithm/weighted decision tree) vs. state machine decisions (reorientation according to hard facts):'''
     
     The state machine (read the hard facts) have some influence on the execution of a command, because otherwise the command might never be interrupted because a command tries to be as successful as possible and if it does not reach a good outcome/the final goal: finishing the command successfully (there also are commands that are endless, e.g. occupation eventhough that also could be assumed as ended once the two tribes join or melt together becoming one union.). The only 'natural' 2 cases for a command to terminate by itself are 'giving up' i.e. cancelling the command or 'declaring the command as all goals achieved'. 
     
     How to react on hard facts itself in the state machine could also be put into a weighted learning decision tree. 
     
     It is given up if e.g. no more units are available or if they had a goal to hold a position if they are driven off completely. If achieving any of the goals is impossible, then the command will also give up. Usually this is a seldom event as it's not easy to determine when a situation is hopeless. Such a case might be the loss of every officer, even the commanders in chief so that there is noone that could make a unit/soldier an officer (or if no more soldiers are there of course).
     
     Whenever a command ends, a the senate coming together with the highest officer as a 'reporter'/'advicer' on the related 'topics' of this session of the senate.
     
     There are other ways for a command to terminate. One is learning via the decision tree. 
     
     Before that to happen hopeless and requests a senate session, finally giving up or  an emergency  it triedstop.
     Extreme cases the next state to enter the state machine might choose (here it's no decision making/learning but rather the hard facts like the state and rate of change of the economy, mortal rate of units, ratio units per ground, ratio ground lost/gained, ratio of strength of the enemy vs us, ...). is: is abandon tribe/suicide of the AI itself, enter doom state - a state where hope for rescue is low and so the AI takes more shortsided measures like giving up large chunks of territory or calling in all units or sending units to found a new settlement.
     * - surrender - or victory. will be  either because 
     * the situation worsened and the hard preconditions for focusing command are no longer met, .
     */
    /**
     * Focus on command. Makes all decisions for this command. It can also be decided to change
     * the state machine's state. Shifting the focus to another command - or even dissolving/aborting
     * all commands. (see long note above this comment block)
     *
     * All actions/functions are executed . 
     *
     */
    this.command(command) {
        
        //IMPORTANT: don't loop here!! no endless loops other than the state machine! It will reenter this command automatically.
        
        //var decision_options_at_level = new Array();  <-- now each command has its own decision_options variable to store decision options.
        //the commander in charge changes is picked randomly each time the command 'planning'/'decision making' is issued.
        var commander_in_chief_in_charge = command.commanders_in_chief[Math.random(0, 1) * command.commanders_in_chief.length];

        //local temporary variables:
        var level = 0;
        var decisionTreePathSoFar = [];//"";
        var decisionMaking;
        var precedingDecisionMaking;
        var force_focus_on_this_command = false;//<-- really not recommended to make this a neverending loop as long as the preconditions are met. It could result in other commands spinning out of control. Imagine this command is going well, then the preconditions always are met and there will be absolute focus ... also in such a short timeframe there will be almost no outcome or change and still the decision tree would be filled and filled and more filled - and while the decisions might differ randomly but no changes have happened in this short time of this infinite loop - well then we could have spent the time on other commands for no difference. So forcing the focus should be issued by a commander only if it is detected that this command's frequency/interval is too seldom to react on the ground. The command.recommendations.COMMAND_CONDUCT_INTERVAL_IN_MINUTES will depend on the rate of change. If from one looping to the other round of the while loop the rate of change is very low, hardly enough to base decision making on it and rather close to stagnation_threshold. Then this threshold will be increased (as a recommendation of the commander in chief for the senate's decision making and the general state machine.).
        //Are the requirements met?
        //Are there any decisions to be made (following an algorithm, i.e. a fixed order of planning, targets, executing, analyze outcome..)?
        while (this.getCurrentState().areTheHardPreconditionsMet() && (level < || force_focus)) {


            //always recalculate how many decision options there are for each level. better don't cache it as new object entries on the fly are possible in JavaScript:
            var decision_options_count = 0;
            for (var key in ai.getStateMachine().getCurrentState().decision_options_at_level[level]) {
                if (ai.getStateMachine().getCurrentState().decision_options_at_level[level].hasOwnProperty(key)) {
                    decision_options_count++;
                   //if (typeof ai.getStateMachine().getCurrentState().decision_options_at_level[level][key] == 'function') <-- TODO check for this later after the decision waas made and we react differently to if a new sate was chosen or a direct action (function) was ordered OR if it is an object itself then we have to dig deeper recursively as alternative to this while loop's approach we currently use until we have reaching the decision hierarchy's end/a leaf. 
                }
            }
            
            
            //generate a random number (integer) that results makes us pick the 
            var randomNumber = Math.random(0, 1) * decision_options_count;
            //calculate decision weight for random influence on the next decision.
            if (command.situation.averageRatesOfChange < 0 - ai.THRESHOLD_RATES_OF_CHANGE_STAGNATION
                    || command.situation.averageRatesOfChange > 0 + ai.THRESHOLD_RATES_OF_CHANGE_STAGNATION) {
                //no stagnation => update the pointOfTimeOfLastProgress:
                command.pointOfTimeOfLastProgress = NOW() * MINUTES;/*minutes being equal to 1 if we use minute as the atomar unit of time.
                for more information on the decision, see: http://www.wildfiregames.com/forum/index.php?showtopic=18257&page=3#entry285305*/
                
            }
            
            //this randomNumber will be the random variation, that will be added
            //store:
            precedingDecisionMaking = decisionMaking;
            decisionMaking = new DecisionMaking(decisionTreePathSoFar, commander_in_chief_in_charge, precedingDecisionMaking, ai.);
            precedingDecisionMaking.setSubsequentDecisionMaking(decisionMaking);
	    //If we are in a decision tree leaf, i.e. at the last level of option that is to be selected then we have no subsequent decision and this is what we'd expect.
            var index_decision_made = decisionMaking.decideWeighted();
            ai.debug('decision made: key of option chosen = ' + index_decision_made);
            //store decision making result in decision tree path.
            decisionTreePathSoFar[level] = index_decision_made; //<--

            
            //pick one object giving random influence depending on time we stagnated for:
            decision_options_index = -1;
            for (var key in decision_options_at_level[level]) {
                //real own prop and not of inherited of prototype?
                if (ai.getStateMachine().getCurrentState().decision_options_at_level[level].hasOwnProperty(key)) {
                    if (++decision_options_index == randomNumber) {
                        //call the callback
                        decision_options_at_level[level][key]();
                        break; /*stop the for loop as we only settle on one and only one out of all options.*/
                    }
                }
            }
            
            
            //next subsequent planning step.
            level = ++level;
            if (level > decision_options_at_level.length - 1) {
                //start over again (of course if hard or soft preconditions no longer are met, the loop will stop. For the soft requirements for this current state machine state the AI will decide automatically by learning if it was a good choice to continue even though soft requirements were not met.)
                level = 0;
                decisionTreePathSoFar = [];//"";
                decisionMaking = undefined;
            }
            
        }
    }
}
















/**
 * TODO: Handle entity on entity in C++ or in common-api/Entity.js but in a branch.
 * For now the script side entity representation will work around the engine limitation of prop/object/visual actor.
 * We add a variable children that contains all entities this entity consists of. Then we somehow have to attach those entity 
 * objects/meshes by copying location and rotation. 
 */
//ai.Entity = function() {


ai.Entity.prototype.parentEntity; //an object/mesh can only have one parent. For mechanical links chaining may be used. If parentEntity is undefined then this is a usual single entity mesh object.
ai.Entity.prototype.children = [];//the children are the inventory at the same time! That means in am emergency situation wood can be taken from the inventory of a entity construction that consists of several planks. This may weaken structure/cohesion and building-entity-health/condition.
/*
 *Store found goods either:
 1) Globally at the tribe's inventory. OR
 2) In the unit's or the unit's command's headquarters (house/civic center, ..), so only units and buildings had inventory the latter having more storage space of course.
 3) Add inventory directly as children that immediately also change the calculated weight of objects, but scale them either down or turn off camera ray visibility if it's not desired to see the inventory. Otherwise adapt the childobject's offset. (e.g. siege machines) 
//ai.Entity.prototype.inventory; //array of objects - can be seen as a unit's bag should we decide a unit itself also can be a command.
    
ai.Entity.prototype.rotationOffset = [0, 0, 0];		//<-- global or local frame (both turns out the same here).
ai.Entity.prototype.positionOffsetLocal = [0, 0, 0};	//<-- local frame as if e.g. a horse rotates and there are bridles at the horsehead, then those holter/holster would be at a different position than the head - so the offset coordinates have to be adapted/rotated with the parent entity's rotation. Just as in a local frame. TODO Calculate actual global position via parentEntity.rotation + this.rotationOffset by offsetting along the local axes that result from the rotation (e.g. 90deg z axis => +x points in the direction of +y at least for a right hand x,y,z-frame).
ai.Entity.prototype.isParentBearingThisEntity = function() {
        return !this.isInInventoryOfParent();	//<-- if it's not in the inventory currently, then it's currently bore/worn.
}    
ai.Entity.prototype.isInInventoryOfParent = function() {
  	//<-- this implies this.isVisible = false; this.isVisible = false;

	//Two Possibilities: 
    	
        //1) If it's possible to toggle camera visibility:
	return !parentEntity.cameraVisibility;/*Entity is not in inventory but is visible instead.*/

      	//2) Else: (if we use this approach then we not even need to position the sub/child entity exactly in the middle of the host/parent objectas we could simply scale it down so much that it is almost zero in size. Of course removing/not rendering the sub-/child object would be better.)
	return parentEntity.getOrigin().getPosition().equals(this.getOrigin().getPosition());

 	
};//<-- this implies this.isVisibleForCamera = false; this.isVisible = false;


/*TODO
ai.Entity.prototype.isInside = function () {
       //if (parentEntity.mesh.boundingBox.) 
       //check for the origin only!! that's enough as we then scale the object such that it will not shine through! (we have to scale it for collisions, only omitting it from render will not be sufficient.)
       
       if (this.origin.isWithing.parentEntity.mesh) {
       }
       
};
*/  


/*
ai.Entity.prototype.origin;
ai.Entity.prototype.getOrigin = function() {
	return this.origin;
}
*/
//ai.Entity.prototype.mesh;
//ai.Entity.prototype.position = new Vector();
//ai.Entity.rotation = new Vector();//if 3D or 4D or any other is determined by the argument count.
//ai.Entity.scale = new Vector(1, 1, 1);//{x: 1, y: 1, z: 1}
ai.Entity.scaleVariationLocal = new Vector(1, 1, 1);//{x: 1, y: 1, z: 1} <-- local frame!!
    
    






//---------SUBCLASSES--------------------------------------------------------//

/**
 * Unit, extension of Entity (the difference is that basic entities like materials 
 * can't take a command or have a loyalty, but they have a health/condition, armour, ...).
 * Officer. Once a unit is appointed officer, the title remains.
 * Though the position might not.
 */
ai.Unit = function() {
        this.Base = Entity;
        this.Base(/*arguments*/);

	//=======CONSTRUCT===================================================//
    	this.loyalty;				//<-- towards government
	this.sympathyTowards = new Array();	//<-- key is the reference to another unit
	this.experience = [ commandXY, command_consulship, ... ];//<--array of Objects not necessarily where a decision tree is involved.
        this.previousDecisionsMadeMap = {
		commandXY: [],//{/*0 --> INVADE_NO, 01 --> INVADE_NO-IGNORE_SOFT_REQUIREMENTS_NO_LONGER_MET */},
		commandYZ: []//{},
        };
        this.headquarters;			//<-- each unit has its own headquarters at the house it was born/contructed.
	this.timeSinceLastProgress = 1; 	//<-- so that the weight of the random influence on the decision making is neutral, i.e. one.

	this.isOfficer = false;			//<-- to keep it simple an officer is just like any other unit but may execute special functions that check for this unit being an officer or not. e.g. taking command of a mission.
        
        

	/*-------static-------*/
	//ai.Unit.


	/**
         * Returns the last active command/occupation. Currently time is not stored, so it's not possible to  tell whether the commander
           is still a commander of this command (other than checking in the command itself).
         */
        this.getCurrentCommand(/*optional:*/checkIfCommanderStillListedInLastCommand) {

                var last_active_occupation = undefined;
                if (this.experience && typeof this.experience == 'array' && this.experience.length > 0) {
                        last_active_occupation = this.experience[this.experience.length - 1];
                }
                //per default don't check for the commander still being in active duty in the last command that is listed in the experience.
                if (last_active_occupation && checkIfCommanderIsStillListedInLastCommand) {
                	var isStillCommander = false;
                    	for (var commander_i = 0; commander_i < last_active_occupation.commanders_in_chief.length; commander_i++) {
                                var commander = last_active_occupation.commanders_in_chief[commander_i];
				if (commander === this) {
                                    isStillCommander = true;
                                    break;
                                }
                    	}
                	if (!isStillCommander) {
                        	return undefined;
			}
                }
                return last_active_occupation;

        }


        /**
 	 * Previous decision making starts with [0]->root decision
                                                [1]->decision options: [0]->array[0]->decision making.
                                                                                 [1]->decision options: [0]->array[0]->decision making.
                                                                                                                  [1]->decision options: ...
                                                                                                        ...
                                                                       [1]->array[0]->decision making.
                                  						 [1]->decision options: [0]->...
													...
                                                                       [2]->array[0]->decision making.
 										 [1]->decision options: [0]->...
                                                                        .                               ...
                                                                        .
                                                                        .
         */
        this.getPreviousDecisionMaking = function(pathToRoot, /*optional:*/command) {

                var last_active_occupation = this.getCurrentCommand(false/*don't check for the commander still being active*/);
		//the commander is not yet aware of the new command but there are already decisions ongoing without his/her knowledge?
                if (command && last_active_occupation != command]) {
                        //add the command. Note: It might well be that such a command already exists in the experience. That's no problem we can derive time periods from that and give interesting insights of how often and when a commander was in control of which command. The decision trees for each command are merged.
			warn('The commander' + this + ' has been assigned to a new command in getPreviousDecisionMaking - now should be synchronized again: ' + command);

			this.experience[] = command;
                        last_active_occupation = command;
                }
                if (!last_active_occupation) {
			warn('The commander' + this + ' seems not to be assigned to a command: ' + command);
		}

                //the decisions the commander made for the current command:
		if (!this.previousDecisionsMadeMap || !this.previousDecisionsMadeMap[last_active_occupation]) {
			return undefined; /*<-- no decisions so far for this command*/
		}
		//else:
		var previousDecisionsMadeEntry = this.previousDecisionsMadeMap[last_active_occupation];
                //root decision?
                if (!pathToRoot || pathToRoot == "" || (typeof pathToRoot == 'array' && pathToRoot.isEmpty()) ) {
                    return previousDecisionsMadeEntry[DECISION_TREE_DECISION_MAKING_OBJECT_INDEX];//<-- could result in undefined
                }
            
		//hangle along the tree until the leaves are reached.
                for (var i = 0; i < this.pathToRoot.length; i++) {
                    //At position 1 is the 2-element-array to the next array/decision making. At position 0 the decision making object is stored.
                    previousDecisionMadeEntry = previousDecisionsMadeEntry[DECISION_TREE_SUBSEQUENT_OPTIONS_ARRAY_INDEX][this.pathToRoot[i]];
                }
                return previousDecisionsMadeEntry[DECISION_TREE_DECISION_MAKING_OBJECT_INDEX];//<-- the decision making object at position 0. The next decision options that could have been chosen at position 1.
                /**/
	}



        this.setPreviousDecisionMaking = function(decisionMaking, pathToRoot, command) {
                var last_active_occupation = undefined;
                if (this.experience && typeof this.experience == 'array' && this.experience.length > 0) {
                        last_active_occupation = this.experience[this.experience.length - 1];
                }
		//the commander is not yet aware of the new command but there are already decisions ongoing without his/her knowledge?
                if (command && last_active_occupation != command]) {
                        //add the command. Note: It might well be that such a command already exists in the experience. That's no problem we can derive time periods from that and give interesting insights of how often and when a commander was in control of which command. The decision trees for each command are merged.
			this.experience[] = command;
                        last_active_occupation = command;
                }

                //the decisions the commander made for the current command:
		if (!this.previousDecisionsMadeMap || !this.previousDecisionsMadeMap[last_active_occupation]) {
			return undefined; /*<-- no decisions so far for this command*/
		}
		//else:
		var previousDecisionsMadeEntry = this.previousDecisionsMadeMap[last_active_occupation];
                //root decision?
                if ( !pathToRoot || pathToRoot == "" || (typeof pathToRoot == 'array' && pathToRoot.isEmpty()) ) {
                    	if (previousDecisionsMadeEntry[DECISION_TREE_DECISION_MAKING_OBJECT_INDEX]) {
				if (!decisionMaking.previousDecisionOfSameKind || previousDecisionsMadeEntry[DECISION_TREE_DECISION_MAKING_OBJECT_INDEX]
						 != decisionMaking.previousDecisionOfSameKind) {
					//store the old decisionMaking at this position as the previous of same kind decision in the new decision.
                                        decisionMaking.setPreviousDecisionMakingOfSameKind(previousDecisionsMadeEntry[DECISION_TREE_DECISION_MAKING_OBJECT_INDEX]);
 					//now it's save to overwrite it.
				}

			}
                    previousDecisionsMadeEntry[DECISION_TREE_DECISION_MAKING_OBJECT_INDEX] = decisionMaking;
                    return true;
                }
            
		//hangle along the tree until the leaves are reached.
                for (var i = 0; i < this.pathToRoot.length; i++) {
                    //At position 1 is the 2-element-array to the next array/decision making. At position 0 the decision making object is stored.
                    previousDecisionMadeEntry = previousDecisionsMadeEntry[DECISION_TREE_SUBSEQUENT_OPTIONS_ARRAY_INDEX][this.pathToRoot[i]];
                }
                return previousDecisionsMadeEntry[DECISION_TREE_DECISION_MAKING_OBJECT_INDEX];//<-- the decision making object at position 0. The next decision options that could have been chosen at position 1.
                /**/


};


//methods that subclasses inherit:
Unit.prototype = new Entity;






















//==========SUPERCLASS=======================================================//

 /**
  *
  * types of command:
     - permanent commands,
     - initial commands [all those that are listed within a state of the state machine are set up at first],
     - each state has its own set of (permanent commands <-TODO really needed? an example could be the analyze command, i.e. if we should terminate the command or not) and its own set of commands that can be set up.
     
     Each state wraps a multitudes of commands that could be set up or cancelled while executing the current state.(can only cancel those commands
     that are listed as subordinate to a state/command).
     
     A command itself is nothing else than a state. But a state is a mode that has been decided on due to hard facts: i.e. peacetime, wartime, indebted, bankrupt,  ..
     A command can setup missions to achieve goals. The missions itself being no different than a command.
     
     Even an officer could be represented as a more specific command: a unit - each unit having its own decision tree. 
     
     A battle group command then has a leadership that take the decisions, picking a leader whose decision tree we shall use this round(loop) randomly or choosing the commander that has the highest sympathy/loyalty among the troops currently. --> This way we have realistic scenario. The general the troops were loyal to has the power !
     
     An elephant is a unit, hence also a command. This means it can be mounted - so that a unit is the elephant's commander and the unit's decision tree is used instead or in conjuction with the one of the elephant. This is true for each animal, including humans. It's even true for buildings, but each command-sub-type has its constraints: namely a building can't move its position by itself - units have to decide to disassemble and reassemble the building - so the move position substate/decision option is not available - whereas 
     
     Units that are assigned to guarding a building are usually rather a mission/command and not a building (in contrary to units inside the building, those then belong to the building are assigned, are inside the building and once the building gets dissolved in a natural way, the units are freed.
     
     If a horse died what I hope it does not - then the rider/commander and all other assigned units and inventory would be freed: the commander in chief of e.g. the saddle is being cleared, making the saddle available to other horses. 
     
     The same for the inventory. As for the resources that were required to construct/set up the command. They are regained (e.g. the building materials). How much of those invested resources is freed is calculated from the age of the command(unit, building, ...) and initial resource costs (that itself is derived from the size of the building -> so there could be a random variation).
     
     
 */
ai.Command = function(parentCommand, gameState, headquarters) {
	//=======CONSTRUCT===================================================//
	this.parentCommand = parentCommand;	//<-- the instance that created/initiated this command (for sending e.g. reinforcement requests up the hierarchy).
	//Command.headquarters;			//<-- somewhat static or at least class attribute, not object.
        this.headquarters;			//<-- but each command has its own headquarters so we use a non-static variable.
	this.timeSinceLastProgress = 1; 	//<-- so that the weight of the random influence on the decision making is neutral, i.e. one.

	this.commanders_in_chief = [];		//<-- relief of command via e.g. commander[0].commands[LENGTH-1].commanders_in_chief.remove(commanders[0])
        
        
	//=======ATTRIBUTES==================================================//
 	this.decision_options_at_level/*step*/[];


	/*-------static-------*/
	//TODO further clarify if static class variable or not (prototype)?
	//Will a commander have use for overwriting this parameter? - At first, no! => CONSTANT STATIC.
	ai.Command.THRESHOLD_RATES_OF_CHANGE_STAGNATION = 10;//<-- fluctuation around 0
	ai.Command.ringAlarmBell = function() { /*kind of interrupt, exists for each command, defensive + offensive */ 
	
		/*gather senate members for an emergency session:*/
		ai.setSenateTime(NOW/*TIME_IN_MINUTES_because military decisions in minutes is more realistic than in seconds.*/() + 3 * 60 * MINUTES);
		ai.senate.problems_or_trouble_or_interrupt_or_victory_occupation.add(
			INTERRUPT_TYPE_DEFENSE.command_that_is_in_trouble=this,
			this.commanders_in_chief[0]
		); /*makes the leadership/senate reconsider troop assigned and currently executed commands - depending on the overall situation and the manpower and resources available they might recruit new troops and assign them in this alarming command - or if the situation is bad, maybe they will react by stopping an occupation of another country or cancelling the offensive command. */
		ai.senate.reporters/*advisors,most times those that raised the alarai.*/.addAll(this.commanders_in_chief);
		ai.senate.topics/*questions the senate has to decide about*/[] = new Topic(ai.stateMachine.states.military)
			.addPoll(new Poll(ai.raiseAlert(), COUNCIL_SENATE/*COUNCIL_PLENUM, COUNCIL_ROYAL_GUARD/PRAETORIAN_GUARD/MILITARY*/))
			.addPoll(new Poll(ai.stateMachine.chooseBestState()))
		;

	}
};



//methods that subclasses inherit:
Command.prototype.recommendations = {
	/*those are inherited and custom for each class <-- ONLY WORKING FOR PROTOTYPE instead of recommendations I guess! => Command. --> this. or Command. --> Command.prototype.*/
        COMMAND_CONDUCT_INTERVAL_IN_MINUTES: 24 * HOUR
        //, 
};





//---------SUBCLASSES--------------------------------------------------------//
/**
 * Defence.
 * Defensive.
 * A offensive front is opened, that is referenced/pointed to 1..2 closest to command's target point
 * enemy civic centers (if none found then other two buildings).
 * That is the main difference to a defensive command front line is set up perpendicular to 1..2 closest
 * friendly civic centers.
 */
ai.Defence = function(parentCommand, situation, headquarters) {
        //http://www.klauskomenda.com/code/javascript-inheritance-by-example/
        this.Base = Command;
        this.Base(/*arguments*/parentCommand, situation, headquarters);
 	//OR http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
        //Command.call(this, /*arguments*/);


	
	//======ADDITIONAL ATTRIBUTES
 	this.decision_options_at_level = /*the semi-genetic strategic decision improvement learning algorithm*/
        [
        	{ SCOUT_ENEMY_YES: scout_enemy, SCOUT_ENEMY_NO: callback_empty }
           	,{ CHECK_FOR_INVASION_YES: ai.check_for_invasion, CHECK_FOR_INVASION_NO: ai.callback_empty }
          	,{ PATROL_BORDERS_YES: patrol_borders, CHECK_FOR_INVASION_NO: callback_empty }
           	,{
			IGNORE_SOFT_REQUIREMENTS_NO_LONGER_MET_YES:
                		function() {
	                    		if (AI.getStateMachine().getCurrentState().areTheSoftPreconditionsMet()) {
	        	                	AI.getStateMachine().isStateChangeRequested = true;
	                	    	}
		                }
			,
	             	IGNORE__SOFT_REQUIREMENTS_NO_LONGER_MET_NO: callback_ignore_soft_requirements_no_longer_met_no
           	}
           	,{ DECISION_OPTION_INVADE_YES: callback_empty, DECISION_OPTION_INVADE_NO: callback_empty }  
	        ,{ DECISION_OPTION_INVADE_YES: callback_empty, DECISION_OPTION_INVADE_NO: callback_empty }  
           
   
        ];

        //-------static
 	ai.Defensive.INVASION_THRESHOLD_HOW_MANY_ENEMIES_COUNT_AS_INVASION = 10;

        ai.Defensive.areInvaded = function() {i

		return ai.invasions && !ai.Defensive.invasions.isEmpty();
	
	};

	ai.Defensive.check_for_invasion = function() {

		//clear the stored invasions as those might not be up to date (e.g. already won against).
 		ai.invasions = [];

		//look for invasions in own/allied territory (if on ally/friendly ground then send message to ally if currently under stress yourself or elsewise go and send troops immediately to help out.
                var unitsOnOwnTerritoryCount = 0;
		var unitsOnFriendlyTerritoryCount = 0;
		//TODO figure out how to find enemy units on own ground.
		var enemy_groups = groupUnitsByCoordinates(ai.THRESHOLD_DISTANCE_TO_BE_A_COHERENT_GROUP);
		for (var enemy_group in enemy_groups) {
                    ai.invasions[] = new Invasion(enemy_group, getAverageCoordinatesOfLocationOfInvasion(enemy_group));
		}
		//As the enemy could have settled on the tactics to send in all units individually and out of the THRESHOLD_DISTANCE_TO_BE_A_COHERERENT_GROUP we also have to check if there are more than INVASION_THRESHOLD_HOW_MANY_ENEMIES_COUNT_AS_INVASION units on our ground:
		if (countUnitsOnOwnTerritory() > ai.Defence.INVASION_THRESHOLD_HOW_MANY_ENEMIES_COUNT_AS_INVASION) {
			;
		}
	};
	

};

/*INHERIT*/
ai.Defence.prototype = new /*superclass*/Command/*()*/;//<-- not called, prepared only.

/*IF OTHER OBJECTS USE THIS OBJECT AS PROTOTYPE/SUPERCLASS, THEN THOSE FUNCTIONS/ATTRIBUTES WILL BE PROVIDED:*/
ai.Defence.prototype.scout_enemy: function() {
	//TODO: Send out units or individual missions (itself commands) to scout the enemy on arbitrary territory.

};

ai.Defence.prototype.patrol_borders: function() {
	//TODO: send out units or individual missions (itself commands) onto patrol.
        
};










/**
 * Offensive (Large scale invasion, siege, feint attack, preventive attack, counter attack, .. ).
 * An offensive front is opened, which is referenced/pointed to 1..2 closest to command's target point
 * enemy civic centers (if none found then other two buildings).
 * That is the main difference to a defensive command front line is set up perpendicular to 1..2 closest
 * friendly civic centers.
 * 
 * It's not limited to the high command (e.g. senate) or another offensive command only to initiate
 * offensive action. It may as well be started by a defensive command.
 */
ai.Offensive = function(parentCommand, situation, headquarters) {
        //http://www.klauskomenda.com/code/javascript-inheritance-by-example/
        this.Base = Command;
        this.Base(/*arguments*/parentCommand, situation, headquarters);
 	//OR http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
        //Command.call(this, /*arguments*/);


	
	//======ADDITIONAL ATTRIBUTES
 	this.decision_options_at_level =
        [
           { INVADE_YES: callback_empty, INVADE_NO: callback_empty }
           ,{ IGNORE_SOFT_REQUIREMENTS_NO_LONGER_MET_YES: //<-- this is for a commander in chief to decide whether to cancel the command or not. (asking the senate of course, but depending on the situation and sympathy towards the commander in chief they might reject the request and replace the commander in chief.)
                function() {
                    if (AI.getStateMachine().getCurrentState().areTheSoftPreconditionsMet()) {
                        AI.getStateMachine().isStateChangeRequested = true;
                    }
                }
              ,
              IGNORE__SOFT_REQUIREMENTS_NO_LONGER_MET_NO: callback_ignore_soft_requirements_no_longer_met_no
           }
           ,{ DECISION_OPTION_INVADE_YES: callback_empty, DECISION_OPTION_INVADE_NO: callback_empty }  
           ,{ DECISION_OPTION_INVADE_YES: callback_empty, DECISION_OPTION_INVADE_NO: callback_empty }  
           ,{ DECISION_OPTION_INVADE_YES: callback_empty, DECISION_OPTION_INVADE_NO: callback_empty }  
           ,{ DECISION_OPTION_INVADE_YES: callback_empty, DECISION_OPTION_INVADE_NO: callback_empty }  
}

/*INHERIT*/
ai.Offensive.prototype = new /*superclass*/Command/*()*/;//<-- not called, prepared only.





ai.Occupation = function(parentCommand, situation, headquarters) {
        //http://www.klauskomenda.com/code/javascript-inheritance-by-example/
        this.Base = Command;
        this.Base(/*arguments*/parentCommand, situation, headquarters);
 	//OR http://stackoverflow.com/questions/4152931/javascript-inheritance-call-super-constructor-or-use-prototype-chain
        //Command.call(this, /*arguments*/);


	
	//======ADDITIONAL ATTRIBUTES
 	this.//TODO

}

/*INHERIT*/
ai.Occupation.prototype = new /*superclass*/Command/*()*/;//<-- not called, prepared only.


   command_defensive: new Defensive(),
   command_offensive: new Offensive(),
           ,{ DECISION_OPTION_INVADE_YES: callback_empty, DECISION_OPTION_INVADE_NO: callback_empty }  
           
   
       ],
       motivation: function() { for (var unit in this.units_assigned_to_the_command.all_units) },
       units_assigned_to_the_command:/*a subset of all units_available_for_action:/*every officer can request supplies, the requests are not chained should there be no supply line available and the commanders_in_chief deny freeing the supply line. The officer will request again later, maybe the request has more success this time. */
       {
           commanders_in_chief: [new CommanderInChief(AI.getLeadership().chooseHighestReputation(), [army_commander_assigned1, army_commander_assigned2])],
           //could also be another officer, decision will influence the sympathy towards the chosen officer if the officer was too low in the chain or army commanders dislike the commander.
           army_commanders: [
               new Commander(this.all_officers[]_assigned),
               new Commander(army_assigned).assignArmy(new Army(formations).addMission(new Mission(/**/))).assignGuard(entities/*formations, units*/) /*the base of the commander is determined by the army the commander is assigned to.*/)
           ],
           armies: [
               new Army(formations_assigned, army_commander, army_base/*military building*/,
                       [ new Mission(TYPE_ATTACK, TARGET_COORDINATES, TARGET_ENTITIES),
                         new Mission(TYPE_DEFEND, TARGET_COORDINATES, TARGET_ENTITIES, PRIORITY_HIGH)
                       ]
               )
           ],
           supplylines: [
               new SupplyLine([SUPPLY_GOODS_TYPE_SWORDS, SUPPLY_GOODS_TYPE_FOOD], target_entities/*_formation_or_unit_e.g._commander_or_building_ally_or_enemy_or_coordinates*/, target_coordinates /*for gathering material at one point.*/)
           ],

           formations: { new Formation(new FormationLeader(units_available_for_action.formation_leaders), army_formation_is_assigned_to) },
           formation_leaders: [new FormationLeader(), formation_Leader_Fitzgerald], /*officers assigned to formations*/
           all_officers: [new Officer(this.all_units[randomlyChosen]/*in new Officer() we register the officer in the ai.all_officers list too.*/)], /*all formation leaders but those officers that are not assigned anywhere too. default action might be to stay close to the commanding unit, i.e. fight around*/
           
           all_units: [/*a subset of all available/mobilized units ... the other units form the reserves or are assigned at other commands*/]
           
       }
        
        
   },
   
   
   




var callback_empty = function() {};



// TODO TODO DETERMINE IF IT's BETTER TO SEE AI AND TRIBE AS EQUAL AND IT IS EQUIVALENT I THINK AS THE AI HAS NO DECISION BUT THE TRIBE'S UNITS HAVE! A UNIT THEN CAN STILL CREATE ITS OWN TRIBE AT ANY TIME WITHOUT CARING IF AN AI IS AVAILABLE FOR TAKING CONTROL. THE UNIT WILL TURN INTO THE HIGH LEVEL AI. OR IS THIS EVEN NECESSARY? AI SHOULD BE MORE ABSTRACT, A BYPRODUCT. NOT REQUIRED FOR A TRIBE AND EXISTING ONLY ONCE IN THE TOTAL SIMULATION??  THE UNITS ITSELF FORM THE knowledge AND uniqueness. WHAT CURRENTLY IS CALLED AI THEN WOULD BE CALLED A TRIBE.
var situation = {
    
    ////PHASE
    /*high level mutual exclusive states*/ //<-- based on FACTS only.
    peacetime: { ministeries in peactime, decisions },
    wartime: { parent_state: non_existent, ministeries in wartime, decisions },
    
    peacetime: { economy, military, civil, welfare, trade, diplomacy, surrender, victory },/*examine all at the beginning*/

}
ai.SYMPATHY_MAX = 100;
ai.FRIENDLY_THRESHOLD = SYMPATHY_MAX / 2;



//TODO MAKE GLOBAL AND CALL ENTITY or AI? Then all other inherit from it and found_tribe would be called.
//TODO Extend the common-api/engine's tribe/owner/player implementation to keep it purely additive.
ai.Tribe/*Culture*/ = function(ai) {

    this.ais;//<-- read: the one in control. => allows AIs to change tribes, too! Not only humans can change them now!
    //this.joinedBy;<-- better not this way, rather make the ais share the decision making if they have joined efforts.
    this.tribesCaptured;  //<-- those the AI won over. and //<-- the beaten humans. (this way instead of this.aisCaptured the ais stay assigned to their original tribe and can be freed or retake control once the subdued tribes are freed.)
    
    /*Note: An AI that was victorious over another AI. being  joining another AI means the one that joined other one simply goes extinct, transfering all physical property and control, but not its AI capabilities.
      Contrarily an AI that merges into another AI will transfer all knowledge, too. That is, all decisionTrees will be merged.[of course when joining then the commanders and individual units that are taken over will not lose their decision trees/experience. The difference is the AI's decision tree and knowledge gained will be transferred.]
      TODO: Shall commands be merged in merged mode only? Or when joining too? ALL STATESETS HAVE TO BE MERGED TOO (so if an AI developed other states in an evolutionary way)!*/
    this.humans
}

var tribes = [new Tribe(new AI()), new Tribe(new AI())];
/**
 * A state has a list of new states that can be entered or actions that shall be executed (function calls ...).
 * This way its a multiple parent <--> multiple child tree. Because we can reach states in either direction. It's up to the AI designer to choose the possibilites or we have to use an algorithm that constantly experiments with those states too (genetic/evolutionary algorithm).
 */
ai.states = {//<-- could also be called:  commands, entities ...  or more accurate: a phase tree. Each phase has its state. (we hangle down the tree and the first state that meets the )
    /*the abstract command class all other commands/states the following inherits from*/

    ////PHASE
    /*END STATE*/
    non_existent: /*nothing*/, //<-- extinct state, the AI is no longer there, it is dead.
    
    /*BEGIN STATE*/
    non_founded: { /*parent: undefined, possibilities: { */ found_tribe, merge_with_other_tribe, join_other_tribe, founded /* } */ }, //<-- first we try to found a settlement. Should we not find territory after searching the complete world/map, then we will join another tribe. If one of both succeeded, we have an existence to live, hence are existent, and thus no longer in this state.(hard requirements for this state no longer met)

    found_tribe: function () {//<-- RANDOM (scout environment randomly) and FACTs (enough minimal distance to enemies and all resources found that are required for the next state?) Note: Building new a civ in enemy influence/territory is not possible (it is, but it will result in war).
        //var foundedTribe = false;
        //while (!foundedTribe) {
        var searchWholeMap = false;
        while (!searchedWholeMap) {
            
        }
        //}
    },
    merge_into_other_tribe: function() {//<-- this would make the AI disappear fusioning into a new AI. The units would still know which tribe they are from originally though. So they could change to another AI or defect to a human even. The sceptics and differences however decline with time (so the danger of rebellion lessens and the tribes become more coherent. I would like to express that by altering the colour of the colours, calculating it dynamically as a function the distance/loyality of the subdued tribe towards the other AI/tribe.
    //e.g. A green tribe that is subdued by a yellow tribe will turn more and more yellow while the yellow one also slowly turns towards the green hues. This way one could nicely see how much loyalty one had to expect from subdued troops. If the units individual loyality to the leadership is included in the not the colour but the brightness or hue of the colour/tone then one could distinguish even more and this would add another layer of strategy.:).
    //should one tribe go extinct then it's even thinkable that the tribe (read: all units belonging to this tribe) will declare independence under the control of the freed AI (whose tribe is being subdued now).
    //NOTE: As the subdued tribe is stored within the victorious tribe and the AI itself is stored within that tribe as a reference, it is still possible to regain control of this tribe later on.
    
        //var hasMerged;
        //while (!hasMerged) {<-- state machine reenters this function automatically if required => no endless loops within states!!
            for (var tribe in tribes) {/*global tribes on this map*/
                var average;
                if (tribe.sympathyTowards[ai] > FRIENDLY_THRESHOLD && ai.sympathyTowards[tribe] > FRIENDLY_THRESHOLD) {
                    leadership.
                }
            }
        //}
    },
    join_other_tribe: function() {//<-- as there currently is no own tribe, the other tribe would be managed by both AIs knowledge/decision trees.
        //var joinedOtherTribe = false;
        //while (!joinedOtherTribe) { <-- no endless loops anywhere but in the state machine. (decision making) It will handle it and reenter this state if it doesn't come up with other solutions.
            var bestFriend;
            for (var tribe in tribes) {/*global tribes on this map*/
                if (tribe.sympathyTowards[ai] > FRIENDLY_THRESHOLD && this/*ai*/.sympathyTowards[tribe] > FRIENDLY_THRESHOLD) {
                    if (!tribe || tribe.sympathyTowards[this/*ai*/] + this.sympathyTowards[tribe]
                }
            }
        //}
        //TODO no state setting a action? --> now added the founded state to the possibility list of non_founded: <possibility_list>.
        /*
        if (!joinedOtherTribe) {
            //either go extinct
            //this.stateMachine.currentState = non_existent;
            //or start all over again, perhaps now there is a piece of land free to settle on.
            this. stateMachine.currentState = non_founded;
        }
        */
    },
    
    founded: { is_founded,  }, 
    is_founded: function() {
        if (this.)
    }
    
    ////PHASE    
    /*government system states: ministries/councils*/
    headquarters: {},//<-- civic center
    
    
    
    economy:    { gather, build, recruit, expansion /*may lead to military action*/, research, defense, diplomacy /*may lead to military action*/ },
    
    gather:     { timber, harvest, milling, check_if_attacked },
    
    expansion:  { scouting, check_if_attacked, attack, diplomacy },
    
    military:   { recruit:
        function() {
            //if (AI.getCount(females) > AI.getCount(males)) {
                var difference = AI.getCount(females) - AI.getCount(males);
                AI.adjustRecruitRatioMaleFemale(AI.getRecruitRatioMaleFemale() + difference);/*automatically clipped to the max value*/
            //}
        };
   },
   
   
   
   recruit: function() { for (var building : ai.getAllBuildings()) { if (building && building.canRecruit() { for (var unit_type : bilding.getRecruitableUnitTypes(/*also checks for resources?*/) { if ( ai.senate.decisions.recruitment.unit_type_requests.containsUnitType(unit_type)) { unitCount = Math.min(ai.resources.wood/unit_type.cost.wood, ai.resources.metal/unit_type.cost.metal, ai.resources.stone/unit_type.cost.stone, ai.resources.food/unit_type.cost.food, (ai.populationLimit - ai.populationCount) / unit_type.units_required_to_operate, /*try to spread the units that are created evenly over all requested types(succeeds if enough resources available)*/Math.max( (ai.populationLimit - ai.populationCount) / ai.senate.decisions.recruitment.unit_type_requests.length, 1) ); if (unitCount > 0) { if (building.queue.add(new Contract(unit_type, unitCount))) { /*clear the request as it is fulfilled*/ai.senate.decisions.recruitment.unit_type_requests.removeUnitType(unit_type); } }  }   }    },
    ...

};






}(TAUCETI));/*relay further the scope wrapper*/
