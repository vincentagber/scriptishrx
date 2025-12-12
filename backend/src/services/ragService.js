const OpenAI = require('openai');

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const faqs = [
  {
    question: "Services & Pricing",
    answer: "Here’s a simple overview of our main services and their prices:\n\n**Wellness Lounge — $49.99 for 2 hours**\nRelax, enjoy refreshments, use fast WiFi, and charge your devices in a comfortable travel-friendly space.\n\n**Luggage Drop-Off — $4.99 per hour**\nSafe and secure short-term luggage storage so you can explore Chicago hands-free. Your belongings will be safe and secure.\n\n**Hourly Workspace — $24.99 per hour**\nA quiet private desk with fast WiFi, and plenty of power outlets. You’ll have a private desk, fast WiFi, and plenty of power outlets.\n\nIf you’d like to book any of these services or need more details, just let me know. I’m here to help!",
    keywords: ['services', 'pricing', 'cost', 'how much', 'lounge', 'luggage', 'workspace', 'storage', 'work']
  },
  {
    question: "Company Overview",
    answer: "Thank you so much for your interest! I’m happy to explain what we do at ScriptishRx Wellness and Travel. We offer a range of wellness services designed especially for travelers.\n\nOur main services include:\n- A **Wellness Lounge** where you can relax and recharge, with comfortable seating, refreshments, WiFi, and charging stations.\n- **Secure luggage drop-off** that is safe and easy to use.\n- **Hourly workspaces** that are private and equipped with everything you need to be productive.\n\nIf you’d like to book any of these services or need more details, just let me know. I’m here to help!",
    keywords: ['what do you do', 'about', 'mission', 'scriptishrx', 'who are you', 'overview']
  },
  {
    question: "Training & Courses",
    answer: "As for training courses or awareness programs, at this time, we focus mainly on providing wellness and travel support rather than formal training courses.\n\nHowever, we do offer:\n- Wellness tips\n- Travel guidance\n- Real-time travel advisories\n- Personal wellness consultations\n\nIf you’re interested in learning more about wellness practices or travel safety, we can provide resources and personal consultations. If you have specific interests or want to know about future workshops or programs, I’d be happy to note that and connect you with a consultant who can give you more details.",
    keywords: ['training', 'course', 'class', 'workshop', 'education', 'program']
  },
  {
    question: "Wellness Tips & Travel Guidance",
    answer: "We provide wellness tips and travel guidance to help you stay healthy and informed during your journeys. Our team can offer:\n- Personal wellness consultations\n- Real-time travel advisories\n- Health and safety recommendations\n- Travel wellness best practices",
    keywords: ['wellness tips', 'travel guidance', 'health', 'advice', 'safety', 'advisories']
  },
  {
    question: "Future Programs",
    answer: "While we currently focus on wellness and travel support services rather than formal training courses, we're always exploring new offerings. If you're interested in:\n- Wellness workshops\n- Travel safety programs\n- Health awareness sessions\n\nPlease let us know, and we can connect you with a consultant who can provide more details or note your interest for future programs.",
    keywords: ['future', 'upcoming', 'workshops', 'safety programs']
  },
  {
    question: "Directions to ScriptishRx from O'Hare International Airport (ORD)",
    answer: "**From O'Hare International Airport (ORD):**\n1. Take the **CTA Blue Line train** from the O’Hare station (lower-level concourse).\n2. Ride the Blue Line into downtown — about 40–45 minutes.\n3. Get off at **Washington/Wabash station** (or nearby downtown Loop station). This is easily walkable to 111 N Wabash Ave.\n4. From there, walk to the office address.",
    keywords: ['ohare', 'ord', 'airport', 'directions', 'train', 'blue line']
  },
  {
    question: "Directions to ScriptishRx from Midway International Airport (MDW)",
    answer: "**From Midway International Airport (MDW):**\n1. Take the **CTA Orange Line train** at the Midway Station (just east of the airport terminals; follow signs “CTA Trains / Trains to City”).\n2. Ride the Orange Line to downtown — typically ~20–25 minutes.\n3. Get off at a Loop-area station close to Wabash Ave (e.g., **Washington/Wabash**), then walk to 111 N Wabash Ave.",
    keywords: ['midway', 'mdw', 'airport', 'directions', 'train', 'orange line']
  },
  {
    question: "Backup / Alternative Transport Options",
    answer: "**Backup / Alternative Options:**\nIf trains are inconvenient due to heavy luggage, late night arrival, or mobility issues, you could:\n- Use a taxi or ride-share from the airport directly to 111 N Wabash Ave.\n- Use an airport shuttle / car service (especially if you arrive late, or if CTA service hours are limited — note Orange Line has defined hours).",
    keywords: ['taxi', 'uber', 'lyft', 'ride share', 'shuttle', 'car service', 'heavy luggage', 'late night']
  },
  {
    question: "Office Location",
    answer: "Our office is located at **111 N Wabash Ave, Chicago, IL 60602** — in the Garland Building, downtown Chicago.\n\n- **Public Transit:** The closest stations are Millennium Station (about 3 minutes walk) or Washington/Wabash L-station (about 6 minutes walk).\n- **Driving:** There are parking options near the building — you can check parking availability ahead.\n\nLet me know if you’d like driving directions or walking directions from a specific transit stop.",
    keywords: ['location', 'address', 'where is', 'map', 'parking', 'garland building']
  },
  {
    question: "Booking & Contact",
    answer: "To book an appointment, you can email us at **info@scriptishrx.com** or call us at **+1 (872) 873-2880**. We’ll be happy to assist you with scheduling!",
    keywords: ['book', 'appointment', 'consultation', 'contact', 'email', 'phone', 'schedule']
  }
];

// Construct System Context from FAQs
const systemContext = `
You are the ScriptishRx AI Assistant, a helpful, humble, and polite virtual assistant for ScriptishRx Wellness and Travel center in Chicago.
Your goal is to assist users with services, booking, location, directions, and general wellness tips.

Here is your Knowledge Base:
${faqs.map(f => `- **${f.question}**: ${f.answer}`).join('\n')}

**Instructions**:
- Answer strictly based on the Knowledge Base when possible.
- If the user asks about something outside the KB, politely offer to connect them with a human agent at info@scriptishrx.com.
- **Tone:** Kind, humble, polite, and professional. Always be eager to help.
- Do NOT make up services or prices not listed here.
- If asked for directions, ask if they are coming from O'Hare, Midway, or elsewhere if not specified.
`;

const ragService = {
  async query(userMessage) {
    if (!userMessage) return null;

    // 1. Try OpenAI if configured
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo", // Cost-effective and fast
          messages: [
            { role: "system", content: systemContext },
            { role: "user", content: userMessage }
          ],
          max_tokens: 500,
          temperature: 0.7,
        });

        const answer = completion.choices[0]?.message?.content;
        if (answer) return answer;

      } catch (error) {
        console.error("OpenAI Error (Falling back to keywords):", error.message);
        // Fallthrough to keyword matching
      }
    } else {
      console.log("ℹ️ OpenAI Key missing. Using Keyword Fallback.");
    }

    // 2. Keyword Fallback (Legacy Logic)
    const lowerMsg = userMessage.toLowerCase();
    for (const faq of faqs) {
      if (faq.keywords.some(keyword => lowerMsg.includes(keyword))) {
        return faq.answer + "\n\n*(Automated Reply)*";
      }
    }

    return "I'm sorry, I couldn't find a specific answer to that. Please contact us at info@scriptishrx.com or call +1 (872) 873-2880 for assistance.";
  }
};

module.exports = ragService;
