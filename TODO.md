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
- [x] Entrance, Exit, During Actions
- [x] Deep History Transitions
- [x] Reference SCCharts
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
- [ ] als/various/const_float_computation: No expression parsing during assignments
- [x] ssm/reference/ExternalReference: When the sctx file just has `inc(O,O)` instead of `inc(O to O,I to O)` the json exporter turns that to `null to O`, which then causes problems.
    - This is goig to get fixed on KiCo level
- [ ] aas/referenced/BindLiteral: binding literals for references like `SubChart(true to in , O to out)`


### featurs
- [x] ssm/reference/ExternalReference, aas/referenced/SimpleRef, aas/referenced/AbortedRef, aas/referenced/BindLiteral, aas/referenced/RefDeep: Reference SCCharts
    - [x] It works, but the tests all use "in" as a variable name, which crashes the parser, because it is a js keyword.

### schduling differences
- ssm/statebased/SBNested*: Similar to the ABO thing. Just that both sections "rely" on eachother and as such this doesnt work here
-

### other
- Reference Charts can be of models in the same file.
