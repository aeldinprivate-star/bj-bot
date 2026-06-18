const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) { console.error("BOT_TOKEN manquant"); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });

// ─── Logique BJ ───────────────────────────────────────────────────────────────

const CARD_VALUES = {
  "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,
  "J":10,"Q":10,"K":10,"A":11
};

function handTotal(cards) {
  let total = cards.reduce((s, c) => s + CARD_VALUES[c], 0);
  let aces = cards.filter(c => c === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function isSoft(cards) {
  const total = cards.reduce((s, c) => s + CARD_VALUES[c], 0);
  return cards.includes("A") && total <= 21;
}

function isPair(cards) {
  return cards.length === 2 && CARD_VALUES[cards[0]] === CARD_VALUES[cards[1]];
}

function getAction(playerCards, dealerCard) {
  const total = handTotal(playerCards);
  const dv = CARD_VALUES[dealerCard];
  const pair = isPair(playerCards);
  const soft = isSoft(playerCards);

  // PAIRS
  if (pair) {
    const pv = CARD_VALUES[playerCards[0]];
    if (pv === 11) return { action: "SPLIT", emoji: "✂️", label: "Split", reason: "AA : split toujours. Tu peux construire deux mains vers 21." };
    if (pv === 8)  return { action: "SPLIT", emoji: "✂️", label: "Split", reason: "8-8 : 16 est la pire main. Split pour repartir de deux bases à 8." };
    if (pv === 10) return { action: "STAND", emoji: "🛑", label: "Rester", reason: "10-10 = 20 : ne jamais splitter, tu as une des meilleures mains." };
    if (pv === 9) {
      if ([7,10,11].includes(dv)) return { action: "STAND", emoji: "🛑", label: "Rester", reason: `9-9 vs ${dealerCard} : ton 18 est suffisant ici.` };
      return { action: "SPLIT", emoji: "✂️", label: "Split", reason: "9-9 : split pour viser deux 19." };
    }
    if (pv === 7) {
      if (dv <= 7) return { action: "SPLIT", emoji: "✂️", label: "Split", reason: "7-7 vs croupier faible : split rentable." };
      return { action: "HIT", emoji: "🃏", label: "Tirer", reason: "7-7 vs forte carte : tirer." };
    }
    if (pv === 6) {
      if (dv <= 6) return { action: "SPLIT", emoji: "✂️", label: "Split", reason: "6-6 vs faible croupier : split." };
      return { action: "HIT", emoji: "🃏", label: "Tirer", reason: "6-6 vs forte carte : tirer." };
    }
    if (pv === 5) return { action: "DOUBLE", emoji: "⬆️", label: "Doubler", reason: "5-5 (=10) : ne jamais splitter. Doubler si croupier ≤9." };
    if (pv === 4) {
      if ([5,6].includes(dv)) return { action: "SPLIT", emoji: "✂️", label: "Split", reason: "4-4 vs 5/6 : split." };
      return { action: "HIT", emoji: "🃏", label: "Tirer", reason: "4-4 : tirer." };
    }
    if (pv <= 3) {
      if (dv <= 7) return { action: "SPLIT", emoji: "✂️", label: "Split", reason: `${playerCards[0]}-${playerCards[0]} vs faible : split.` };
      return { action: "HIT", emoji: "🃏", label: "Tirer", reason: `${playerCards[0]}-${playerCards[0]} vs forte carte : tirer.` };
    }
  }

  // SOFT
  if (soft && playerCards.length === 2) {
    const nonAce = playerCards.find(c => c !== "A");
    const nv = CARD_VALUES[nonAce];
    if (nv === 9) return { action: "STAND", emoji: "🛑", label: "Rester", reason: "Soft 20 : ne jamais toucher." };
    if (nv === 8) {
      if (dv === 6) return { action: "DOUBLE", emoji: "⬆️", label: "Doubler", reason: "Soft 19 vs 6 : doubler." };
      return { action: "STAND", emoji: "🛑", label: "Rester", reason: "Soft 19 : rester." };
    }
    if (nv === 7) {
      if ([3,4,5,6].includes(dv)) return { action: "DOUBLE", emoji: "⬆️", label: "Doubler", reason: "Soft 18 vs faible : doubler." };
      if ([2,7,8].includes(dv)) return { action: "STAND", emoji: "🛑", label: "Rester", reason: "Soft 18 : rester." };
      return { action: "HIT", emoji: "🃏", label: "Tirer", reason: "Soft 18 vs forte carte : tirer." };
    }
    if (nv === 6) {
      if ([3,4,5,6].includes(dv)) return { action: "DOUBLE", emoji: "⬆️", label: "Doubler", reason: "Soft 17 vs faible : doubler." };
      return { action: "HIT", emoji: "🃏", label: "Tirer", reason: "Soft 17 : toujours tirer ou doubler." };
    }
    if (nv >= 4) {
      if ([4,5,6].includes(dv)) return { action: "DOUBLE", emoji: "⬆️", label: "Doubler", reason: `Soft ${10+nv} vs faible : doubler.` };
      return { action: "HIT", emoji: "🃏", label: "Tirer", reason: `Soft ${10+nv} : tirer.` };
    }
    if ([5,6].includes(dv)) return { action: "DOUBLE", emoji: "⬆️", label: "Doubler", reason: "Soft 13-14 vs 5-6 : doubler." };
    return { action: "HIT", emoji: "🃏", label: "Tirer", reason: "Soft 13-14 : tirer." };
  }

  // HARD
  if (total >= 17) return { action: "STAND", emoji: "🛑", label: "Rester", reason: "17+ : on reste toujours." };
  if (total <= 8)  return { action: "HIT",   emoji: "🃏", label: "Tirer",  reason: "8 ou moins : tirer, impossible de crever." };
  if (total === 11) return { action: "DOUBLE", emoji: "⬆️", label: "Doubler", reason: "11 : doubler, fort potentiel de 21." };
  if (total === 10) {
    if (dv <= 9) return { action: "DOUBLE", emoji: "⬆️", label: "Doubler", reason: "10 vs faible : doubler." };
    return { action: "HIT", emoji: "🃏", label: "Tirer", reason: "10 vs 10/As : tirer." };
  }
  if (total === 9) {
    if ([3,4,5,6].includes(dv)) return { action: "DOUBLE", emoji: "⬆️", label: "Doubler", reason: "9 vs faible : doubler." };
    return { action: "HIT", emoji: "🃏", label: "Tirer", reason: "9 : tirer." };
  }
  if (total === 16) {
    if (dv >= 7) return { action: "HIT", emoji: "🃏", label: "Tirer", reason: "16 vs forte carte : tirer." };
    return { action: "STAND", emoji: "🛑", label: "Rester", reason: "16 vs faible : rester, laisse-le crever." };
  }
  if (total === 15) {
    if (dv >= 7) return { action: "HIT", emoji: "🃏", label: "Tirer", reason: "15 vs forte carte : tirer." };
    return { action: "STAND", emoji: "🛑", label: "Rester", reason: "15 vs faible : rester." };
  }
  if (total <= 14) {
    if (dv <= 6) return { action: "STAND", emoji: "🛑", label: "Rester", reason: `${total} vs croupier faible : rester.` };
    return { action: "HIT", emoji: "🃏", label: "Tirer", reason: `${total} vs forte carte : tirer.` };
  }
  if (total === 12) {
    if ([4,5,6].includes(dv)) return { action: "STAND", emoji: "🛑", label: "Rester", reason: "12 vs 4-6 : rester." };
    return { action: "HIT", emoji: "🃏", label: "Tirer", reason: "12 : tirer." };
  }
  return { action: "HIT", emoji: "🃏", label: "Tirer", reason: "Tirer." };
}

// ─── Sessions utilisateurs ────────────────────────────────────────────────────

const sessions = {}; // chatId -> { playerCards, dealerCard, phase }

function getSession(chatId) {
  if (!sessions[chatId]) sessions[chatId] = { playerCards: [], dealerCard: null, phase: "player" };
  return sessions[chatId];
}

function resetSession(chatId) {
  sessions[chatId] = { playerCards: [], dealerCard: null, phase: "player" };
}

// ─── Keyboards ────────────────────────────────────────────────────────────────

const CARDS_ROW1 = ["2","3","4","5","6","7"];
const CARDS_ROW2 = ["8","9","10","J","Q","K","A"];

function cardPickerKeyboard(prefix) {
  return {
    inline_keyboard: [
      CARDS_ROW1.map(c => ({ text: c, callback_data: `${prefix}_${c}` })),
      CARDS_ROW2.map(c => ({ text: c, callback_data: `${prefix}_${c}` })),
    ]
  };
}

function mainKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "✋ Ajouter carte joueur", callback_data: "phase_player" }],
      [{ text: "🃏 Carte croupier", callback_data: "phase_dealer" }],
      [{ text: "⚡ Analyser", callback_data: "analyze" }],
      [{ text: "🔄 Nouvelle main", callback_data: "reset" }],
    ]
  };
}

