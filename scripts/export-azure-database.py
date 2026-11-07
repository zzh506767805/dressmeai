#!/usr/bin/env python3
"""Read-only PostgreSQL snapshot. Credentials and rows never go to stdout."""
import argparse,datetime,json,os,subprocess
from pathlib import Path
from urllib.parse import urlparse,parse_qs,unquote

parser=argparse.ArgumentParser();parser.add_argument('--out',required=True);args=parser.parse_args()
out=Path(args.out).resolve();out.mkdir(parents=True,exist_ok=True,mode=0o700);out.chmod(0o700)
r=subprocess.run(['az','staticwebapp','appsettings','list','-n','dressmeai','-g','出海去','-o','json'],capture_output=True,text=True,check=True)
settings=json.loads(r.stdout);settings=settings.get('properties',settings);p=urlparse(settings['DATABASE_URL'])
if p.hostname!='dressmeai-db.postgres.database.azure.com':raise SystemExit('Unexpected database; refusing export')
env=os.environ.copy();env.update(PGHOST=p.hostname,PGPORT=str(p.port or 5432),PGUSER=unquote(p.username or ''),PGPASSWORD=unquote(p.password or ''),PGDATABASE=p.path.lstrip('/'),PGSSLMODE=parse_qs(p.query).get('sslmode',['require'])[0],PGCONNECT_TIMEOUT='15',PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=60000')
tables=['User','Account','Session','VerificationToken','Payment','TryOnJob','SavedModelImage']
parts=["'%s', (SELECT coalesce(json_agg(t),'[]'::json) FROM (SELECT * FROM \"%s\" ORDER BY id)t)"%(t,t) for t in tables]
sql="BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT json_build_object('snapshot_utc', now(), 'tables', json_build_object(%s)); COMMIT;"%','.join(parts)
r=subprocess.run(['psql','-X','-q','-A','-t','-f','-'],input=sql,env=env,capture_output=True,text=True)
if r.returncode:raise SystemExit('Read-only export failed (credentials withheld)')
snapshot=json.loads(r.stdout.strip());target=out/'database.json';target.write_text(json.dumps(snapshot,ensure_ascii=False));target.chmod(0o600)
r=subprocess.run(['pg_dump','--format=custom','--file',str(out/'postgres.dump')],env=env,capture_output=True,text=True)
backup_format='postgres_custom_dump'
if r.returncode:
    # Older local pg_dump cannot read a newer Azure server. Preserve a complete,
    # restorable schema + data script instead of leaving a misleading empty dump.
    schema=subprocess.run(['npx','prisma','migrate','diff','--from-empty','--to-schema-datamodel','prisma/azure-schema.prisma','--script'],capture_output=True,text=True,check=True).stdout
    def literal(value):
        if value is None:return 'NULL'
        if isinstance(value,bool):return 'TRUE' if value else 'FALSE'
        if isinstance(value,(int,float)):return str(value)
        return "'"+str(value).replace("'","''")+"'"
    restore=schema+'\n'
    for table in tables:
        for row in snapshot['tables'][table]:
            restore+='INSERT INTO "'+table+'" ('+','.join('"'+key+'"' for key in row)+') VALUES ('+','.join(literal(value) for value in row.values())+');\n'
    target=out/'postgres-restore.sql';target.write_text(restore);target.chmod(0o600)
    backup_format='schema_and_data_sql'
else:(out/'postgres.dump').chmod(0o600)
print(json.dumps({'snapshot_utc':snapshot['snapshot_utc'],'tables':{t:len(snapshot['tables'][t]) for t in tables},'backup_format':backup_format,'backup_directory':str(out)},ensure_ascii=False))
