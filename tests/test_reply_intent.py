import io
import json
import unittest
from unittest.mock import patch
import serve
from tools.reply_intent import request_text, payload, parse_result


class ReplyIntentTests(unittest.TestCase):
 def test_bounded_input_and_strict_output(self):
  for bad in [None, {}, {'text': 1}, {'text': 'x', 'chance': 100}, {'text': ' '}, {'text': '字'*121}, {'text': '😀'*61}]:
   with self.assertRaises(ValueError):request_text(bad)
  self.assertEqual(request_text({'text': '  我\n不认识你  '}), '我 不认识你')
  for bad in [{'intent':'identity','success':True}, {'intent':'invent'}, {'intent':['identity']}, []]:
   with self.assertRaises(ValueError):parse_result({'choices':[{'message':{'content':json.dumps(bad)}}]})
  self.assertEqual(parse_result({'choices':[{'message':{'content':'{"intent":"connection"}'}}]}), {'intent':'connection'})
  p=payload('县令是我表舅');self.assertEqual(p['model'],'deepseek-v4-flash');self.assertEqual(p['temperature'],0)
  self.assertEqual(json.loads(p['messages'][1]['content']),{'text':'县令是我表舅'})

 def test_http_contract_limits_origin_and_upstream_fields(self):
  seen=[]
  def request(body,headers=None):
   raw=json.dumps(body).encode();handler=object.__new__(serve.Server)
   handler.path='/api/reply-intent';handler.client_address=('127.0.0.1',12345)
   handler.headers={'Host':'127.0.0.1:8092','Content-Length':str(len(raw)),**(headers or {})};handler.rfile=io.BytesIO(raw)
   handler.reply=lambda status,data:(status,data)
   return handler.do_POST()
  def upstream(req,timeout):
   seen.append((json.loads(req.data),timeout))
   return io.BytesIO(json.dumps({'choices':[{'message':{'content':'{"intent":"explain"}'}}]}).encode())
  try:
   serve.reply_calls.clear()
   with patch.object(serve,'setting',side_effect=lambda key,default='':'test-key' if key=='LLM_API_KEY' else default),patch.object(serve.urllib.request,'urlopen',side_effect=upstream):
    self.assertEqual(request({'text':'我追包子来的'})[1],{'intent':'explain'})
    self.assertEqual(request({'text':'一句','state':{'money':100}})[0],400)
    self.assertEqual(request({'text':'字'*121})[0],400)
    self.assertEqual(request({'text':'一句'},{'Origin':'https://unrelated.example'})[0],403)
    self.assertEqual(len(seen),1);self.assertEqual(seen[0][1],8)
    serve.reply_calls.extend([serve.time.monotonic()]*12)
    self.assertEqual(request({'text':'一句'})[0],429)
   with patch.object(serve,'setting',return_value=''):
    self.assertEqual(request({'text':'一句'})[0],503)
  finally:
   serve.reply_calls.clear()

if __name__=='__main__':unittest.main()
