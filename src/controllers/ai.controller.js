const Product = require('../models/product.model');
const Sale = require('../models/sale.model');
const Expense = require('../models/expense.model');
const Customer = require('../models/customer.model');
const Ticket = require('../models/ticket.model');
const User = require('../models/user.model');

/**
 * Advanced AI Controller
 * Uses OpenRouter to parse intent and executes real DB queries.
 */
class AiController {

  static async chat(req, res) {
    const { message, userId, history, context } = req.body;

    // Prioritize explicit userId from body, fallback to authenticated user id from JWT
    const finalUserId = userId || req.user?.id;

    console.log(`[AI Chat] Request from User ID: ${finalUserId} (Explicit in body: ${userId}, Authenticated: ${req.user?.id})`);

    if (!finalUserId) {
      return res.status(401).json({
        response: "User identity not found. Please log in again.",
        action: { type: 'NAVIGATE', payload: '/auth/login' }
      });
    }

    // Fetch user from DB to get their personal API key
    let user;
    try {
      user = await User.findByPk(finalUserId);
    } catch (dbError) {
      console.error("[AI Chat] DB Error fetching user:", dbError);
    }

    if (!user) {
      console.warn(`[AI Chat] User not found in DB for ID: ${finalUserId}`);
      return res.status(401).json({
        response: "Your account could not be verified. Please log in again.",
        action: { type: 'NAVIGATE', payload: '/auth/login' }
      });
    }

    const apiKey = user.aiApiKey || process.env.GROQ_API_KEY;
    const model = user.aiModel || process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    const shopUpiId = user.upiId || "raismansuri74059@okaxis"; // Fallback UPI

    // Determine the provider based on the model name
    const isOpenRouter = model.includes('/');
    const apiUrl = isOpenRouter 
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.groq.com/openai/v1/chat/completions";

    if (!apiKey) {
      console.error(`[AI Chat] ${isOpenRouter ? 'OpenRouter' : 'Groq'} API Key is missing.`);
      return res.status(500).json({
        response: `AI Assistant is not configured. Please add an ${isOpenRouter ? 'OpenRouter' : 'Groq'} API key to your settings.`,
        action: { type: 'HELP' }
      });
    }

    console.log(`[AI Chat] Using ${isOpenRouter ? 'OpenRouter' : 'Groq'} model: ${model}`);

    try {
      // Step 1: System Prompt Preparation
      const systemPrompt = `
        You are the VyaparPOS AI Assistant, a professional business analyst.
        Your goal is to help shopkeepers and consumers manage POS data and navigate the app.
        
        CHECKOUT FLOW (The user must follow these steps):
        1. Cart (Review items)
        2. Address (Confirm or Provide address in-chat)
        3. Payment (Choose UPI, Card, or Cash and pay)
        4. Confirm (Order success & Invoice generation)
        
        IN-CHAT ACTIONS:
        - When the user is ready to checkout, instead of navigating away, SHOW their current address or ask for a new one.
        - Use CONFIRMATION with message "Should I save this as your delivery address?" and onConfirm "Save Address".
        - Once address is confirmed, use SHOW_PAYMENT_METHODS to let them choose.
        
        PAYMENT INSTRUCTIONS:
        If user chooses UPI, use GENERATE_QR with the shop's UPI ID: ${shopUpiId}.
        Example: {"action": {"type": "GENERATE_QR", "payload": {"amount": 100, "name": "VyaparPOS", "upiId": "${shopUpiId}"}}}

        PAYMENT SUCCESS FLOW:
        - When the user says "I have completed the payment" or chooses a non-UPI method like "Card" or "Cash", simulate a success state.
        - Respond with ACTION: {"type": "SHOW_INVOICE", "payload": {"orderId": "ORD-2024-XXXX", "total": 500, "pdfLink": "..."}}
        - Then ask: "Would you like me to send this invoice to your email?".
        
        INVOICE & EMAIL:
        After payment success, always use SHOW_INVOICE first. Then offer SEND_INVOICE_EMAIL.
        
        COMMERCE CAPABILITIES & ACTIONS:
        - CONFIRMATION: {"message": "...", "onConfirm": "...", "onCancel": "..."}
        - SHOW_PRODUCTS: {"title": "...", "products": [...]} 
        - SHOW_CATEGORIES: {"categories": [...]}
        - ADD_TO_CART: {"products": [...]} 
        - NAVIGATE: "/cart"
        - SHOW_PAYMENT_METHODS: {"methods": ["UPI", "Card", "Cash"]}
        - GENERATE_QR: {"amount": 500, "name": "...", "upiId": "${shopUpiId}"}
        - SHOW_INVOICE: {"orderId": "...", "total": 0, "pdfLink": "..."}
        - SEND_INVOICE_EMAIL: {"orderId": "...", "email": "..."}
        - ADD_PRODUCT: {"name": "...", "category": "...", "price": 100, "stock": 50}
        - ADD_CATEGORY: {"name": "...", "description": "..."}

        Market Analysis Mode:
        If the user asks for "market analysis" or "trendy categories", suggest relevant bakery/retail categories (e.g., Gluten-free, Keto-friendly, Vegan Delights, Seasonal Specials) and then offer to add them.

        IMPORTANT FORMATTING RULES:
        1. ALWAYS wrap your actions in a single JSON block at the VERY END of your message.
        2. Format: ACTION: {"type": "ACTION_NAME", "payload": { ... }}
        3. NEVER include the JSON block inside your natural language sentences.
        4. NEVER include any text, punctuation, or greetings AFTER the JSON block.
        5. If you provide multiple actions, combine them into a single response if possible or prioritize the most relevant one.
        
        Example:
        "Sure, I'll add that to your cart. ACTION: {"type": "ADD_TO_CART", "payload": {"products": [...]}}"
        - If user says "add 5 categories", use ADD_MULTIPLE_CATEGORIES.
        - If details are missing, ask for them instead of making them up.
        - For imagery, use valid placeholder URLs if none provided, or ask user.

        NAVIGATION CAPABILITY:
        If the user wants to go to a page, respond with a specific action JSON:
        {"action": {"type": "NAVIGATE", "payload": "ROUTE_PATH"}}
        
        VALID ROUTE_PATHS:
        - /dashboard (Overview stats)
        - /products (Product listing/POS)
        - /customers (Customer management)
        - /reports (General business reports)
        - /reports/payments (Payment history)
        - /support (Help desk / tickets)
        - /cart (Current shopping cart)
        - /checkout/address (Checkout: User Details/Address)
        - /checkout/payment (Checkout: Payment Options)
        - /orders (Order history)
        - /settings/categories (Manage categories)
        - /profile (User profile)
        - /settings/users (Staff management)
        - /settings/subscription (Plan & billing)
        - /settings/products (Inventory management)
        - /settings/permissions (Role based access)
        - /settings/expenses (Expense tracking)
        - /notifications (Updates & alerts)
        - /mobile-pos (Simplified POS for mobile)

        IMPORTANT:
        - NEVER mention raw route paths (e.g., /orders, /cart, /dashboard) in your text response. Use human-friendly names like "Order History" or "your overview" instead.
        - NEVER include technical keywords like "ACTION" or "JSON" in your natural language text.
        - ALWAYS provide a short natural language response like "Sure, I'm taking you there" along WITH the action JSON at the very end.
        - Use Indian Rupee (₹) for all currency values.
        - Be concise, professional, and helpful.
      `;

      // Step 2: Build Live Context from DB and Frontend
      let dataContext = "";
      const text = message.toLowerCase();

      // DB Context (Insights)
      if (text.includes('trending') || text.includes('best selling') || text.includes('popular')) {
        const trending = await AiController.getTrendingProducts(finalUserId);
        const cats = await AiController.getCategoryPerformance(finalUserId);
        dataContext += `\nBUSINESS INSIGHTS (TRENDING): ${JSON.stringify(trending)}\nCATEGORY REVENUE: ${JSON.stringify(cats)}`;
      } else if (text.includes('price') || text.includes('cheap') || text.includes('expensive') || text.includes('costly')) {
        const prices = await AiController.getProductPriceStats(finalUserId);
        dataContext += `\nPRODUCT PRICE STATS: ${JSON.stringify(prices)}`;
      } else if (text.includes('sale') || text.includes('revenue') || text.includes('profit') || text.includes('money') || text.includes('earning')) {
        const stats = await AiController.getQuickStats(finalUserId);
        dataContext += `\nREAL-TIME SALES STATS: ${JSON.stringify(stats)}`;
      } else if (text.includes('stock') || text.includes('inventory') || text.includes('product') || text.includes('available')) {
        const stock = await AiController.getLowStockInfo(finalUserId);
        dataContext += `\nINVENTORY CONTEXT: ${JSON.stringify(stock)}`;
      } else if (text.includes('customer') || text.includes('user') || text.includes('client')) {
        const customers = await AiController.getCustomerStats(finalUserId);
        dataContext += `\nCUSTOMER CONTEXT: ${JSON.stringify(customers)}`;
      } else if (text.includes('ticket') || text.includes('support') || text.includes('help') || text.includes('issue')) {
        const tickets = await AiController.getTicketStats(finalUserId);
        dataContext += `\nSUPPORT CONTEXT: ${JSON.stringify(tickets)}`;
      } else if (text.includes('expense') || text.includes('cost') || text.includes('spent')) {
        const expenses = await AiController.getExpenseStats(finalUserId);
        dataContext += `\nEXPENSE CONTEXT: ${JSON.stringify(expenses)}`;
      } else if (text.includes('order') || text.includes('history') || text.includes('status')) {
        const orders = await AiController.getRecentOrders(finalUserId);
        dataContext += `\nORDER CONTEXT (RECENT): ${JSON.stringify(orders)}`;
      }

      // Frontend Context (Current Cart, etc.)
      let frontendContext = "";
      if (context && context.cart) {
        frontendContext = `\nLIVE CART CONTEXT: Total: ₹${context.cart.total}, Count: ${context.cart.count}, Items: ${JSON.stringify(context.cart.items)}`;
      }

      // Step 3: Call LLM API (Groq/OpenRouter)
      const safeHistory = Array.isArray(history) ? history : [];

      const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      };

      if (isOpenRouter) {
        headers["HTTP-Referer"] = "https://vyapar-pos.vercel.app";
        headers["X-Title"] = "Vyapar POS";
        
        // Basic check for Groq key being used for OpenRouter
        if (apiKey.startsWith('gsk_')) {
          console.warn("[AI Chat] Warning: Using a Groq (gsk_) key for an OpenRouter model.");
        }
      }

      const lLMResponse = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt + dataContext + frontendContext },
            ...safeHistory,
            { role: "user", content: message }
          ],
          temperature: 0.2, // Lower temp for more reliable JSON extraction
          max_tokens: 1024
        })
      });

      const result = await lLMResponse.json();

      // Step 4: Validate API Response
      if (result.error) {
        console.error("[AI Chat] LLM API Error:", JSON.stringify(result.error, null, 2));
        let errorMsg = result.error.message || 'Unknown provider error';

        return res.status(500).json({
          response: `AI Error: ${errorMsg}`,
          action: { type: 'HELP' }
        });
      }

      if (!result.choices || !result.choices.length || !result.choices[0].message) {
        console.error("Unexpected LLM Response:", JSON.stringify(result, null, 2));
        return res.status(500).json({
          response: "The AI service returned an empty response. Please verify your API key.",
          action: { type: 'HELP' }
        });
      }

      const aiResponseContent = result.choices[0].message.content;
      console.log("AI Raw Response:", aiResponseContent);

      // Extract action if LLM returned one in JSON format
      let action = { type: 'NONE' };
      let cleanResponse = aiResponseContent;

      const extractJsonFromText = (text) => {
        const mdMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?[\s\S]*?\})\s*```/i);
        if (mdMatch) return { json: mdMatch[1], fullMatch: mdMatch[0] };

        const actionPattern = /\{[\s\S]*?"(?:action|type|methods|products|orderId)"/i;
        const match = text.match(actionPattern);
        if (!match) return null;

        const startIndex = match.index;
        let braceCount = 0;
        let foundFirstBrace = false;
        let endIndex = -1;

        for (let i = startIndex; i < text.length; i++) {
          if (text[i] === '{') { braceCount++; foundFirstBrace = true; }
          else if (text[i] === '}') { braceCount--; }
          if (foundFirstBrace && braceCount === 0) { endIndex = i + 1; break; }
        }

        if (endIndex !== -1) {
          const jsonStr = text.substring(startIndex, endIndex);
          return { json: jsonStr, fullMatch: jsonStr };
        }
        return null;
      };

      const actionData = extractJsonFromText(aiResponseContent);

      if (actionData) {
        try {
          const actionObj = JSON.parse(actionData.json);
          action = actionObj.action || actionObj;
          cleanResponse = aiResponseContent.replace(actionData.fullMatch, '').trim();
          
          // Cleanup common task prefixes
          cleanResponse = cleanResponse.replace(/ACTION:\s*$/i, '').trim();
          cleanResponse = cleanResponse.replace(/ACTION JSON:\s*$/i, '').trim();
          cleanResponse = cleanResponse.replace(/[.;:!]\s*$/, '').trim();
        } catch (e) {
          console.error("Failed to parse action JSON from LLM:", e.message);
        }
      }

      // Human-friendly fallback
      if (!cleanResponse) {
        if (action.type === 'NAVIGATE') cleanResponse = "Alright, let me take you there.";
        else if (action.type === 'ADD_TO_CART') cleanResponse = "Done! I've added those items to your cart.";
        else cleanResponse = "I've processed your request.";
      }

      res.json({
        response: cleanResponse,
        action: action
      });

    } catch (error) {
      console.error("AI Agent Error:", error);
      res.status(500).json({
        response: "Oops! I'm having trouble connecting to my brain right now.",
        error: error.message
      });
    }
  }

  // --- Helper Data Methods ---

  static async getQuickStats(userId) {
    const { Op } = require('sequelize');
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sales = await Sale.findAll({
      where: { timestamp: { [Op.gte]: startOfDay }, userId },
      raw: true
    });
    const expenses = await Expense.findAll({
      where: { date: { [Op.gte]: startOfDay }, userId },
      raw: true
    });

    const totalSales = sales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    return {
      todaySales: totalSales,
      todayExpenses: totalExpenses,
      todayProfit: totalSales - totalExpenses,
      saleCount: sales.length
    };
  }

  static async getLowStockInfo(userId) {
    const { Op, Sequelize } = require('sequelize');
    const lowStock = await Product.findAll({
      where: { stock: { [Op.lte]: Sequelize.col('minStockLevel') }, userId },
      limit: 5,
      raw: true
    });
    return { count: lowStock.length, items: lowStock.map(p => ({ name: p.name, stock: p.stock })) };
  }

  static async getCustomerStats(userId) {
    const totalCustomers = await Customer.count({ where: { userId } });
    const topCustomers = await Customer.findAll({
      where: { userId },
      order: [['totalSpent', 'DESC']],
      limit: 3,
      raw: true
    });
    return { totalCount: totalCustomers, topSpenders: topCustomers.map(c => ({ name: c.name, spent: c.totalSpent })) };
  }

  static async getTicketStats(userId) {
    const { Op } = require('sequelize');
    const openCount = await Ticket.count({ where: { status: { [Op.in]: ['Open', 'In Progress'] }, userId } });
    const recentTickets = await Ticket.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 3, raw: true });
    return { openCount, recent: recentTickets.map(t => ({ subject: t.subject, status: t.status })) };
  }

  static async getExpenseStats(userId) {
    const expenses = await Expense.findAll({ where: { userId }, order: [['date', 'DESC']], limit: 5, raw: true });
    return { recent: expenses.map(e => ({ title: e.title, amount: e.amount })) };
  }

  static async getRecentOrders(userId) {
    const orders = await Sale.findAll({
      where: { userId },
      order: [['timestamp', 'DESC']],
      limit: 3,
      raw: true
    });
    return orders.map(o => ({ orderId: o.orderId, total: o.totalAmount, status: o.status || 'Success', date: o.timestamp }));
  }

  static async getTrendingProducts(userId) {
    const { Op } = require('sequelize');
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const sales = await Sale.findAll({ where: { timestamp: { [Op.gte]: last30Days }, userId }, raw: true });
    return { count: sales.length }; // Simplified for now
  }

  static async getProductPriceStats(userId) {
    const cheapest = await Product.findAll({ where: { userId }, order: [['price', 'ASC']], limit: 3, raw: true });
    const expensive = await Product.findAll({ where: { userId }, order: [['price', 'DESC']], limit: 3, raw: true });
    return { cheapest: cheapest.map(p => ({ name: p.name, price: p.price })), expensive: expensive.map(p => ({ name: p.name, price: p.price })) };
  }

  static async getCategoryPerformance(userId) {
    return { message: "Category performance data requested" }; // Simplified
  }

  static async sendInvoice(req, res) {
    const { orderId, email } = req.body;
    return res.status(200).json({ message: `Invoice for order ${orderId} sent to ${email}.` });
  }
}

module.exports = AiController;
