async function analyzeChat(chatText, chatType) {
  const maxChars = 25000;
  let trimmedChat = chatText;
  if (chatText.length > maxChars) {
    const chunk1 = chatText.slice(0, 8000);
    const chunk2 = chatText.slice(Math.floor(chatText.length / 2) - 4000, Math.floor(chatText.length / 2) + 4000);
    const chunk3 = chatText.slice(-8000);
    trimmedChat = chunk1 + '\n...\n' + chunk2 + '\n...\n' + chunk3;
  }

  const prompt = chatType === 'individual' ? getCouplePrompt(trimmedChat) : getGroupPrompt(trimmedChat);

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b',
      prompt: prompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 4096 }
    })
  });

  if (!response.ok) throw new Error('AI is not running. Please start Ollama and try again.');
  const data = await response.json();
  const text = data.response;

  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return valid data. Please try again.');
  return JSON.parse(jsonMatch[0]);
}

function getCouplePrompt(chatText) {
  return `You are analyzing a WhatsApp chat between two people.
Many messages may be in Hinglish (Hindi words in English letters like "tumhara", "pyaar", "kal", "kya").
Understand all such messages in context.

IMPORTANT: Return ONLY raw JSON. No markdown. No backticks. No explanation. Start directly with {

{
  "chatType": "individual",
  "summary": "warm 2-3 sentence summary of this relationship",
  "participants": ["Name1", "Name2"],
  "totalMessages": 0,
  "dateRange": { "from": "date", "to": "date" },
  "loveMetrics": {
    "iLoveYouCount": 0,
    "loveVariants": ["pyaar", "ily", "love you"],
    "totalLoveExpressions": 0,
    "mostRomanticDay": "day description",
    "mostRomanticMessage": "a sweet anonymized message"
  },
  "messageStats": {
    "person1": { "name": "Name1", "messageCount": 0, "avgMessageLength": 0 },
    "person2": { "name": "Name2", "messageCount": 0, "avgMessageLength": 0 },
    "whoTextsMore": "Name1",
    "whoSendsLongerMessages": "Name1"
  },
  "topWords": [
    { "word": "word", "count": 0, "meaning": "english meaning if hinglish" }
  ],
  "topEmojis": [
    { "emoji": "😍", "count": 0, "label": "Heart Eyes" }
  ],
  "funFacts": ["fact1", "fact2", "fact3", "fact4", "fact5"],
  "peakHour": "10 PM",
  "peakDay": "Saturday",
  "insideJokes": ["phrase1", "phrase2"],
  "vibeScore": 85,
  "vibeLabel": "Deeply Connected",
  "compatibilityNote": "fun warm observation",
  "milestones": [{ "date": "date", "event": "description" }]
}

CHAT:
${chatText}`;
}

function getGroupPrompt(chatText) {
  return `You are analyzing a WhatsApp GROUP chat.
Many messages may be in Hinglish. Understand them in context.

IMPORTANT: Return ONLY raw JSON. No markdown. No backticks. No explanation. Start directly with {

{
  "chatType": "group",
  "summary": "fun 2-3 sentence summary of this group",
  "groupName": "group name",
  "totalMessages": 0,
  "totalMembers": 0,
  "dateRange": { "from": "date", "to": "date" },
  "members": [
    { "name": "Name", "messageCount": 0, "percentage": 0, "title": "The Chatterbox" }
  ],
  "topWords": [{ "word": "word", "count": 0 }],
  "topEmojis": [{ "emoji": "😂", "count": 0, "label": "Laughing" }],
  "peakHour": "10 PM",
  "peakDay": "Saturday",
  "funFacts": ["fact1", "fact2", "fact3", "fact4", "fact5"],
  "chaosScore": 72,
  "chaosLabel": "Wonderfully Chaotic",
  "mostReplyTo": "Name",
  "groupPersonality": "playful 2 sentence description",
  "funTitles": {
    "theChatterbox": "Name",
    "theLurker": "Name",
    "theNightOwl": "Name",
    "theEarlyBird": "Name",
    "theEmojiKing": "Name",
    "thePhilosopher": "Name"
  },
  "awards": [
    { "title": "Most Likely to Spam", "winner": "Name", "reason": "reason" },
    { "title": "Night Owl Award", "winner": "Name", "reason": "reason" },
    { "title": "Meme Lord", "winner": "Name", "reason": "reason" },
    { "title": "Silent Observer", "winner": "Name", "reason": "reason" },
    { "title": "Voice of Reason", "winner": "Name", "reason": "reason" }
  ],
  "ghostMembers": ["Name1"],
  "topTopics": ["topic1", "topic2", "topic3"],
  "milestones": [{ "date": "date", "event": "description" }]
}

CHAT:
${chatText}`;
}

module.exports = { analyzeChat };
