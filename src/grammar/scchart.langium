grammar SCChart

entry SCTX:
  ('import' imports+=(STRING|ID))*
  ('scchart' charts+=Chart)*;

Chart:
    name=ID STRING? '{' (elements+=(Element|Region))* '}';

State:
    isConnector?='connector'? isInitial?='initial'? isFinal?='final'? 'state' name=ID (('{' (actions+=Action)* (elements+=(Element|Region))* '}')|'is' reference=ID'(' (refAssignments+=RefVariableAssignment ','?)* ')')? (transitions+=Transition)*;

RefVariableAssignment:
    to=(ID|Literal) ('to' from=ID)?;

Variable:
    'const'? isInput?='input'? isOutput?='output'? type=VarType assignments+=VariableAssignment (',' assignments+=VariableAssignment)*;

VariableAssignment:
    name=ID ('['cardinalities+=INT']')* ('=' initialValue=ExpressionString)?;

Transition:
    isImmediate?='immediate'? ('if' guard=ExpressionString)? ('do' action=ExpressionString)? type=('go'|'join'|'abort') 'to' target=[State:ID] (history?='history')?;

Action:
    ('weak'|'strong')? isImmediate?='immediate'? type=('entry'|'during'|'exit') ('if' guard=ExpressionString)?  ('do' action=ExpressionString) ;

Region:
    'final'? 'region' name=(ID|STRING)? (('{' (elements+=(Element|Region))* '}')?|':' (elements+=Element)* );

// Region is separated out because of the "region A:" sytax.
// It does the region until the next region, so it has to separate,
// otherwise it can end at first state in a region
Element:
    State | Variable | Action;

terminal VarType : 'bool' | 'int' | 'float' | 'string';

// We need to do some preprocessing
// add a # after every if and do and before every go/join/abort and do
// and then with actions that dont have a go to at the end of the line.
terminal ExpressionString returns string: /\#([^\#\#]*)\#/;

terminal BOOL: 'true'|'false';
terminal FLOAT returns number: /[0-9]+\.[0-9]+/;
terminal INT returns number: /[0-9]+/;
terminal STRING returns string: /"[^"]*"|'[^']*'/;
terminal Literal: BOOL | FLOAT | INT | STRING;

terminal ID returns string: /[_a-zA-Z0-9][\w]*/;

hidden terminal WS: /\s+/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
