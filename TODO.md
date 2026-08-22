# todo
## must
- [x] Transitions
- [x] Hierarchy
- [x] Weak and Strong Abort
- [x] Connectors
- [x] Concurrency (logial) 
- [x] Actions
	- [x] Transition
	- [x] State
- [x] Final + Initial States

## mabybe
for the PoC, these should probably be left out unless it is easy.

- [x] Complex Final States
<<<<<<< HEAD
	- There is something working, the question is just if it is correct. I need to see some examples, because all except for actions can't be scheduled.
- [x] Entrance, Exit, During Actions
- [x] Deep History Transitions
	- ~~The JSON exporter needs support for them first~~
- [x] Reference SCCharts
	- They are now in the KiCo JSON exporter
=======
- [x] Entrance, Exit, During Actions
- [x] Deep History Transitions
- [x] Reference SCCharts
>>>>>>> v1
- [ ] Local Variables
	- Could also be done with some pre- or suffix for varibles in global scope?
	- Maybe one could use something like the scope thing I added to the transition resolution. variables could have a scope and then we take the one that is in the same scope as the current node (or above). If I use the current getScope() this could literaly be: if scopeVar in scopeNode: use variable (checnking the deepest/longest scopes first).
	- They would currently break the testing. The results are correct as long as the variables don't share a name, but KiCo does some name prefixing and so the stdout parser doesn't work properly.

## other
- [x] testing
	- [x] framework
	- [x] comparrison with hardcoded expected outputs
	- [x] use the compiled c version to compare dynamically
- [x] simulation interface
	- [x] basic via terminal
	- [x] something better
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
	- [x] arrays
		- ~~They need to be implmented in the json converter first~~
	- [ ] enums


## issues
Also see the blocklist for models that have unsupported features.

### bugs
- [x] issues/ISSUE-GH14: final state should cause exit actions in super state
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
    - scheduling porbably
- [x] als/various/const_float_computation: No expression parsing during assignments
- [ ] Vector expressions:
	- kolja/VectorValueExpressions01.ktrace, for vectors
	- kolja/VectorValueExpressions02.ktrace, 2 * {{4} * 3} gets evaluated to 24, because js doesn't support that sytax like python 
	- kolja/VectorValueExpressions03.ktrace
	- als/various/computed_vector.ktrace: [1 to 4] -> {1,2,3,4}
- [x] ~~ssm/reference/ExternalReference: When the sctx file just has `inc(O,O)` instead of `inc(O to O,I to O)` the json exporter turns that to `null to O`, which then causes problems.~~
    - This is goig to get fixed on KiCo level
- [ ] aas/referenced/BindLiteral: binding literals for references like `SubChart(true to in , O to out)`
- [ ] kolja/ArrayAssignmentActions.ktrace: The js evaluator turns [1,2]+[1,2] into '1,21,2' so adding arrays element wise breaks the thinga
- [ ] kolja/ArrayAssignmentActions.ktrace: When assigning array values from other arrays it doesn't work proplery in the same tick. In the following tick, it seems to work fine. I probably need to split up the action function.

### featurs
- [x] ssm/reference/ExternalReference, aas/referenced/SimpleRef, aas/referenced/AbortedRef, aas/referenced/BindLiteral, aas/referenced/RefDeep: Reference SCCharts
    - [x] It works, but the tests all use "in" as a variable name, which crashes the parser, because it is a js keyword.

### schduling differences
- ssm/statebased/SBNested*: Similar to the ABO thing. Just that both sections "rely" on eachother and as such this doesnt work here
-

### other
- The KiCO Simulation (and compiled code, due to how it works) doesnt set non inputed variables as their 0-value but keeps the last, should i do that as well? It would be in interpreter/utils.py removing the default assignment in asignVariables.
	- If we do want to do signals, this would just be signals?

Reference Charts can be of models in the same file.

For Daniel: The KiCo sctx2json swallows local variables if the variables are declared in a regiom instead of state.

Local variables are named something like: local_region1_A in the simulation so the tests can fail, luckily most tests dont use local variables.

If an action assigns a variable that doesn't exist, the interpreter is happy to create it. should that be a warning / error?

- Commenting and documenting the code.
