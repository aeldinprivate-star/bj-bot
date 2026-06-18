const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) { console.error("BOT_TOKEN missing"); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });

const CV = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":10,"Q":10,"K":10,"A":11};

function total(cards) {
  let t = cards.reduce((s,c) => s+CV[c], 0);
  let a = cards.filter(c => c==="A").length;
  while(t>21 && a>0){ t-=10; a--; }
  return t;
}
function isSoft(c){ return c.includes("A") && c.reduce((s,x)=>s+CV[x],0)<=21; }
function isPair(c){ return c.length===2 && CV[c[0]]===CV[c[1]]; }

function getAction(p, d, afterSplit) {
  const t=total(p), dv=CV[d], pair=isPair(p), soft=isSoft(p);
  if(!afterSplit && pair){
    const pv=CV[p[0]];
    if(pv===11) return {a:"SPLIT",e:"✂️",l:"Split",r:"AA: always split. Build two hands toward 21."};
    if(pv===8)  return {a:"SPLIT",e:"✂️",l:"Split",r:"8-8: 16 is the worst hand. Split to start fresh from 8."};
    if(pv===10) return {a:"STAND",e:"🛑",l:"Stand",r:"10-10 = 20: never split, you have a near-perfect hand."};
    if(pv===9){ if([7,10,11].includes(dv)) return {a:"STAND",e:"🛑",l:"Stand",r:`9-9 vs ${d}: your 18 is enough here.`}; return {a:"SPLIT",e:"✂️",l:"Split",r:"9-9: split to aim for two 19s."}; }
    if(pv===7){ if(dv<=7) return {a:"SPLIT",e:"✂️",l:"Split",r:"7-7 vs weak dealer: split."}; return {a:"HIT",e:"🃏",l:"Hit",r:"7-7 vs strong card: hit."}; }
    if(pv===6){ if(dv<=6) return {a:"SPLIT",e:"✂️",l:"Split",r:"6-6 vs weak dealer: split."}; return {a:"HIT",e:"🃏",l:"Hit",r:"6-6 vs strong card: hit."}; }
    if(pv===5) return {a:"DOUBLE",e:"⬆️",l:"Double",r:"5-5 (=10): never split, double down."};
    if(pv===4){ if([5,6].includes(dv)) return {a:"SPLIT",e:"✂️",l:"Split",r:"4-4 vs 5/6: split."}; return {a:"HIT",e:"🃏",l:"Hit",r:"4-4: hit."}; }
    if(dv<=7) return {a:"SPLIT",e:"✂️",l:"Split",r:`${p[0]}-${p[0]} vs weak dealer: split.`};
    return {a:"HIT",e:"🃏",l:"Hit",r:`${p[0]}-${p[0]} vs strong card: hit.`};
  }
  if(!afterSplit && soft && p.length===2){
    const nv=CV[p.find(c=>c!=="A")];
    if(nv===9) return {a:"STAND",e:"🛑",l:"Stand",r:"Soft 20: never touch this hand."};
    if(nv===8){ if(dv===6) return {a:"DOUBLE",e:"⬆️",l:"Double",r:"Soft 19 vs 6: double down."}; return {a:"STAND",e:"🛑",l:"Stand",r:"Soft 19: stand."}; }
    if(nv===7){ if([3,4,5,6].includes(dv)) return {a:"DOUBLE",e:"⬆️",l:"Double",r:"Soft 18 vs weak dealer: double."}; if([2,7,8].includes(dv)) return {a:"STAND",e:"🛑",l:"Stand",r:"Soft 18: stand."}; return {a:"HIT",e:"🃏",l:"Hit",r:"Soft 18 vs strong card: hit."}; }
    if(nv===6){ if([3,4,5,6].includes(dv)) return {a:"DOUBLE",e:"⬆️",l:"Double",r:"Soft 17 vs weak dealer: double."}; return {a:"HIT",e:"🃏",l:"Hit",r:"Soft 17: always hit or double."}; }
    if(nv>=4){ if([4,5,6].includes(dv)) return {a:"DOUBLE",e:"⬆️",l:"Double",r:`Soft ${10+nv} vs weak dealer: double.`}; return {a:"HIT",e:"🃏",l:"Hit",r:`Soft ${10+nv}: hit.`}; }
    if([5,6].includes(dv)) return {a:"DOUBLE",e:"⬆️",l:"Double",r:"Soft 13-14 vs 5-6: double."};
    return {a:"HIT",e:"🃏",l:"Hit",r:"Soft 13-14: hit."};
  }
  if(t>=17) return {a:"STAND",e:"🛑",l:"Stand",r:"17+: always stand."};
  if(t<=8)  return {a:"HIT",e:"🃏",l:"Hit",r:"8 or less: hit, you can't bust."};
  if(!afterSplit && t===11) return {a:"DOUBLE",e:"⬆️",l:"Double",r:"11: double down, strong potential for 21."};
  if(!afterSplit && t===10){ if(dv<=9) return {a:"DOUBLE",e:"⬆️",l:"Double",r:"10 vs weak dealer: double."}; return {a:"HIT",e:"🃏",l:"Hit",r:"10 vs 10/Ace: hit."}; }
  if(!afterSplit && t===9){ if([3,4,5,6].includes(dv)) return {a:"DOUBLE",e:"⬆️",l:"Double",r:"9 vs weak dealer: double."}; return {a:"HIT",e:"🃏",l:"Hit",r:"9: hit."}; }
  if(t===16){ if(dv>=7) return {a:"HIT",e:"🃏",l:"Hit",r:"16 vs strong card: hit."}; return {a:"STAND",e:"🛑",l:"Stand",r:"16 vs weak dealer: stand, let them bust."}; }
  if(t===15){ if(dv>=7) return {a:"HIT",e:"🃏",l:"Hit",r:"15 vs strong card: hit."}; return {a:"STAND",e:"🛑",l:"Stand",r:"15 vs weak dealer: stand."}; }
  if(t===12){ if([4,5,6].includes(dv)) return {a:"STAND",e:"🛑",l:"Stand",r:"12 vs 4-6: stand."}; return {a:"HIT",e:"🃏",l:"Hit",r:"12: hit."}; }
  if(dv<=6) return {a:"STAND",e:"🛑",l:"Stand",r:`${t} vs weak dealer: stand.`};
  return {a:"HIT",e:"🃏",l:"Hit",r:`${t} vs strong card: hit.`};
}

