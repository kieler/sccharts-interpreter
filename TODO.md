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
	- There is something working, the question is just if it is correct. I need to see some examples, because all except for actions can't be scheduled.
- [x] Entrance, Exit, During Actions
- [x] Deep History Transitions
	- ~~The JSON exporter needs support for them first~~
- [x] Reference SCCharts
	- They are now in the KiCo JSON exporter
- [x] Entrance, Exit, During Actions
- [x] Deep History Transitions
- [x] Reference SCCharts
- [x] Local Variables
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
		- [x] using undeclared variables
			- Error or warning?
		- [ ] ...
	- [x] A Wonly (warning only) flag which is more leanient, does not throw an error upon encountering an illigal state, tries it's best and throws a warning, so the developer can deal with it

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
	- Do we want to support this? Maybe not.
	- [ ] kolja/VectorValueExpressions01.ktrace, 2 * {{4} * 3} gets evaluated to 24, because js doesn't support that sytax like python 
	- [ ] kolja/VectorValueExpressions02.ktrace
	- [ ] kolja/VectorValueExpressions03.ktrace, in addition this also has + as concat, like python
	- [x] als/various/computed_vector.ktrace: [1 to 4] -> {1,2,3,4}
- [x] ~~ssm/reference/ExternalReference: When the sctx file just has `inc(O,O)` instead of `inc(O to O,I to O)` the json exporter turns that to `null to O`, which then causes problems.~~
    - This is goig to get fixed on KiCo level
- [x] aas/referenced/BindLiteral: binding literals for references like `SubChart(true to in , O to out)`
	- Create a fake vaiable that has that value and should not be touched by any actions and such should never not be the literal
- [ ] kolja/ArrayAssignmentActions.ktrace: The js evaluator turns [1,2]+[1,2] into '1,21,2' so adding arrays element wise breaks the thing
	- Same as the VectorValueExpressions: Do we even want to support this? 
- [ ] kolja/ArrayAssignment.ktrace: When assigning array values from the same array it doesn't work in the same tick. 
	- Why does this exist?
	- Do we want to support this? I don't think so.
- [ ] When reseting the model that was compiled in the browser the tick buttons still are grayed out. I assume that if the model is compiled instead of uploaded, it isn't stored so the reset can load it.
- [x] If an action assigns a variable that doesn't exist, the interpreter is happy to create it. should that be a warning / error?
	- Also see above in "exceptions"
- [ ] Local variables are named something like: local_region1_A in the simulation so the tests
int test[4] can fail, luckily most tests dont use local variables.
- [x] aas/arrays/IndexVariable2.ktrace: O[i[0]] throws an error, because "i" is not a number (see action parser ~l.103)
- [x] tests/Ref: If the model is converted to json with KiCo, the model doesn't build in the interpreter, because Sub34 is not found. 
- [x] tests/Ref: The model doesn't properly terminate
- [x] tests/langium_Ref: When calling it via the cli, it cant find 'langium_Ref.sctx' (because it doesn't exist). So this needs to change that if it is called from a json, it doens't change the path to sctx.

### features
- [x] ssm/reference/ExternalReference, aas/referenced/SimpleRef, aas/referenced/AbortedRef, aas/referenced/BindLiteral, aas/referenced/RefDeep: Reference SCCharts
    - [x] It works, but the tests all use "in" as a variable name, which crashes the parser, because it is a js keyword.
- [x] Reference Charts can be of models in the same file.
	- also deal with the 'import' statements when converting with langium
- [x] converting sctx2json should automatically do it recursively for reference charts

### scheduling differences
- ssm/statebased/SBNested*: Similar to the ABO thing. Just that both sections "rely" on eachother and as such this doesnt work here

### other
- [ ] Commenting and documenting the code.
- [ ] Go through as many models in the models repo as possible to have many test. Also with random inputs to see what works and what doesn't.
- [ ] Maybe do an optional debugging web view with a semi-interactive graph of the model. Basic would be ugly, but maybe we can use ELK?
- [x] Redo the testing to not use an api, but just the cli. The cli now allows the inputs all at once again. This should fix some stuff and make things with references easier.
	- [x] random inputs
	- [x] get all the tests to the new version
- [ ] The API server still seems useful, so make it better, especially with response codes.
	- [ ] 501 Multi File Reference Charts not implemented / supported

### for daniel
- [x] ~~For Daniel: The KiCo sctx2json swallows local variables if the variables are declared in a region instead of state.~~ 
	- This is kind of intentional, regions dont have variables in the json schema
- [ ] aas/referenced/arrays/bind-array-and-index/MainChart.sctx: when compiling it binds 'A[3] to A' and my interpreter does not like that. That's also the test that fails with KiCo json but not with my converter (because my converter just does 'A to A').

### notes
- no dataflow, because it is not model order
	- sören's dissertation has something on that
- qualitativ documentation of how to rewrite models to make them work
