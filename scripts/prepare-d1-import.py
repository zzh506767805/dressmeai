#!/usr/bin/env python3
"""Convert the private source snapshot to SQLite and verify relational integrity."""
import argparse,datetime,json,sqlite3
from pathlib import Path
from urllib.parse import quote,urlparse
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--base-url',required=True);args=p.parse_args()
source=Path(args.source).resolve();snapshot=json.loads((source/'database.json').read_text());manifest=json.loads((source/'image-manifest.json').read_text());mapping={entry['sourceUrl']:args.base_url.rstrip('/')+'/api/image?key='+quote(entry['key'],safe='') for entry in manifest}
date_fields={'createdAt','updatedAt','emailVerified','subscriptionExpiry','expires'}
missing=set();mapped=0

def literal(value):
 if value is None:return 'NULL'
 if isinstance(value,bool):return '1' if value else '0'
 if isinstance(value,(int,float)):return str(value)
 return "'"+str(value).replace("'","''")+"'"

statements=[]
for table,rows in snapshot['tables'].items():
 for raw in rows:
  row=dict(raw)
  for field,value in row.items():
   if field in date_fields and value:
    normalized_date=value.replace('Z','+00:00')
    import re
    normalized_date=re.sub(r'\.(\d{1,5})(?=$|[+-])',lambda m:'.'+m.group(1).ljust(6,'0'),normalized_date)
    date=datetime.datetime.fromisoformat(normalized_date)
    if date.tzinfo is None:date=date.replace(tzinfo=datetime.timezone.utc)
    row[field]=date.astimezone(datetime.timezone.utc).isoformat(timespec='milliseconds')
   elif field.endswith('Url') and value:
    normalized=value.split('?')[0]
    if normalized in mapping:row[field]=mapping[normalized];mapped+=1
    elif '.blob.core.windows.net/' in value:missing.add(value)
  columns=','.join('"'+key+'"' for key in row)
  statements.append('INSERT INTO "'+table+'" ('+columns+') VALUES ('+','.join(literal(v) for v in row.values())+');')
if missing:
 (source/'missing-image-urls.json').write_text(json.dumps(sorted(missing)))
sql='\n'.join(statements)+'\n';(source/'d1-import.sql').write_text(sql);(source/'d1-import.sql').chmod(0o600)
checkfile=source/'import-check.sqlite'
if checkfile.exists():raise SystemExit('Verification DB exists; choose a fresh snapshot directory')
db=sqlite3.connect(checkfile);db.execute('PRAGMA foreign_keys=ON');db.executescript(Path('prisma/d1-migrations/0001_initial.sql').read_text());db.executescript(sql)
counts={table:db.execute('SELECT count(*) FROM "'+table+'"').fetchone()[0] for table in snapshot['tables']}
assert counts=={table:len(rows) for table,rows in snapshot['tables'].items()}
assert not db.execute('PRAGMA foreign_key_check').fetchall()
original_credits=sum(row['credits'] for row in snapshot['tables']['User']);assert db.execute('SELECT sum(credits) FROM User').fetchone()[0]==original_credits
summary={'tables':counts,'mapped_image_references':mapped,'missing_azure_urls':len(missing),'source_credit_total':original_credits,'foreign_keys':'passed','count_and_credit_checks':'passed','base_url':args.base_url}
(source/'import-summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary))