const sessions = {};
function getSession(id){ if(!sessions[id]) sessions[id]={p:[],d:null,h1:[],h2:[],isAceSplit:false}; return sessions[id]; }
function resetSession(id){ sessions[id]={p:[],d:null,h1:[],h2:[],isAceSplit:false}; }

const R1 = ["2","3","4","5","6","7"];
const R2 = ["8","9","10","J","Q","K","A"];

function cardKeyboard(prefix){
  return { inline_keyboard: [
    R1.map(c=>({text:c, callback_data:`${prefix}_${c}`})),
    R2.map(c=>({text:c, callback_data:`${prefix}_${c}`})),
  ]};
}
function resetKeyboard(){ return { inline_keyboard: [[{text:"🔄 New hand", callback_data:"reset"}]] }; }
function main2OnlyKeyboard(){ return { inline_keyboard: [[{text:"➡️ Hand 2", callback_data:"split_card2"}]] }; }

function handLine(cards){
  const t=total(cards), s=isSoft(cards)&&cards.length>=2;
  return `*${cards.join("  ")}*  →  ${t}${s?" (soft)":""}`;
}

async function edit(bot, chatId, msgId, text, keyboard){
  try { await bot.editMessageText(text, {chat_id:chatId, message_id:msgId, parse_mode:"Markdown", reply_markup:keyboard}); } catch(e){}
}

