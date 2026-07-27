grammar SCChart

entry SCTX:
  'scchart' name=ID '{'
   (elements+=Element)*
  '}';


State:
    isConnector?='connector'? type=('final' | 'initial')? 'state' name=ID ('{' (actions+=Action)* (elements+=Element)* '}')?;

Variable:
    isInput?='input'? isOutput?='output'? type=BuiltinType name+=ID ('=' initialValue+=Literal)? (',' name+=ID ('=' initialValue+=Literal)?)*;

Transition:
    isImmediate?='immediate'? ('if' guard=Expression)? ('do' action=Expression)? type=('go'|'join'|'abort') 'to' target=[State:ID];

Region:
    'region' name=ID? ('{' (elements+=Element)* '}')?;

Action:
    isImmediate?='immediate'? type=('entry'|'during'|'exit') ('if' guard=Expression)?  ('do' action=Expression) ;

Element:
    State | Variable |Transition | Region;

Expression:
    var=ID ('='|'=='|'+='|'-='|'*='|'/='|'>'|'<'|'>='|'<='|'++'|'--')? Literal? ';'? Expression?;

terminal BuiltinType : 'bool' | 'int' | 'float';

terminal Literal: BOOL | FLOAT |INT ;
terminal BOOL: 'true'|'false';
terminal INT returns number: /[0-9]+/;
terminal FLOAT returns number: /[0-9]+\.[0-9]+/;

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z0-9][\w_]*/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;
