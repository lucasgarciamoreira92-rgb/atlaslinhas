"""Exercise the production SQL against SQLite, including stale revisions."""
import sqlite3,json,re
from pathlib import Path
conn=sqlite3.connect(':memory:')
for migration in sorted(Path('drizzle').glob('*.sql')):conn.executescript(migration.read_text())
source=Path('app/api/lines/route.ts').read_text()
update=re.search(r'prepare\("(UPDATE lines.*?)"\)',source).group(1)
insert=re.search(r'prepare\("(INSERT INTO lines.*?)"\)',source).group(1)
audit=re.search(r"prepare\('(INSERT INTO history.*?)'\)",source).group(1)
settings=Path('app/api/settings/route.ts').read_text()
valid=re.search(r'const valid="(.*?)";',settings).group(1)
settings_update=re.search(r'prepare\(`(UPDATE settings.*?)`\)',settings).group(1).replace('${valid}',valid)
devices=json.dumps([{'id':'d1','slots':['eSIM']}])
conn.execute('INSERT INTO settings VALUES(?,?,?)',('main','{}',1))
def create(id,number,revision=1):
    return conn.execute(insert,(id,number,'d1','eSIM','{}',1,'t1',revision)).rowcount
assert create('a','55999990001')==1
conn.execute(audit,('event1','{}','a','t1',1))
assert conn.execute('SELECT count(*) FROM history').fetchone()[0]==1
assert create('stale','55999990002',0)==0
try:create('occupied','55999990002')
except sqlite3.IntegrityError:pass
else:raise AssertionError('slot collision accepted')
assert conn.execute(settings_update,('{}',2,'main',1,json.dumps([]))).rowcount==0
assert conn.execute(settings_update,('{}',2,'main',1,json.dumps([{'id':'d1','slots':['Slot 1']}]))).rowcount==0
assert conn.execute(settings_update,('{}',2,'main',1,devices)).rowcount==1
assert conn.execute(update,('55999990001',None,None,'{}',2,'t2','a',1,1)).rowcount==0
conn.execute(audit,('no-event','{}','a','t2',2))
assert conn.execute('SELECT count(*) FROM history').fetchone()[0]==1
assert conn.execute(update,('55999990001',None,None,'{}',2,'t2','a',1,2)).rowcount==1
conn.execute(audit,('event2','{}','a','t2',2))
assert conn.execute('SELECT count(*) FROM history').fetchone()[0]==2
assert conn.execute(update,('55999990001',None,None,'{}',2,'t3','a',1,2)).rowcount==0
assert create('b','55999990002',2)==1
try:create('duplicate','55999990001',2)
except sqlite3.IntegrityError:pass
else:raise AssertionError('duplicate number accepted')
conn.commit()
try:
    with conn:
        conn.execute(update,('55999990001',None,None,'changed',3,'t4','a',2,2))
        conn.execute(audit,('event1','{}','a','t4',3))
except sqlite3.IntegrityError:pass
assert conn.execute("SELECT version FROM lines WHERE id='a'").fetchone()[0]==2
print('SQLite: conflitos, vínculo atômico, liberação de slot e rollback do histórico verificados.')
