blocked_dirs = [
    "aas/arrays",  # arrays
    "aas/referenced/arrays",  # arrays
    "aas/signal",  # signals
    "als/hostcode",  # hostcode
    "als/inheritance",  # inheritance
    "als/enums",  # enums
    "als/loops",  # loops
    "als/generics",  # generics
    "als/classes",  # classes
    "als/methods",  # methods
    "ssm/cast",  # dataflow
    "ssm/dataflow",  # dataflow
    "ssm/followed-by",  # followed-by what is "->" this tick then next tick?
    "als/timed_automata",  # clocks
    "als/history",  # shallow history and deferred
]

blocklist = [
    # Vectors
    "VectorValueExpressions01.ktrace",
    "VectorValueExpressions02.ktrace",
    "VectorValueExpressions03.ktrace",
    "computed_vector.ktrace",
    "VectorNotation.ktrace",
    # deferred transitions
    "shallow_deferred.ktrace",
    "deep_deferred.ktrace",
    "DeferredCycleBreaker.ktrace",  # also clock
    # suspend
    "weak_suspend_simple.ktrace",
    "KISEMA-1241.ktrace",
    "KISEMA-1241-2.ktrace",
    "KISEMA-1241-3.ktrace",
    # dataflow
    "DF-0032c.ktrace",
    "DF-0311h.ktrace",
    "DF-0032c.ktrace",
    "DF-0032d.ktrace",
    "DF-0004d.ktrace",
    "DataflowReference.ktrace",
    "BindingShadowsLocalIndex.ktrace",
    "PR02.ktrace",
    "PR03.ktrace",
    "PR03b.ktrace",
    "BindingShadowsLocal.ktrace",
    # array
    "ArrayAssignmentActions.ktrace",
    "ArrayAssignment.ktrace",
    "ArrayAssignmentActions.ktrace",
    "const_array.ktrace",
    "PreOnArray.ktrace",
    "MultiDimArray.ktrace",
    # signals
    "KISEMA-1595-1.ktrace",
    "KISEMA-1595-2.ktrace",
    "KISEMA-1595-3.ktrace",
    "minimal-chain.ktrace",
    "ConditionalExit.ktrace",
    # schedule
    "One5.ktrace",
    "One8.ktrace",
    "One9.ktrace",
    # count delay
    "termination_countdelay.ktrace",
    # other
    "timed_signal_immediate_test.ktrace",  # the vs code extension gives me a sytax error
    "Controller.ktrace",  # Steam boiler, idk
]
