"""Concept art via the Leihuo OpenAI-compatible image API. Key comes from env LEIHUO_KEY only.
Usage: python gen.py <name> [<name> ...]   (names are keys of PROMPTS)"""
import base64, json, os, sys, time, urllib.error, urllib.request, concurrent.futures as cf

API = 'https://ai.leihuo.netease.com/v1/images/generations'
HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = ('Chinese Northern Song dynasty, Xuanhe era. Painted like a Song court handscroll on aged silk paper, '
         'restrained ink wash with generous negative space, subtle paper grain. Cinematic concept art for a 3D wuxia open-world game. '
         'No text, no watermark, no modern objects.')
LINEUP3 = ('Character design lineup sheet: exactly three full-body characters standing side by side, evenly spaced, same scale, front three-quarter view, '
           'feet visible, on a plain flat light parchment background with nothing else, no text. Northern Song dynasty, attractive stylish designs for a female-audience wuxia game. '
           'Each character has a very distinct silhouette and colour. Clean painterly concept art with Song painting line work. From left to right: ')
TOKENS3 = ('Prop design sheet: three iconic faction tokens laid out in a row on plain flat light parchment, evenly spaced, top-down studio view, '
           'no text anywhere, no characters written. Northern Song dynasty craftsmanship, painterly concept art, soft shadows. ')
