import OpenAI from 'openai';
import { executeSQLQuery } from './supabase';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});



// Convert user input to SQL query
export async function generateSQL(userQuery: string): Promise<string | null> {
  try {
    const prompt = `
    You are a VAT expert assistant for UAE businesses and an SQL agent that generates safe and optimized Supabase SQL queries. You help users in complex VAT regulations and calculations.Your primary job is to
      Convert the following natural language query into a SQL query for a PostgreSQL database.

      Database Schema:
      - transactions (id UUID, user_id UUID, amount NUMERIC, vat_amount NUMERIC, date TIMESTAMPTZ, description TEXT)
      - report_history (id UUID, user_id UUID, user_email TEXT, date_range TEXT, downloaded_at TIMESTAMPTZ, created_at TIMESTAMPTZ)
      - upload_history (id UUID, user_id UUID, filename TEXT, type TEXT, created_at TIMESTAMPTZ)
      - documents (id UUID, user_id UUID, title TEXT, url TEXT, type TEXT, created_at TIMESTAMPTZ)
      - Uses DATE_TRUNC('month', date) instead of "period"
      - Avoids using invalid column names.

      User query: "${userQuery}"
      
      Only return the SQL query without explanations.


      **Examples:**
      User query: "Total VAT collected last month?"
      SQL: SELECT SUM(vat_amount) AS total_vat FROM transactions WHERE date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
      
      User query: "Show my transactions for March 2023."
      SQL: SELECT * FROM transactions WHERE EXTRACT(MONTH FROM date) = 3 AND EXTRACT(YEAR FROM date) = 2023;
      
      User query: "What is the total VAT collected in January 2025?"
      SQL: SELECT SUM(vat_amount) FROM transactions WHERE EXTRACT(MONTH FROM date) = 1 AND EXTRACT(YEAR FROM date) = 2025;
      
      User query: "List my transactions above 1000 AED."
      SQL: SELECT * FROM transactions WHERE amount > 1000;
      
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.2
    });

    let sqlQuery = response.choices[0]?.message?.content?.replace(/```sql|```/g, "").trim();
    
    // Remove trailing semicolon if any
    sqlQuery = sqlQuery.replace(/;$/, "");

    return sqlQuery || null;
  } catch (error) {
    console.error("OpenAI Error:", error);
    return null;
  }
}


// Execute SQL and return formatted result
export async function processQuery(userQuery: string,chatHistory: string[]) {
  const sql = await generateSQL(userQuery);
  const history = chatHistory.slice(-3).join("\n"); // Use last 3 queries for context
  if (!sql) return "I couldn't generate a query.";

  const result = await executeSQLQuery(sql);
  if (!result || result.length === 0) return "No data found.";

  // Convert SQL result into a readable format using OpenAI
  const explanationPrompt = `
    Convert the following SQL query result into a human-friendly explanation and use previous chat history for more context.
    Most importantly give only the answer and associated sentence other than nothing shuold be there:
    Query: "${sql}"
    Result: ${JSON.stringify(result, null, 2)}
    chat history:${history}
    Explanation:
  `;

  const explanationResponse = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{ role: "system", content: explanationPrompt }],
    temperature: 0.5,
  });

  const explanation = explanationResponse.choices[0]?.message?.content?.trim();

  return explanation || "Here is your data: " + JSON.stringify(result, null, 2);
}

