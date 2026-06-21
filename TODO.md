# todo
## proof of concept
(PoC)

### must
- [x] Transitions
- [x] Hierarchy
- [x] Weak and Strong Abort
	- Testing still required, but implemented
- [?] Connectors
	- Connectors are only really in the compiler, the JSON doesn't haven them anymore, so they are probably not explicitly needed in the interpreter
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
- [ ] testing
	- [x] framework
	- [x] comparrison with hardcoded expected outputs
	- [ ] use the compiled c version to compare dynamically
- [ ] simulation interface
	- [x] basic via terminal
	- [ ] something better
		- for the PoC this might be enough

## later