function buildStatusText(session) {
  const total = session.playerCards.length > 0 ? handTotal(session.playerCards) : null;
  const soft = session.playerCards.length >= 2 && isSoft(session.playerCards);
  const playerStr = session.playerCards.length > 0
    ? `*${session.playerCards.join(" | ")}*  →  ${total}${soft ? " (soft)" : ""}`
    : "_aucune carte_";
  const dealerStr = session.dealerCard ? `*${session.dealerCard}*` : "_aucune carte_";
  return `🃏 *Blackjack Advisor*\n\n✋ Ta main : ${playerStr}\n🏦 Croupier : ${dealerStr}`;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  resetSession(chatId);
  bot.sendMessage(chatId,
    "🃏 *Blackjack Advisor*\n\nStratégie de base en temps réel.\nSélectionne tes cartes et celle du croupier.",
    { parse_mode: "Markdown", reply_markup: mainKeyboard() }
  );
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const msgId  = query.message.message_id;
  const data   = query.data;
  const session = getSession(chatId);

  // Phase switch
  if (data === "phase_player") {
    session.phase = "player";
    await bot.editMessageText(buildStatusText(session) + "\n\n_Choisis une carte pour ta main :_",
      { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", reply_markup: cardPickerKeyboard("p") });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === "phase_dealer") {
    session.phase = "dealer";
    await bot.editMessageText(buildStatusText(session) + "\n\n_Choisis la carte visible du croupier :_",
      { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", reply_markup: cardPickerKeyboard("d") });
    return bot.answerCallbackQuery(query.id);
  }

  // Add player card
  if (data.startsWith("p_")) {
    const card = data.slice(2);
    if (session.playerCards.length < 8) session.playerCards.push(card);
    await bot.editMessageText(buildStatusText(session) + "\n\n_Ajoute une autre carte ou analyse :_",
      { chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            CARDS_ROW1.map(c => ({ text: c, callback_data: `p_${c}` })),
            CARDS_ROW2.map(c => ({ text: c, callback_data: `p_${c}` })),
            [{ text: "✅ Terminé", callback_data: "back_main" }],
          ]
        }
      });
    return bot.answerCallbackQuery(query.id);
  }

  // Add dealer card
  if (data.startsWith("d_")) {
    const card = data.slice(2);
    session.dealerCard = card;
    await bot.editMessageText(buildStatusText(session),
      { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", reply_markup: mainKeyboard() });
    return bot.answerCallbackQuery(query.id);
  }

  // Back to main
  if (data === "back_main") {
    await bot.editMessageText(buildStatusText(session),
      { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", reply_markup: mainKeyboard() });
    return bot.answerCallbackQuery(query.id);
  }

  // Analyze
  if (data === "analyze") {
    if (session.playerCards.length < 2 || !session.dealerCard) {
      return bot.answerCallbackQuery(query.id, { text: "⚠️ Sélectionne au moins 2 cartes + carte croupier", show_alert: true });
    }
    const result = getAction(session.playerCards, session.dealerCard);
    const total = handTotal(session.playerCards);
    const soft = isSoft(session.playerCards);

    const actionColors = { SPLIT: "✂️", STAND: "🛑", HIT: "🃏", DOUBLE: "⬆️" };
    const text = `${buildStatusText(session)}\n\n`
      + `━━━━━━━━━━━━━━━\n`
      + `${result.emoji} *${result.label.toUpperCase()}*\n\n`
      + `_${result.reason}_`;

    await bot.editMessageText(text,
      { chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "🔄 Nouvelle main", callback_data: "reset" }]] }
      });
    return bot.answerCallbackQuery(query.id);
  }

  // Reset
  if (data === "reset") {
    resetSession(chatId);
    await bot.editMessageText("🃏 *Blackjack Advisor*\n\nNouvelle main. Sélectionne tes cartes.",
      { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", reply_markup: mainKeyboard() });
    return bot.answerCallbackQuery(query.id);
  }

  bot.answerCallbackQuery(query.id);
});

console.log("🃏 BJ Bot démarré");
