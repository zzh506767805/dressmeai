import contextlib,hashlib,io,json,runpy,sys,tempfile,unittest,urllib.error
from pathlib import Path
from unittest.mock import patch
from urllib.parse import unquote

class TransferTest(unittest.TestCase):
    def run_transfer(self, conflict=False):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);source=root/'snapshot';source.mkdir()
            config=root/'Library/Preferences/.wrangler/config';config.mkdir(parents=True)
            (config/'default.toml').write_text('oauth_token = "synthetic-test-token"')
            entries=[]
            for name,body in [('a.jpg',b'image-a'),('b.jpg',b'image-b')]:
                (source/name).write_bytes(body);entries.append({'file':name,'key':'legacy/'+name,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'contentType':'image/jpeg'})
            (source/'image-manifest.json').write_text(json.dumps(entries));remote={'legacy/a.jpg':b'conflicting-image'} if conflict else {};puts=[]
            class Response:
                def __init__(self,body):self.body=body
                def __enter__(self):return self
                def __exit__(self,*args):pass
                def read(self):return self.body
            def urlopen(request,timeout):
                key=unquote(request.full_url.split('/objects/',1)[1])
                self.assertEqual(request.get_header('Authorization'),'Bearer synthetic-test-token')
                if request.method=='PUT':remote[key]=request.data;puts.append(key);return Response(b'')
                if key not in remote:raise urllib.error.HTTPError(request.full_url,404,'Missing',{},io.BytesIO())
                return Response(remote[key])
            args=['upload-r2-images.py','--source',str(source),'--account-id','test-account','--bucket','test-bucket']
            with patch.object(Path,'home',return_value=root),patch('urllib.request.urlopen',side_effect=urlopen),patch.object(sys,'argv',args),contextlib.redirect_stdout(io.StringIO()):
                if conflict:
                    with self.assertRaisesRegex(RuntimeError,'refusing overwrite'):runpy.run_path('scripts/upload-r2-images.py',run_name='__main__')
                    self.assertNotIn('legacy/a.jpg',puts);self.assertEqual(remote['legacy/a.jpg'],b'conflicting-image')
                else:
                    runpy.run_path('scripts/upload-r2-images.py',run_name='__main__')
                    self.assertEqual(len(puts),2)
                    runpy.run_path('scripts/upload-r2-images.py',run_name='__main__')
                    self.assertEqual(len(puts),2)
                    saved=json.loads((source/'r2-verified-test-account-test-bucket.json').read_text())
                    self.assertEqual(len(saved),2)
    def test_upload_download_checksum_and_safe_resume(self):self.run_transfer()
    def test_conflict_is_not_overwritten(self):self.run_transfer(True)

if __name__=='__main__':unittest.main()
