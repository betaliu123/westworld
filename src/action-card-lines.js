// DS offline drafts, reviewed against actual visit facts. See docs/offline/action-card-lines-2026-11-11.json.
export const VISIT_LINES=Object.freeze({
 food_first:['看你饿着，我这有份{food}，先吃些。','看你像是饿了，我带着{food}，要不用点？','腹空难行，这份{food}你且拿去。'],
 food_again:['又见面了，饿了吧？这{food}给你。','瞧你气色，怕是没吃，拿些{food}吧。','你我又遇，这份{food}你收下垫垫。'],
 heal_first:['伤得不轻，让我替你包扎一下。','先别动，我帮你裹上伤口。','你忍着些，我来给你包扎。'],
 heal_again:['又碰上你，怎伤成这样？我替你包扎。','又见面了。先让我瞧瞧你的伤。','看你这伤，先别动，我帮你包扎。'],
 // Guide openings contain the actual topic in the same displayed utterance.
 guide_first:['提个醒，{topic}','{topic}','有件事你兴许用得上：{topic}'],
 guide_again:['又见面了，告诉你件事：{topic}','碰巧又遇上你。{topic}','还有件事没同你说：{topic}'],
 guide_gate:['怎么还在这儿？{topic}','看你还在关外，提一句：{topic}','又在关外碰上你了。{topic}']
});
