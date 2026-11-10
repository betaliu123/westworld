from pathlib import Path
r=Path.cwd()
def replace(path,old,new):
 p=r/path
 source=p.read_text(encoding='utf-8')
 assert old in source,(path,old)
 p.write_text(source.replace(old,new,1),encoding='utf-8')
replace('src/main.js',"tone(r.success?'mail':'attack');speak(r.text);","tone(r.success?'mail':'attack');")
replace('src/main.js',";speak(line);}mini();}", ";}mini();}")
replace('src/main.js',"world.update(dt);aim.update();","world.update(dt);npcVoice.update();aim.update();")
replace('src/main.js',"world.eco?.obstacles||[]","environment.eco.obstacles||[]")
replace('src/main.js',"{bookseller:'手若是干的，书就翻得。想看哪一种？',traveler:", "{tea_host:VOICE_LINES.teaGreeting,bookseller:VOICE_LINES.booksellerGreeting,traveler:")
replace('src/main.js',"gate_merchant:'货都在这儿，想买什么？',scribe:'刻字还是修印？东西拿来看看。'","gate_merchant:VOICE_LINES.merchantGreeting,scribe:VOICE_LINES.scribeGreeting")
replace('src/gate-society.js',"text=id==='traveler'?'劳你照看，缓过些来了。这份情，我记下了。':'多谢……这一回我记着。';","text=id==='traveler'?VOICE_LINES.princeCare:VOICE_LINES.teaCare;")
