#!/bin/bash

# Source: https://www2.sqlite.org/cvstrac/wiki?p=ConverterTools

if [[ -z "$1" ]]; then
  echo "Usage: $0 <dbname>"
  exit 1
fi

if [[ ! -e "$1" ]]; then
  echo "$1 does not exist. Please provide a valid MySQL dump"
  exit 1
fi

rm -f "$1.sqlite.sql"

cat $1 |
grep -v '^/\*![0-9]* ' |
grep -v '^SET ' |
grep -v '^LOCK TABLES' |
grep -v '^UNLOCK TABLES' |
grep -v '^\-\- Dump completed' |
grep -v '^\-\- Host:' |
grep -v '^\-\- Server version' |
grep -v ' KEY "' |
grep -v ' UNIQUE KEY "' |
grep -v ' PRIMARY KEY ' |
sed 's/ unsigned / /g' |
sed 's/ auto_increment/ primary key autoincrement/gi' |
sed 's/ smallint([0-9]*) / integer /gi' |
sed 's/ tinyint([0-9]*) / integer /gi' |
sed 's/ int([0-9]*) / integer /gi' |
sed 's/ character set [^ ]* / /gi' |
sed 's/ collate [^ ]* / /gi' |
sed 's/ COLLATE [^ ]* / /gi' |
sed 's/ enum([^)]*) / varchar(255) /gi' |
sed 's/ on update [^,]*//gi' |
sed -E 's/) ENGINE=[^;]*;/);/g' |
sed -E 's/) DEFAULT CHARSET=[^;]*;/);/g' |
sed -E 's/) COLLATE=[^;]*;/);/g' |
perl -e 'local $/;$_=<>;s/,\n\)/\n\)/gs;print "begin;\n";print;print "commit;\n"' |
perl -pe '
if (/^(INSERT.+?)\(/) {
  $a=$1;
  s/\\'\''/'\''/g;
  s/\\n/\n/g;
  s/\),\(/\);\n$a\(/g;
}
' > $1.sqlite.sql

