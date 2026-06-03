const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeChat(chatText, chatType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  // Limit text to avoid token limits (take middle + end for best signal)
  const maxChars = 30000;
  let trimmedChat = chatText;
  if (chatText.length > maxChars) {
    const chunk1 = chatText.slice(0, 10000);
    const chunk2 = chatText.slice(Math.floor(chatText.length / 2) - 5000, Math.floor(chatText.length / 2) + 5000);
    const chunk3 = chatText.slice(-10000);
    trimmedChat = chunk1 + '\n...\n' + chunk2 + '\n...\n' + chunk3;
  }

  const prompt = chatType === 'individual'
    ? getCouplePrompt(trimmedChat)
    : getGroupPrompt(trimmedChat);

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI response was not valid JSON');

  return JSON.parse(jsonMatch[0]);
}

function getCouplePrompt(chatText) {
  return `You are analyzing a WhatsApp chat between two people (a couple or close friends). 
Many messages may be in Hinglish (Hindi words written in English letters like "tumhara", "kal", "kya", "pyaar", etc.). 
Translate/understand all such messages in context.

Analyze this chat and return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:

{
  "chatType": "individual",
  "summary": "A warm 2-3 sentence overall summary of this chat relationship",
  "participants": ["Name1", "Name2"],
  "totalMessages": 0,
  "dateRange": { "from": "date", "to": "date" },
  "loveMetrics": {
    "iLoveYouCount": 0,
    "loveVariants": ["pyaar", "I love you", "ily", ...],
    "totalLoveExpressions": 0,
    "mostRomanticDay": "date or day description",
    "mostRomanticMessage": "a sweet message (anonymized)"
  },
  "messageStats": {
    "person1": { "name": "Name1", "messageCount": 0, "avgMessageLength": 0, "longestMessage": 0 },
    "person2": { "name": "Name2", "messageCount": 0, "avgMessageLength": 0, "longestMessage": 0 },
    "whoTextsMore": "Name1 or Name2",
    "whoSendsLongerMessages": "Name1 or Name2"
  },
  "topWords": [
    { "word": "word", "count": 0, "meaning": "english meaning if hinglish" }
  ],
  "topEmojis": [
    { "emoji": "😍", "count": 0, "label": "Heart Eyes" }
  ],
  "funFacts": [
    "Fun fact 1 about this chat",
    "Fun fact 2",
    "Fun fact 3",
    "Fun fact 4",
    "Fun fact 5"
  ],
  "peakHour": "10 PM",
  "peakDay": "Saturday",
  "longestConversation": "description of the longest streak",
  "firstMessage": "what the very first message was about",
  "insideJokes": ["phrase or word that appears repeatedly and seems like an inside joke"],
  "vibeScore": 85,
  "vibeLabel": "Deeply Connected 💞",
  "compatibilityNote": "A fun, warm 1-2 sentence compatibility observation",
  "milestones": [
    { "date": "date", "event": "First time they said I love you / First late night chat / etc." }
  ]
}

Return ONLY the JSON. No explanation. No markdown.

CHAT TEXT:
${chatText}`;
}

function getGroupPrompt(chatText) {
  return `You are analyzing a WhatsApp GROUP chat. 
Many messages may be in Hinglish (Hindi words written in English letters). Understand them in context.

Analyze this group chat and return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:

{
  "chatType": "group",
  "summary": "A fun 2-3 sentence summary of what this group is about and its vibe",
  "groupName": "detected or inferred group name",
  "totalMessages": 0,
  "totalMembers": 0,
  "dateRange": { "from": "date", "to": "date" },
  "members": [
    { "name": "Name", "messageCount": 0, "percentage": 0, "title": "The Lurker / The Chatty One / The Meme Lord / etc." }
  ],
  "topWords": [
    { "word": "word", "count": 0 }
  ],
  "topEmojis": [
    { "emoji": "😂", "count": 0, "label": "Laughing" }
  ],
  "peakHour": "10 PM",
  "peakDay": "Saturday",
  "mostActiveMember": "Name",
  "mostSilentMember": "Name",
  "ghostMembers": ["Name1", "Name2"],
  "funTitles": {
    "theChatterbox": "most messages",
    "theLurker": "least messages",
    "theNightOwl": "texts latest at night",
    "theEarlyBird": "texts earliest in morning",
    "theEmojiKing": "uses most emojis",
    "thePhilosopher": "sends longest messages"
  },
  "funFacts": [
    "Fun fact 1",
    "Fun fact 2",
    "Fun fact 3",
    "Fun fact 4",
    "Fun fact 5"
  ],
  "topTopics": ["topic1", "topic2", "topic3"],
  "chaosScore": 72,
  "chaosLabel": "Wonderfully Chaotic 🔥",
  "longestSilence": "description of biggest gap",
  "mostReplyTo": "the person everyone replies to most",
  "groupPersonality": "A playful 2 sentence description of the group's overall personality",
  "milestones": [
    { "date": "date", "event": "description" }
  ],
  "awards": [
    { "title": "🏆 Most Likely to Spam", "winner": "Name", "reason": "short reason" },
    { "title": "🌙 Night Owl Award", "winner": "Name", "reason": "short reason" },
    { "title": "😂 Meme Lord", "winner": "Name", "reason": "short reason" },
    { "title": "🤫 Silent Observer", "winner": "Name", "reason": "short reason" },
    { "title": "💬 Voice of Reason", "winner": "Name", "reason": "short reason" }
  ]
}

Return ONLY the JSON. No explanation. No markdown.

CHAT TEXT:
${chatText}`;
}

module.exports = { analyzeChat };
