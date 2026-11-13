import {chestOpenPreview,chestTakePreview,WARDROBE_CHEST} from './home-chest.js';
import {icon} from './ui-icons.js';
import {itemIcon} from './inventory-view.js';
export function chestMarkup(eco,o,escape){
 const bundle=o.id===WARDROBE_CHEST,contents=eco.items('object:'+o.id).filter(i=>i.hp>0),check=o.open?chestTakePreview(eco,o.id):chestOpenPreview(eco,o.id);
 const button=(action,text)=>`<button data-action="${action}" data-target="${escape(o.id)}">${text}</button>`;
 const description=bundle?'<p>茶娘为女儿备的远行衣物，布结下露着一角罗裙。</p>':'';
 const detail=check.blocked?check.reason:!check.allowed&&o.open&&check.sight?.witnesses.length?'有人看着这里，取物会被目击。':'';
 const tiles=o.open?'<div class="pack-grid">'+contents.map(i=>{
  const p=chestTakePreview(eco,o.id,i.id),action=p.allowed?'取用':'偷取';
  return `<button class="pack-tile" data-action="chestTake" data-item="${escape(i.id)}" data-target="${escape(o.id)}" aria-label="${action}${escape(i.name)}" ${p.blocked&&!p.interceptor&&!p.challenge?'disabled':''}>${icon(itemIcon(i))}<span>${escape(i.name)}</span></button>`;
 }).join('')+'</div>':'';
 return description+tiles+(detail?'<p>'+escape(detail)+'</p>':'')+(o.open?(contents.length&&!check.blocked?button('chestTakeAll',check.allowed?'取用全部':'偷取全部'):!contents.length?'<p>里面已空。</p>':'')+button('chestClose',bundle?'系好包裹':'合上木箱'):button('chestOpen',bundle?'解开包裹':'打开木箱'));
}
