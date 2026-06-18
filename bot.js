const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) { console.error("BOT_TOKEN missing"); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });

const CV = {"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":10,"Q":10,"K":10,"A":11};
const R1 = ["2","3","4","5","6","7"];
const R2 = ["8","9","10","J","Q","K","A"];

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

  // Pairs — only on initial 2-card hand, never after split
  if(!afterSplit && pair){
    const pv=CV[p[0]];
    if(pv===11) return {a:"SPLIT",e:"✂️",l:"Split"};
    if(pv===8)  return {a:"SPLIT",e:"✂️",l:"Split"};
    if(pv===10) return {a:"STAND",e:"🛑",l:"Stand"};
    if(pv===9)  { if([7,10,11].includes(dv)) return {a:"STAND",e:"🛑",l:"Stand"}; return {a:"SPLIT",e:"✂️",l:"Split"}; }
    if(pv===7)  { if(dv<=7) return {a:"SPLIT",e:"✂️",l:"Split"}; return {a:"HIT",e:"🃏",l:"Hit"}; }
    if(pv===6)  { if(dv<=6) return {a:"SPLIT",e:"✂️",l:"Split"}; return {a:"HIT",e:"🃏",l:"Hit"}; }
    if(pv===5)  return {a:"DOUBLE",e:"⬆️",l:"Double"};
    if(pv===4)  { if([5,6].includes(dv)) return {a:"SPLIT",e:"✂️",l:"Split"}; return {a:"HIT",e:"🃏",l:"Hit"}; }
    if(dv<=7)   return {a:"SPLIT",e:"✂️",l:"Split"};
    return {a:"HIT",e:"🃏",l:"Hit"};
  }

  // Soft hands — only on initial 2-card hand
  if(!afterSplit && soft && p.length===2){
    const nv=CV[p.find(c=>c!=="A")];
    if(nv===9) return {a:"STAND",e:"🛑",l:"Stand"};
    if(nv===8) { if(dv===6) return {a:"DOUBLE",e:"⬆️",l:"Double"}; return {a:"STAND",e:"🛑",l:"Stand"}; }
    if(nv===7) { if([3,4,5,6].includes(dv)) return {a:"DOUBLE",e:"⬆️",l:"Double"}; if([2,7,8].includes(dv)) return {a:"STAND",e:"🛑",l:"Stand"}; return {a:"HIT",e:"🃏",l:"Hit"}; }
    if(nv===6) { if([3,4,5,6].includes(dv)) return {a:"DOUBLE",e:"⬆️",l:"Double"}; return {a:"HIT",e:"🃏",l:"Hit"}; }
    if(nv>=4)  { if([4,5,6].includes(dv)) return {a:"DOUBLE",e:"⬆️",l:"Double"}; return {a:"HIT",e:"🃏",l:"Hit"}; }
    if([5,6].includes(dv)) return {a:"DOUBLE",e:"⬆️",l:"Double"};
    return {a:"HIT",e:"🃏",l:"Hit"};
  }

  // Hard totals
  if(t>=17) return {a:"STAND",e:"🛑",l:"Stand"};
  if(t<=8)  return {a:"HIT",e:"🃏",l:"Hit"};

  // Double only allowed on initial hand (not after split)
  if(!afterSplit && t===11) return {a:"DOUBLE",e:"⬆️",l:"Double"};
  if(!afterSplit && t===10) { if(dv<=9) return {a:"DOUBLE",e:"⬆️",l:"Double"}; return {a:"HIT",e:"🃏",l:"Hit"}; }
  if(!afterSplit && t===9)  { if([3,4,5,6].includes(dv)) return {a:"DOUBLE",e:"⬆️",l:"Double"}; return {a:"HIT",e:"🃏",l:"Hit"}; }

  // After split: 9/10/11 fall through to regular hit/stand logic
  if(t===16) { if(dv>=7) return {a:"HIT",e:"🃏",l:"Hit"}; return {a:"STAND",e:"🛑",l:"Stand"}; }
  if(t===15) { if(dv>=7) return {a:"HIT",e:"🃏",l:"Hit"}; return {a:"STAND",e:"🛑",l:"Stand"}; }
  if(t===12) { if([4,5,6].includes(dv)) return {a:"STAND",e:"🛑",l:"Stand"}; return {a:"HIT",e:"🃏",l:"Hit"}; }
  if(t===13||t===14) { if(dv<=6) return {a:"STAND",e:"🛑",l:"Stand"}; return {a:"HIT",e:"🃏",l:"Hit"}; }

  // 9, 10, 11 after split → hit
  return {a:"HIT",e:"🃏",l:"Hit"};
}

const sessions = {};
function getSession(id){ if(!sessions[id]) sessions[id]={p:[],d:null,h1:[],h2:[],isAceSplit:false,splitCard:null}; return sessions[id]; }
function resetSession(id){ sessions[id]={p:[],d:null,h1:[],h2:[],isAceSplit:false,splitCard:null}; }

