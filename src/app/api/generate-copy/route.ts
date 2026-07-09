import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const project = await request.json();
    
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
      // Mock response for testing if no key is provided
      console.warn("No ANTHROPIC_API_KEY found, returning mock data.");
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return NextResponse.json({
        website: `Welcome to ${project.developer || "this new development"} in ${project.location || "the city"}. Experience unparalleled luxury living with state-of-the-art amenities.`,
        seo_meta: `Luxury apartments in ${project.location || "the city"}. Discover your dream home today.`,
        deck: `Project overview: ${project.facts?.description || "A stunning new development."} Designed for modern living.`,
        video_script: "[Scene 1] Wide aerial shot of the building exterior.\n[Voiceover] Discover a new standard of living.\n[Scene 2] Interior shot of the spacious living room."
      });
    }

    const prompt = `You are a world-class real estate copywriter. 
Generate marketing copy for a new development based on the following details:
Developer: ${project.developer}
Location: ${project.location}
Facts: ${JSON.stringify(project.facts, null, 2)}
Brand: ${JSON.stringify(project.brand, null, 2)}

Please return ONLY a valid JSON object with the following keys, containing the generated copy:
- "website": The main website landing page copy.
- "seo_meta": SEO meta description for the website.
- "deck": Key narrative text for the pitch deck.
- "video_script": A short script for an AI-generated promotional video.`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      system: "You are a specialized AI that ONLY outputs valid JSON. Do not include markdown formatting or extra text outside the JSON.",
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const block = response.content[0];
    const contentText = block.type === 'text' ? block.text : "{}";
    const generatedData = JSON.parse(contentText);

    return NextResponse.json(generatedData);
    
  } catch (error) {
    console.error("Error generating copy:", error);
    return NextResponse.json({ error: "Failed to generate copy" }, { status: 500 });
  }
}
