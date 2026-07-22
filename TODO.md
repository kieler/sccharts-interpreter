# todo
## must
- [x] Transitions
- [x] Hierarchy
- [x] Weak and Strong Abort
	- Testing still required, but implemented
- [x] Connectors
	- very basic, the one thing is we want to impliicitly consider all outgoind connections as immediate, even if they aren't explicitly set to immediate.
- [x] Concurrency (logial) 
- [x] Actions
	- [x] Transition
	- [x] State
		- How is that with entry, during, exit as maybe?
		- Implemented entry, during, exit. testing needed, but should be working
- [x] Final + Initial States
	- I think they are done?

## mabybe
for the PoC, these should probably be left out unless it is easy.

- [/] Complex Final States
	- There is something working, the question is just if it is correct. I need to see some examples, because all except for actions can't be scheduled.
- [x] Entrance, Exit, During Actions
- [x] Deep History Transitions
	- ~~The JSON exporter needs support for them first~~
- [ ] Reference SCCharts
	- They are now in the KiCo JSON exporter
- [ ] Local Variables
	- Could also be done with some pre- or suffix for varibles in global scope?

## other
- [x] testing
	- [x] framework
	- [x] comparrison with hardcoded expected outputs
	- [x] use the compiled c version to compare dynamically
- [x] simulation interface
	- [x] basic via terminal
	- [x] something better
		- take stdin like the kico simulation
- [ ] exceptions
	- some states of the interpreter should raise and expection and throw and error.
	- [x] basic structure for that 
	- Explicitly what should throw an error: 
		- [x] Ending a tick in a connector
		- [ ] multiple inital stated
		- [ ] ...
	- [x] A Wonly (warning only) flag which is more leanient, does not throw an error upon encountering an illigal state, tries it's best and throws a warning, so the developer can deal with it

- Clocks?

## missing
- [ ] varible types
	- [ ] arrays
		- They need to be implmented in the json converter first
	- [ ] enums


## issues
Also see the blocklist for models that have unsupported features.

### bugs
- [ ] issues/ISSUE-GH14: final state should cause exit actions in super state
- [x] aas/pre/FinalPre: pre() function for actions?
- [x] ssm/statebased/lean/SBLoop: entering state should also allow immediate transitions in subgraphs to run
- [x] ssm/actions/ImmediateDuringRoot, ssm/actions/DuringRoot: If the root now doesn't have any nodes it srashes because of no initial node
- [x] als/various/null_check: str should have default initial value of null instead of ""
- [x] als/various/null_check: In string assignments letters can be replaced by variable values
- [x] aas/other/DataTypes: als/various/null_check, but it also applies to other literals like "false"
- [x] als/various/null_check: null != None (js v Python)
- [x] ssm/statebased/RBLS/DFT-abro4-exp: a bool is set to 0?
	- js + kico weirdness: false | false = 0 instead of false
- [ ] ssm/statebased/RBLS/DFT-abro4-exp: I don't know, some wrong assignements, gotta go through step by step
- [ ] als/abort_regions/timed_signal_immediate_test: No expression parsing during assignments


### featurs
- [ ] ssm/reference/ExternalReference, aas/referenced/SimpleRef, aas/referenced/AbortedRef, aas/referenced/BindLiteral, aas/referenced/RefDeep: Reference SCCharts

### schduling differences
- ssm/statebased/SBNested*: Similar to the ABO thing. Just that both sections "rely" on eachother and as such this doesnt work here
-

### other
- The KiCO Simulation (and compiled code, due to how it works) doesnt set non inputed variables as their 0-value but keeps the last, should i do that as well? It would be in interpreter/utils.py removing the default assignment in asignVariables.
	- If we do want to do signals, this would just be signals?