function cardKeyboard(prefix){
  return { inline_keyboard: [
    R1.map(c=>({text:c, callback_data:`${prefix}_${c}`})),
    R2.map(c=>({text:c, callback_data:`${prefix}_${c}`})),
  ]};
}
function resetKeyboard(){ return { inline_keyboard: [[{text:"🔄 New hand", callback_data:"reset"}]] }; }
function main2OnlyKeyboard(){ return { inline_keyboard: [[{text:"➡️ Hand 2", callback_data:"split_card2"}]] }; }
function main2ResetKeyboard(){ return { inline_keyboard: [[{text:"➡️ Hand 2", callback_data:"split_card2"}],[{text:"🔄 New hand", callback_data:"reset"}]] }; }

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
  bot.sendMessage(id, "🃏 *Blackjack Advisor*\n\n👇 _Pick your 1st card:_\n\n🎰 [Play on Duel Casino](https://duel.com/r/BJCoach)", {parse_mode:"Markdown", disable_web_page_preview:true, reply_markup:cardKeyboard("p1")});
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const msgId  = query.message.message_id;
  const data   = query.data;
  const S      = getSession(chatId);

  // Card 1
  if(data.startsWith("p1_")){
    S.p = [data.slice(3)];
    await edit(bot, chatId, msgId, `✋ Your hand: *${S.p[0]}*\n\n👇 _Pick your 2nd card:_`, cardKeyboard("p2"));
    return bot.answerCallbackQuery(query.id);
  }

  // Card 2 → auto switch to dealer
  if(data.startsWith("p2_")){
    S.p.push(data.slice(3));
    await edit(bot, chatId, msgId,
      `✋ Your hand: ${handLine(S.p)}\n🏦 Dealer: _—_\n\n👇 _Dealer\'s upcard:_`,
      cardKeyboard("d"));
    return bot.answerCallbackQuery(query.id);
  }

  // Dealer card → auto analyze
  if(data.startsWith("d_")){
    S.d = data.slice(2);
    await showResult(bot, chatId, msgId, S, S.p, false, null, false);
    return bot.answerCallbackQuery(query.id);
  }

  // Hit normal hand
  if(data.startsWith("hit_")){
    S.p.push(data.slice(4));
    await showResult(bot, chatId, msgId, S, S.p, false, null, false);
    return bot.answerCallbackQuery(query.id);
  }

  // Split: first card of hand 1
  if(data.startsWith("sc1_")){
    S.h1 = [S.p[0], data.slice(4)];
    await showResult(bot, chatId, msgId, S, S.h1, true, "HAND 1", true);
    return bot.answerCallbackQuery(query.id);
  }

  // Hit hand 1
  if(data.startsWith("h1_")){
    S.h1.push(data.slice(3));
    await showResult(bot, chatId, msgId, S, S.h1, true, "HAND 1", true);
    return bot.answerCallbackQuery(query.id);
  }

  // Go to hand 2
  if(data === "split_card2"){
    const baseCard = S.p[1];
    await edit(bot, chatId, msgId,
      `*HAND 2*\n✋ *${baseCard}*  +  ?\n🏦 Dealer: *${S.d}*\n\n👇 _Card drawn on hand 2:_`,
      cardKeyboard("sc2"));
    return bot.answerCallbackQuery(query.id);
  }

  // Split: first card of hand 2
  if(data.startsWith("sc2_")){
    S.h2 = [S.p[1], data.slice(4)];
    await showResult(bot, chatId, msgId, S, S.h2, true, "HAND 2", false);
    return bot.answerCallbackQuery(query.id);
  }

  // Hit hand 2
  if(data.startsWith("h2_")){
    S.h2.push(data.slice(3));
    await showResult(bot, chatId, msgId, S, S.h2, true, "HAND 2", false);
    return bot.answerCallbackQuery(query.id);
  }

  // Reset
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

  // BUST
  if(t > 21){
    const text = `${labelLine}✋ ${handLine(cards)}\n${dealerLine}\n\n━━━━━━━━━━━━━━\n💥 *BUST*\n_Over 21, hand lost._`;
    await edit(bot, chatId, msgId, text, isH1 ? main2OnlyKeyboard() : resetKeyboard());
    return;
  }

  const res = (afterSplit && S.isAceSplit)
    ? {a:"STAND",e:"🛑",l:"Stand"}
    : getAction(cards, S.d, afterSplit);

  // SPLIT
  if(res.a === "SPLIT"){
    S.isAceSplit = CV[cards[0]] === 11;
    const text = `${labelLine}✋ ${handLine(cards)}\n${dealerLine}\n\n━━━━━━━━━━━━━━\n${res.e} *${res.l.toUpperCase()}*\n\n👇 _Card drawn on hand 1:_`;
    await edit(bot, chatId, msgId, text, cardKeyboard("sc1"));
    return;
  }

  const text = `${labelLine}✋ ${handLine(cards)}\n${dealerLine}\n\n━━━━━━━━━━━━━━\n${res.e} *${res.l.toUpperCase()}*`;

  // HIT → show card picker inline
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
    return;
  }

  // STAND / DOUBLE
  let kb;
  if(isH1 === true)  kb = main2ResetKeyboard();
  else               kb = resetKeyboard();
  await edit(bot, chatId, msgId, text, kb);
}

console.log("🃏 BJ Bot started");