PROMPTS = {
    'realms': 'A vertically layered panorama of the Song capital Bianjing (Kaifeng) showing three realms at once. '
              'Bottom: the dark underside of a great arched wooden rainbow bridge over the Bian river, a hidden pre-dawn ghost market '
              'in thick black ink and mist, only scattered vermilion lanterns, masked traders. '
              'Middle: the bustling human city in light ink with pale colour, like Along the River During the Qingming Festival: '
              'tiled roofs, boats, crowds, city walls. '
              'Top and background: a towering artificial imperial mountain (Genyue) rising above a sea of clouds, '
              'painted in blue-green landscape style like A Thousand Li of Rivers and Mountains, mineral azurite and malachite with gold leaf, '
              'jade terraces, golden-roofed pavilions on cliffs, waterfalls falling into clouds, red-crowned cranes. '
              'Strong sense of verticality: the heavenly realm floats unreachably high above the city.',
    'gateview': 'Third-person game camera view from behind a lone swordsman in a bamboo hat standing at a small wooden frontier gate town on a hill. '
                'Far below and beyond: the vast walled capital city in soft ink haze along a river. '
                'On the far horizon, above the clouds, a luminous blue-green and gold immortal mountain with palaces, '
                'tiny but unmistakable, catching warm light, drawing the eye like a goal. Atmospheric perspective, layers of mist.',
    'xianjie': 'The heavenly realm: an imperial garden mountain of fantastic Taihu rocks and jade cliffs above a sea of clouds, '
               'blue-green landscape style with azurite, malachite and gold leaf, golden-roofed halls and covered bridges linking peaks, '
               'waterfalls, pines, red-crowned cranes, palace lanterns at dusk, a grand banquet terrace with nobles in silk. '
               'Opulent yet elegant, dreamlike, the viral Chinese fairyland aesthetic but disciplined by Song painting restraint.',
    'stage': 'A split view of the staged heavenly realm on the imperial garden mountain Genyue at dusk. '
             'Front half: a breathtaking fairyland in blue-green and gold, the Daoist emperor in pale robes on a jade terrace, '
             'nobles costumed as immortals with flowing sleeves, "cranes" gliding, clouds pouring over cliffs, a golden hall. '
             'Back half, hidden behind giant Taihu rocks: the backstage machinery that fakes the miracle, sweating labourers pumping bellows '
             'and boiling cauldrons to make the cloud mist, men on ropes and pulleys flying crane puppets, a Daoist sorcerer with alchemy '
             'furnace and fireworks powder, a court official checking a list, stacked rocks hauled from far away. '
             'Same painting, two worlds: splendour in front, ink-grey toil behind.',
    'guishi2': 'The ghost market at the fifth watch before dawn, under and beside a huge arched wooden bridge on the Bian river in Bianjing. '
               'Deep black ink night and river fog, a dense lane of tiny stalls lit only by vermilion paper lanterns, '
               'traders wearing carved wooden Nuo exorcism masks and gauze veiled hats, a disguise maker selling Song dynasty Nuo masks, '
               'false beards and clothing of officials and servants, a pawnshop counter behind wooden bars, forged seals on a table, '
               'a dark culvert mouth in the embankment leading to underground sewers. '
               'No Peking opera masks. Mostly monochrome ink with cinnabar red accents only.',
    'outskirts': 'Wide panoramic autumn countryside outside the Song capital, seen from a riverside path. '
                 'Golden ginkgo trees glowing, a field of white silver-grass reeds in the foreground, a lone rider on a pale horse on the path, '
                 'a calm jade-teal lake with a long wooden bridge and a small pavilion, sailing junks, a two-storey wooden tower on a rocky islet, '
                 'misty blue-green mountains with waterfalls. Far on the horizon above the haze: the distant walled city Bianjing with a pagoda, '
                 'and beyond it a tiny luminous blue-green-and-gold immortal mountain palace above the clouds. '
                 'Rich colour like the viral Chinese fairyland images, then aged into a warm silk-scroll tone (juanben), '
                 'like a Song blue-green landscape painting on yellowed silk.',
    'shishi': 'Night in the pleasure quarter of Bianjing: the elegant two-storey courtyard house of the famed courtesan Li Shishi, '
              'paper lanterns, plum tree, a guqin on a table by a lattice window, a graceful woman in Song dress pouring tea, intelligent gaze. '
              'In the back garden a hidden stone trapdoor of a secret tunnel stands open; emerging from it, Emperor Huizong in plain scholar disguise, '
              'thin moustache, holding a folding fan, pretending to be an ordinary merchant. '
              'On the surrounding rooftops, barely visible plain-clothes imperial bodyguards keeping watch in the dark. '
              'Warm lamplight versus deep blue ink night, intimate and full of secrets.',
    'map': 'A painted bird\'s-eye map of the Northern Song capital Bianjing as an antique scroll map on yellowed silk, viewed from high above at a slight angle, north at top. '
           'Absolutely no text, no letters, no labels, no characters anywhere. '
           'Layout: a huge rectangular outer city wall with many gates and a moat; inside it a smaller rectangular inner city wall; '
           'inside that, slightly north of centre, the walled imperial palace with golden roofs. '
           'A wide river (the Bian) enters from the far west edge, crosses the southern part of the city from west to east through water gates, '
           'and exits to the east where a great arched wooden rainbow bridge spans it with boats. '
           'A smaller river crosses the south, another the north-east. A straight broad imperial avenue runs from the palace south to the southern gate, '
           'crossing the Bian river at a stone bridge. '
           'In the north-east corner just outside the palace: a tall artificial blue-green mountain garden with pavilions and clouds, clearly the highest point. '
           'Dense blocks of houses, markets, a tall wooden multi-storey restaurant tower east of the palace, pagodas. '
           'Outside the west wall, upstream along the river: open countryside with golden autumn trees and reeds, '
           'and a small separate frontier checkpoint town with a wooden gate on the river road, at the left edge of the map. '
           'Blue-green landscape painting colours, ink lines, juanben silk tone.',
    'shishi2': 'The grand pleasure house of the famed courtesan Li Shishi on Sweetwater Lane (Tianshui Xiang) in Bianjing at night, Northern Song. '
               'A magnificent three-storey timber pavilion complex with flying eaves, red lacquer columns, carved balconies, '
               'hundreds of glowing lanterns, silk curtains, a courtyard pond reflecting the lights. '
               'On the main hall stage Li Shishi in splendid Song court-style dress plays the pipa, poised and commanding, '
               'musicians and dancers around her; scholars, officials and rich merchants at banquet tables on every balcony, servants with wine, '
               'the lane outside crowded with sedan chairs and horses. Among the guests, a refined man with a thin moustache in plain clothes and a folding fan, '
               'subtly attended. Opulent, glamorous, the most dazzling place of the human realm, '
               'rich colour aged into a warm silk-scroll tone.',
    'lineup': 'Character design lineup sheet: exactly four full-body characters standing side by side, evenly spaced, same scale, front three-quarter view, '
              'feet visible, on a plain flat light parchment background with nothing else, no text. Northern Song dynasty, attractive stylish designs for a female-audience wuxia game. '
              'From left to right: '
              '1) A young female constable of the Six Doors bureau: black fitted uniform with a bright red tassel on a black hat, a dark iron ruler baton and a lacquered waist token, '
              'confident heroic stance, ponytail, practical boots. '
              '2) A handsome, elegant but sinister male imperial procurement official (Flower-and-Bird Envoy): flowing pale imperial-yellow silk robe, tall black gauze hat, '
              'holding a folded yellow seal strip and a bird cage, cold smile, tall slender silhouette with wide sleeves. '
              '3) A rugged handsome dockside gang man: ochre-red headscarf, sleeveless rough jacket, muscular arms with sand-grain tattoos on the back of the hands, '
              'a coil of rope over the shoulder, a hook, relaxed cocky pose, broad silhouette. '
              '4) A beautiful mysterious female opera actress of the Faceless Troupe: half of her face covered by a pale lacquered mask, '
              'layered theatrical costume in muted ink colours with long water sleeves, holding a blank white mask, graceful dancer pose. '
              'Each character has a very distinct silhouette and colour. Clean painterly concept art with Song painting line work.',
    'tokens': 'Prop design sheet: four iconic faction tokens laid out in a row on plain flat light parchment, evenly spaced, top-down studio view, no text anywhere, no characters written. '
              '1) A black lacquered wooden constable waist token with a red silk cord and tassel, and a short dark iron ruler. '
              '2) A long strip of imperial-yellow paper seal stamped with a square cinnabar-red official seal impression (no wax, no writing), beside a small gilded bird cage. '
              '3) An ochre-red headscarf knotted, with coarse river sand spilling from it and a dock hook. '
              '4) A blank pale lacquered opera mask with no features, tied with an ink-black ribbon, on a folded troupe playbill with no writing. '
              'Northern Song dynasty craftsmanship, painterly concept art, soft shadows.',
    'lineup2': LINEUP3 +
               '1) A female wandering knight of the Green Bamboo Society: wide conical bamboo rain hat with a short gauze veil, '
               'bamboo-green and pale grey travelling robe tied short for walking, a slim sword sheathed in a green bamboo scabbard on her back, '
               'straw sandals, calm protective stance. Silhouette defined by the wide flat hat disc. '
               '2) A weathered male canal boatman of the Grain Boat Guild: straw rain cape (suoyi) over bare shoulders, trousers rolled to the knee, barefoot, '
               'holding a very long bamboo punting pole taller than himself, a rope-tied bundle smuggled at his waist, indigo cloth. '
               'Silhouette defined by the tall diagonal pole and the shaggy cape. '
               '3) A beautiful glamorous young woman, proprietress of the Wuchang Pawnshop, who loves money and wears it: '
               'bright knowing smile, clever eyes, gold hairpins with coin-and-pearl ornaments, malachite-green and cinnabar-red silk, '
               'coin necklace and a waist fringe of bronze cash. A lit white paper lantern on a short lacquered pole over one shoulder, '
               'a slim gold-inlaid pawn box and a small abacus at her hip. Fully dressed Song robes, light confident stance, one hand flipping a coin. '
               'Human only, no animal ears. Silhouette defined by the lantern pole and the coin fringe. ',
    'lineup3': LINEUP3 +
               '1) A male Daoist sorcerer of the Shenxiao Palace in authentic Northern Song Daoist dress: hair in a neat topknot held by a small jade '
               'lotus-petal Daoist crown and a long hairpin, as in Song paintings of Daoist immortals; absolutely no European crown, no spikes, no tiara. '
               'White and azurite-blue Daoist robe with cloud patterns and wide sleeves, one hand conjuring a twisting ribbon of water, the other a small flame, '
               'a horsetail whisk, long beard, otherworldly calm. Silhouette defined by the raised conjuring hands and the water ribbon. '
               '2) A strikingly handsome, heroic young male secret agent of the Imperial City Office, charismatic like a lead male role: '
               'tall, broad-shouldered, athletic, upright and alert, sharp brows and intense eyes, black soft cloth headwrap with a sleek ponytail, '
               'a dark fitted narrow-sleeved robe with leather wrist guards and a wide belt, a dark cloak thrown back over one shoulder, '
               'one hand on a short saber half hidden under the cloak, a bronze fish-shaped tally at his belt. No insignia, could pass in a crowd, but obviously dangerous. '
               '3) A male Northern Song imperial army soldier of the Palace Command: tattooed characters on his cheek shown as abstract dark marks (no readable writing), '
               'iron lamellar half armour over a dull vermilion army tunic, a tall spear held upright, a round helmet with a tassel, sturdy disciplined stance. '
               'Silhouette defined by the tall vertical spear. ',
    'tokens2': TOKENS3 +
               '1) A wide conical bamboo rain hat with a short gauze veil beside a section of green bamboo. '
               '2) A wet coil of hemp rope with an oilcloth-wrapped smuggled bundle and a punting-pole iron tip. '
               '3) A small lit white paper lantern on a short bamboo pole, beside heaped strings of square-holed bronze cash coins and a stack of blank pawn tickets. ',
    'tokens3': TOKENS3 +
               '1) A Daoist talisman paper strip (blank, no writing) under a small bronze thunder-block and a water bowl with a wisp of flame. '
               '2) A small bronze fish-shaped tally split into two halves that fit together. '
               '3) A Song army round helmet with tassel and a spearhead. ',
    'guishi': 'The ghost market at the fifth watch before dawn, under and beside a huge arched wooden bridge on the Bian river in Bianjing. '
              'Deep black ink night and river fog, a dense lane of tiny stalls lit only by vermilion paper lanterns, '
              'traders in opera masks and veils, a disguise maker hanging painted face masks, a pawnshop counter behind bars, forged seals on a table. '
              'Dangerous, lawless, mysterious, beautiful. Mostly monochrome ink with cinnabar red accents only.',
}

def gen(name, size='1536x1024', model='gpt-image-2'):
    body = json.dumps({'model': model, 'prompt': PROMPTS[name] + ' ' + STYLE, 'size': size, 'n': 1}).encode()
    req = urllib.request.Request(API, body, {'Authorization': 'Bearer ' + os.environ['LEIHUO_KEY'], 'Content-Type': 'application/json'})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                data = json.load(r)['data'][0]
            break
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 5: raise
            time.sleep(25)
    raw = base64.b64decode(data['b64_json']) if data.get('b64_json') else urllib.request.urlopen(data['url'], timeout=120).read()
    path = os.path.join(HERE, name + '.png')
    open(path, 'wb').write(raw)
    return path

if __name__ == '__main__':
    with cf.ThreadPoolExecutor(2) as ex:
        futs = {ex.submit(gen, n): n for n in sys.argv[1:]}
        for f in cf.as_completed(futs):
            try: print('ok', f.result())
            except Exception as e: print('fail', futs[f], getattr(e, 'read', lambda: b'')()[:400] or e)
