grammar SCChart

entry SCTX:
  'scchart' name=ID '{'
   (elements+=Element)*
  '}';


State:
    isConnector?='connector'? type=('final'|'initial')? 'state' name=ID ('{' (actions+=Action)* (elements+=Element)* '}')?;

Variable:
    isInput?='input'? isOutput?='output'? type=VarType (assignments+=VariableAssignment ','?)*;

VariableAssignment:
    name=ID ('=' initialValue=Literal)?;

Transition:
    isImmediate?='immediate'? ('if' guard=ExpressionString)? ('do' action=ExpressionString)? type=('go'|'join'|'abort') 'to' target=[State:ID] (history?='history')?;

Action:
    isImmediate?='immediate'? type=('entry'|'during'|'exit') ('if' guard=ExpressionString)?  ('do' action=ExpressionString) ;

Region:
    'region' name=ID? ('{' (elements+=Element)* '}')?;


Element:
    State | Variable |Transition | Region;

terminal VarType : 'bool' | 'int' | 'float';

// We need to do some preprocessing
// add a # after ever if and do and before every go/join/abort and do
// and then with actions that dont have a go to at the end of the line.
// I hate langium or maybe I am too stupid to figure out how parse stuff like this with it...
terminal ExpressionString returns string: /\#([^\#\#]*)\#/;

terminal Literal: BOOL | FLOAT | INT | STRING;
terminal BOOL: 'true'|'false';
terminal FLOAT returns number: /[0-9]+\.[0-9]+/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"[^"]*"|'[^']*'/;

terminal ID returns string: /[_a-zA-Z0-9][\w_]*/;

hidden terminal WS: /\s+/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
