# todo
## proof of concept
(PoC)

### must
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

### mabybe
for the PoC, these should probably be left out unless it is easy.

- [ ] Complex Final States
- [x] Entrance, Exit, During Actions
- [ ] Reference SCCharts
- [ ] History Transitions
	- Only deep?
- [ ] Local Variables
	- Could also be done with some pre- or suffix for varibles in global scope?

### other
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
	- [ ] basic structure for that 
	- Explicitly what should throw an error: 
		- [ ] Ending a tick in a connector
		- [ ] multiple inital stated
		- [ ] ...
	- [ ] A Wonly (warning only) flag which is more leanient, does not throw an error upon encountering an illigal state, tries it's best and throws a warning, so the developer can deal with it


## later
