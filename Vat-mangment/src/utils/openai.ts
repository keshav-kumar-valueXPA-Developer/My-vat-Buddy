import OpenAI from 'openai';
import { ContextDocument } from '../types';
import { createClient } from '@supabase/supabase-js';


// Get environment variable
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

// Create OpenAI client with validation
const supabase = createClient(supabaseUrl, supabaseKey);

let openai: OpenAI | null = null;

if (apiKey) {
  if (apiKey.startsWith('sk-')) {
    openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  } else {
    console.warn('Invalid OpenAI API key format. The key should start with "sk-"');
  }
} else {
  console.warn('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.');
}

const databaseSchema = `
Tables:
- transactions (id UUID, user_id UUID, date TIMESTAMPTZ, document_number TEXT, description TEXT, ledger_name TEXT, amount NUMERIC, vat_amount NUMERIC, type TEXT, category TEXT, debit NUMERIC, credit NUMERIC, cumulative_balance NUMERIC, previous_stage_price NUMERIC, previous_stage_vat NUMERIC, created_at TIMESTAMPTZ)
- report_history (id UUID, user_id UUID, user_email TEXT, date_range TEXT, downloaded_at TIMESTAMPTZ, created_at TIMESTAMPTZ)
- upload_history (id UUID, user_id UUID, filename TEXT, type TEXT, created_at TIMESTAMPTZ)
- documents (id UUID, user_id UUID, title TEXT, url TEXT, type TEXT, description TEXT, created_at TIMESTAMPTZ)
`;

export async function generateResponse(
  query: string,
  context: string,
  documents: ContextDocument[]
): Promise<string> {
  if (!openai) {
    return "I'm currently operating in offline mode. Please check your OpenAI API key configuration.";
  }

  try {
    // First verify the API key is valid
    const models = await openai.models.list();
    if (!models.data || models.data.length === 0) {
      throw new Error('Unable to access OpenAI API');
    }

    const documentContext = documents
      .map(doc => `${doc.title}: ${doc.description || 'No description provided'}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a VAT expert assistant for UAE businesses. You help users understand VAT regulations and calculations.
          limit yourself to answering only vat or related question.If you found yourself to answer other topics then send please ask related questions to VAT

          Available context and documents:
          ${documentContext}

         
          
          Current context:
          ${context}
          
          And if the your response requires you to query the database using sql and get results then please send as SQL query for a PostgreSQL database.
          but please follow below rules 
           - Avoids using invalid column names.
           Only return the SQL query without explanations.

            Available database schema:
          ${databaseSchema}
          `
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error('No response generated');
    }

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return "I'm having trouble with authentication. Please check the API key configuration.";
      } else if (error.message.includes('429')) {
        return "I've reached my rate limit. Please try again in a moment.";
      } else if (error.message.includes('500')) {
        return "I'm experiencing technical difficulties. Please try again later.";
      } else if (error.message === 'No response generated') {
        return "I couldn't generate a response. Please try rephrasing your question.";
      }
    }
    
    return "I'm having trouble processing your request. Please try again later.";
  }
}

export async function generateSQL(query: string): Promise<string> {
  if (!openai) {
    return "Error: OpenAI API not configured.";
  }

  try {
    // Fetch current database schema
    const { data: tables, error } = await supabase.rpc('get_schema');
    if (error) return `Error fetching schema: ${error.message}`;
    
    const schemaInfo = JSON.stringify(tables);
    const prompt = `Based on this schema: ${schemaInfo}, convert the following user instruction into a SQL query for Supabase:\n\n${query}\n\nSQL Query:`;
    
    const response = await openai.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an SQL agent that generates safe and optimized Supabase SQL queries." },
        { role: "user", content: prompt }
      ],
      temperature: 0,
    });
    
    return response.choices[0]?.message?.content || "Error: Failed to generate SQL.";
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

export async function executeSQL(sql: string): Promise<string> {
  try {
    // Verify if SQL is valid before execution
    const verifyResponse = await openai.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "Verify whether this SQL query is safe and executable in Supabase." },
        { role: "user", content: `Check this SQL: ${sql}` }
      ],
      temperature: 0,
    });
    
    if (!verifyResponse.choices[0]?.message?.content.includes("Valid")) {
      return "Error: SQL query may be unsafe or incorrect.";
    }
    
    // Execute SQL if verified
    const { error } = await supabase.rpc('execute_sql', { sql });
    if (error) return `Execution Error: ${error.message}`;
    
    return "Success: SQL executed.";
  } catch (error) {
    return `Execution Error: ${error.message}`;
  }
}

