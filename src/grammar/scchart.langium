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
    isImmediate?='immediate'? ('if' guard=GuardExpression)? ('do' action=ActionExpression)? type=('go'|'join'|'abort') 'to' target=[State:ID] (history?='history')?;

Action:
    isImmediate?='immediate'? type=('entry'|'during'|'exit') ('if' guard=GuardExpression)?  ('do' action=ActionExpression) ;

Region:
    'region' name=ID? ('{' (elements+=Element)* '}')?;


Element:
    State | Variable |Transition | Region;

Expression:
    SimpleExpression (op=AllOP right=SimpleExpression?);
SimpleExpression:
    value=(Literal|ID) | '(' (inner1=Expression op2=AllOP inner2=Expression) ')';
ActionExpression:
    actions+=Expression (';' actions+=Expression)*;
GuardExpression:
    guards+=Expression (BooleanOP guards+=Expression)*;

terminal AllOP: ' '? BooleanOP|OP ' '?;
terminal BooleanOP: '&&'|'||'|'=='|'>='|'>'|'<='|'<';
terminal OP: '--'|'++'|'+='|'-='|'*='|'/='|'+'|'-'|'*'|'/'|'=';

terminal VarType : 'bool' | 'int' | 'float';

terminal Literal: BOOL | FLOAT | INT | STRING;
terminal BOOL: 'true'|'false';
terminal FLOAT returns number: /[0-9]+\.[0-9]+/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"[^"]*"|'[^']*'/;

terminal ID returns string: /[_a-zA-Z0-9][\w_]*/;

hidden terminal WS: /\s+/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

