blocked_dirs = [
    "aas/arrays",  # arrays
    "aas/referenced/arrays",  # arrays
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
]

blocklist = [
    # Vectors
    "VectorValueExpressions01.ktrace",
    "VectorValueExpressions02.ktrace",
    "VectorValueExpressions03.ktrace",
    # deffered transitions
    "shallow_deferred.ktrace",
    "deep_deferred.ktrace",
    # suspend
    "weak_suspend_simple.ktrace",
    "KISEMA-1241.ktrace",
    # dataflow
    "DF-0032c.ktrace",
    "DF-0311h.ktrace",
    "DF-0032c.ktrace",
    "DF-0032d.ktrace",
    "DF-0004d.ktrace",
    # array
    "ArrayAssignmentActions.ktrace",
    "ArrayAssignment.ktrace",
    # signals
    "KISEMA-1595-1.ktrace",
    "KISEMA-1595-2.ktrace",
    "KISEMA-1595-3.ktrace",
]
