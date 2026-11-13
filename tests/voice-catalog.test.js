import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chapterVoiceCatalog} from '../tools/voice_catalog.mjs';
import {voiceRequest} from '../src/npc-voice.js';

test('offline v2 catalog is deterministic, deduplicated, spoken and explicitly cast',()=>{
 const rows=chapterVoiceCatalog(),config=JSON.parse(readFileSync(new URL('../assets/audio/voice-cast.json',import.meta.url)));
 assert.deepEqual(rows,chapterVoiceCatalog());
 const signatures=rows.map(row=>{
  assert.ok(row.sources.length);
  const request=voiceRequest(config,row.actor,row.text);assert.ok(request,row.actor+': '+row.text);
  assert.ok(!row.sources.some(s=>/proposal-scene|#ribbon|_end/.test(s)),row.sources.join());
  return request.signature;
 });
 assert.equal(new Set(signatures).size,rows.length);
 for(const row of rows.filter(r=>r.actor==='player_female'))assert.ok(rows.some(r=>r.actor==='player_male'&&r.text===row.text));
 assert.ok(rows.filter(r=>r.actor==='player_female').length>=10);
 assert.ok(rows.some(r=>r.actor==='fu'&&r.sources.includes('src/chapter.js#tickChapter')));
 assert.ok(rows.some(r=>r.actor==='gao'&&r.text==='桥头那两位还没谈妥。苏姑娘想走自己的路。'));
});