bot.onText(/\/start/, (msg) => {
  const id = msg.chat.id;
  resetSession(id);
  bot.sendMessage(id, "🃏 *Blackjack Advisor*\n\n👇 _Pick your 1st card:_", {parse_mode:"Markdown", reply_markup:cardKeyboard("p1")});
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const msgId  = query.message.message_id;
  const data   = query.data;
  const S      = getSession(chatId);

  if(data.startsWith("p1_")){
    S.p.push(data.slice(3));
    await edit(bot, chatId, msgId, `✋ Your hand: *${S.p[0]}*\n\n👇 _Pick your 2nd card:_`, cardKeyboard("p2"));
    return bot.answerCallbackQuery(query.id);
  }

  if(data.startsWith("p2_")){
    S.p.push(data.slice(3));
    await edit(bot, chatId, msgId,
      `✋ Your hand: ${handLine(S.p)}\n🏦 Dealer: _—_\n\n👇 _Dealer's upcard:_`,
      cardKeyboard("d"));
    return bot.answerCallbackQuery(query.id);
  }

  if(data.startsWith("d_")){
    S.d = data.slice(2);
    await showResult(bot, chatId, msgId, S, S.p, false, null, false);
    return bot.answerCallbackQuery(query.id);
  }

  if(data.startsWith("hit_")){
    S.p.push(data.slice(4));
    await showResult(bot, chatId, msgId, S, S.p, false, null, false);
    return bot.answerCallbackQuery(query.id);
  }

  if(data.startsWith("sc1_")){
    S.h1 = [S.p[0], data.slice(4)];
    await showResult(bot, chatId, msgId, S, S.h1, true, "HAND 1", true);
    return bot.answerCallbackQuery(query.id);
  }

  if(data.startsWith("h1_")){
    S.h1.push(data.slice(3));
    await showResult(bot, chatId, msgId, S, S.h1, true, "HAND 1", true);
    return bot.answerCallbackQuery(query.id);
  }

  if(data === "split_card2"){
    await edit(bot, chatId, msgId,
      `*HAND 2*\n✋ *${S.p[1]}*  +  ?\n🏦 Dealer: *${S.d}*\n\n👇 _Card drawn on hand 2:_`,
      cardKeyboard("sc2"));
    return bot.answerCallbackQuery(query.id);
  }

  if(data.startsWith("sc2_")){
    S.h2 = [S.p[1], data.slice(4)];
    await showResult(bot, chatId, msgId, S, S.h2, true, "HAND 2", false);
    return bot.answerCallbackQuery(query.id);
  }

  if(data.startsWith("h2_")){
    S.h2.push(data.slice(3));
    await showResult(bot, chatId, msgId, S, S.h2, true, "HAND 2", false);
    return bot.answerCallbackQuery(query.id);
  }

  if(data === "reset"){
    resetSession(chatId);
    await edit(bot, chatId, msgId, "🃏 *Blackjack Advisor*\n\n👇 _Pick your 1st card:_", cardKeyboard("p1"));
    return bot.answerCallbackQuery(query.id);
  }

  bot.answerCallbackQuery(query.id);
});

async function showResult(bot, chatId, msgId, S, cards, afterSplit, label, isH1){
  const t = total(cards);
  const labelLine = label ? `*${label}*\n` : "";
  const dealerLine = `🏦 Dealer: *${S.d}*`;

  if(t > 21){
    const text = `${labelLine}✋ ${handLine(cards)}\n${dealerLine}\n\n━━━━━━━━━━━━━━\n💥 *BUST*\n_Over 21, hand lost._`;
    await edit(bot, chatId, msgId, text, isH1 ? main2OnlyKeyboard() : resetKeyboard());
    return;
  }

  const res = (afterSplit && S.isAceSplit)
    ? {a:"STAND",e:"🛑",l:"Stand",r:"Split aces: one card per hand, must stand."}
    : getAction(cards, S.d, afterSplit);

  if(res.a === "SPLIT"){
    S.isAceSplit = CV[cards[0]] === 11;
    const text = `${labelLine}✋ ${handLine(cards)}\n${dealerLine}\n\n━━━━━━━━━━━━━━\n${res.e} *${res.l.toUpperCase()}*\n_${res.r}_\n\n👇 _Card drawn on hand 1:_`;
    await edit(bot, chatId, msgId, text, cardKeyboard("sc1"));
    return;
  }

  const text = `${labelLine}✋ ${handLine(cards)}\n${dealerLine}\n\n━━━━━━━━━━━━━━\n${res.e} *${res.l.toUpperCase()}*\n_${res.r}_`;

  if(res.a === "HIT"){
    const pickPrefix = afterSplit ? (isH1 ? "h1" : "h2") : "hit";
    const lastRow = isH1
      ? [{text:"➡️ Hand 2", callback_data:"split_card2"}]
      : [{text:"🔄 New hand", callback_data:"reset"}];
    const kb = { inline_keyboard: [
      R1.map(c=>({text:c, callback_data:`${pickPrefix}_${c}`})),
      R2.map(c=>({text:c, callback_data:`${pickPrefix}_${c}`})),
      lastRow
    ]};
    await edit(bot, chatId, msgId, text + "\n\n👇 _Which card did you draw?_", kb);
  } else {
    const kb = isH1
      ? { inline_keyboard: [[{text:"➡️ Hand 2", callback_data:"split_card2"}],[{text:"🔄 New hand", callback_data:"reset"}]] }
      : resetKeyboard();
    await edit(bot, chatId, msgId, text, kb);
  }
}

console.log("🃏 BJ Bot started");
