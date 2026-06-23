import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const getSuggestions = async (req, res) => {
  try {
    const { draftText } = req.body;

    if (typeof draftText !== "string" || !draftText.trim()) {
      return res.status(400).json({ message: "draftText is required" });
    }

    const payload = {
      model: "gemma3:12b:cloud",
      // Enforce JSON output mode so the model strictly replies in JSON
      format: "json",
      messages: [
        {
          role: "system",
          content: `You are an AI writing assistant. Your job is to take a draft message and rewrite it into exactly 3 different variations: Professional, Casual, and Empathetic. 
          You MUST respond ONLY with a raw JSON object without any additional formatting matching this exact schema:
          {
            "suggestions": [
              { "tone": "Professional", "text": "rewritten text" },
              { "tone": "Casual", "text": "rewritten text" },
              { "tone": "Empathetic", "text": "rewritten text" }
            ]
          }`
        },
        {
          role: "user",
          content: `Here is the draft text to rewrite: "${draftText}"`
        }
      ],
      stream: false
    };

    const response = await axios.post(
      "https://ollama.com/api/chat",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.gemma_api_key}`
        }
      }
    );

    // 1. Grab the raw text response from the LLM
    const rawContent = response.data.message.content;
    

    // 2. Clean the string (removes ```json, ```, and trailing/leading spaces)
    const cleanJsonString = rawContent
      .replace(/^```json\s*/i, '') // Removes leading ```json
      .replace(/^```\s*/i, '')     // Removes leading ``` (just in case)
      .replace(/```\s*$/, '')      // Removes trailing ```
      .trim();                     // Trims whitespace

    // 3. Parse the cleaned string safely
    const parsedData = JSON.parse(cleanJsonString);

    // 4. Return the array of suggestions to your frontend
    return res.status(200).json({ suggestions: parsedData.suggestions });

  } catch (error) {
    console.error("AI Controller Error:", error.response ? error.response.data : error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};