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
    const { message, userId, history } = req.body;

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

    if (!apiKey) {
      console.error("[AI Chat] Groq API Key is missing for user or global config.");
      return res.status(500).json({
        response: "AI Assistant is not configured. Please add a Groq API key to your profile settings.",
        action: { type: 'HELP' }
      });
    }

    console.log(`[AI Chat] Using Groq model: ${model}, API Key masked: ${apiKey.substring(0, 8)}... (UPI: ${shopUpiId})`);

    try {
      // Step 1: Intent Analysis & Tool Calling
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

      // Before calling LLM, we'll pre-fetch some metadata to give it context if the message looks data-related
      let dataContext = "";
      const text = message.toLowerCase();

      if (text.includes('trending') || text.includes('best selling') || text.includes('popular')) {
        const trending = await AiController.getTrendingProducts(finalUserId);
        const cats = await AiController.getCategoryPerformance(finalUserId);
        dataContext = `\nBUSINESS INSIGHTS (TRENDING): ${JSON.stringify(trending)}\nCATEGORY REVENUE: ${JSON.stringify(cats)}`;
      } else if (text.includes('price') || text.includes('cheap') || text.includes('expensive') || text.includes('costly')) {
        const prices = await AiController.getProductPriceStats(finalUserId);
        dataContext = `\nPRODUCT PRICE STATS: ${JSON.stringify(prices)}`;
      } else if (text.includes('sale') || text.includes('revenue') || text.includes('profit') || text.includes('money')) {
        const stats = await AiController.getQuickStats(finalUserId);
        dataContext = `\nREAL-TIME SALES STATS: ${JSON.stringify(stats)}`;
      } else if (text.includes('stock') || text.includes('inventory') || text.includes('product')) {
        const stock = await AiController.getLowStockInfo(finalUserId);
        dataContext = `\nINVENTORY CONTEXT: ${JSON.stringify(stock)}`;
      } else if (text.includes('customer') || text.includes('user') || text.includes('client')) {
        const customers = await AiController.getCustomerStats(finalUserId);
        dataContext = `\nCUSTOMER CONTEXT: ${JSON.stringify(customers)}`;
      } else if (text.includes('ticket') || text.includes('support') || text.includes('help') || text.includes('issue')) {
        const tickets = await AiController.getTicketStats(finalUserId);
        dataContext = `\nSUPPORT CONTEXT: ${JSON.stringify(tickets)}`;
      } else if (text.includes('expense') || text.includes('cost') || text.includes('spent')) {
        const expenses = await AiController.getExpenseStats(finalUserId);
        dataContext = `\nEXPENSE CONTEXT: ${JSON.stringify(expenses)}`;
      }

      // Step 2: Call Groq API (OpenAI Compatible)
      const safeHistory = Array.isArray(history) ? history : [];

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt + dataContext },
            ...safeHistory,
            { role: "user", content: message }
          ],
          temperature: 0.2, // Lower temp for more reliable JSON extraction
          max_tokens: 1024
        })
      });

      const result = await response.json();

      // Step 3: Validate API Response
      if (result.error) {
        console.error("[AI Chat] Groq API Error:", JSON.stringify(result.error, null, 2));
        let errorMsg = result.error.message || 'Unknown Groq error';

        return res.status(500).json({
          response: `AI Error (Groq): ${errorMsg}`,
          action: { type: 'HELP' }
        });
      }

      if (!result.choices || !result.choices.length || !result.choices[0].message) {
        console.error("Unexpected Groq Response:", JSON.stringify(result, null, 2));
        return res.status(500).json({
          response: "The Groq service returned an empty or invalid response. Please verify your API key and model availability.",
          action: { type: 'HELP' }
        });
      }

      const aiResponseContent = result.choices[0].message.content;
      console.log("AI Raw Response:", aiResponseContent);

      // Extract action if LLM returned one in JSON format
      let action = { type: 'NONE' };
      let cleanResponse = aiResponseContent;

      // Extract JSON using a robust scanner for balanced braces
      const extractJsonFromText = (text) => {
        // 1. Try to find JSON inside markdown code blocks first
        const mdMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?[\s\S]*?\})\s*```/i);
        if (mdMatch) {
          return {
            json: mdMatch[1],
            fullMatch: mdMatch[0]
          };
        }

        // 2. Look for action types followed by JSON (e.g., SHOW_PAYMENT_METHODS: {...})
        try {
          const parsed = JSON.parse(typeMatch[2]);
          let actionObj;

          // If it's prefixed with "ACTION:", we expect the JSON to be the action itself
          if (typeMatch[1].toUpperCase() === 'ACTION' && parsed.type) {
            actionObj = parsed;
          } else if (parsed.action && parsed.action.type) {
            actionObj = parsed.action;
          } else {
            // It's a raw payload prefixed by the type name (e.g. SHOW_PAYMENT_METHODS: {...})
            actionObj = { type: typeMatch[1].toUpperCase(), payload: parsed };
          }

          return {
            json: JSON.stringify({ action: actionObj }),
            fullMatch: typeMatch[0]
          };
        } catch (e) { /* ignore and continue to fallback */ }

        // 3. Fallback: standard balanced brace matching for raw JSON
        const actionPattern = /\{[\s\S]*?"(?:action|type|methods|products|orderId)"/i;
        const match = text.match(actionPattern);
        if (!match) return null;

        const startIndex = match.index;
        let braceCount = 0;
        let foundFirstBrace = false;
        let endIndex = -1;

        for (let i = startIndex; i < text.length; i++) {
          if (text[i] === '{') {
            braceCount++;
            foundFirstBrace = true;
          } else if (text[i] === '}') {
            braceCount--;
          }

          if (foundFirstBrace && braceCount === 0) {
            endIndex = i + 1;
            break;
          }
        }

        if (endIndex !== -1) {
          const jsonStr = text.substring(startIndex, endIndex);
          return {
            json: jsonStr,
            fullMatch: jsonStr
          };
        }
        return null;
      };

      const actionData = extractJsonFromText(aiResponseContent);

      if (actionData) {
        try {
          const actionObj = JSON.parse(actionData.json);
          action = actionObj.action || actionObj;

          // Remove the JSON string (and markdown block) from the response
          cleanResponse = aiResponseContent.replace(actionData.fullMatch, '').trim();

          // Remove various prefixes that LLMs use for actions
          cleanResponse = cleanResponse.replace(/ACTION:\s*$/i, '').trim();
          cleanResponse = cleanResponse.replace(/ACTION\s*$/i, '').trim();
          cleanResponse = cleanResponse.replace(/ACTION JSON:\s*$/i, '').trim();

          // Remove internal route mentions (e.g. "/orders", "/cart") to keep it human-friendly
          cleanResponse = cleanResponse.replace(/\/\w+ (page|route|link)/gi, '').trim();
          cleanResponse = cleanResponse.replace(/navidate to \/\w+/gi, 'take you there').trim();
          cleanResponse = cleanResponse.replace(/\/\w+/g, (match) => {
            // Only replace if it looks like a specific route we know
            const routes = ['/dashboard', '/products', '/customers', '/reports', '/support', '/cart', '/orders', '/settings', '/profile', '/checkout'];
            return routes.some(r => match.startsWith(r)) ? '' : match;
          }).trim();

          // Clean up trailing punctuation if it was followed by JSON
          cleanResponse = cleanResponse.replace(/[.;:!]\s*$/, '').trim();

          // Final cleanup for common technical filler phrases
          cleanResponse = cleanResponse.replace(/here's the action:?|here is the action:?|the following action:?/gi, '').trim();
        } catch (e) {
          console.error("Failed to parse action JSON from LLM:", e.message);
          console.debug("Attempted JSON:", actionData.json);
        }
      }

      // Fallback message if the LLM only returned the action JSON
      if (!cleanResponse) {
        if (action.type === 'NAVIGATE') {
          const pageName = action.payload.replace('/', '');
          cleanResponse = `Certainly! I'm navigating you to the ${pageName} page now.`;
        } else if (action.type === 'ADD_TO_CART') {
          cleanResponse = "I've added those items to your cart for you!";
        } else if (action.type === 'GENERATE_QR') {
          cleanResponse = "Here is your UPI QR code for payment. Scan it to proceed.";
        } else if (action.type === 'SHOW_INVOICE') {
          cleanResponse = "Success! Your payment was processed. Here is your invoice summary.";
        } else {
          cleanResponse = "I've processed your request.";
        }
      }

      res.json({
        response: cleanResponse,
        action: action
      });

    } catch (error) {
      console.error("AI Agent Error:", error);
      res.status(500).json({
        response: "Oops! I'm having trouble connecting to my brain right now. Please check your internet or API configuration.",
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
      where: {
        timestamp: { [Op.gte]: startOfDay },
        userId
      },
      raw: true
    });
    const expenses = await Expense.findAll({
      where: {
        date: { [Op.gte]: startOfDay },
        userId
      },
      raw: true
    });

    const totalSales = sales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Simple profit calculation
    const saleCosts = sales.reduce((sum, s) => {
      let items = s.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
      }
      return sum + (items || []).reduce((itemSum, item) => itemSum + (Number(item.costPrice || 0) * Number(item.quantity || 0)), 0);
    }, 0);

    return {
      todaySales: totalSales,
      todayExpenses: totalExpenses,
      todayProfit: totalSales - saleCosts - totalExpenses,
      saleCount: sales.length
    };
  }

  static async getLowStockInfo(userId) {
    const { Op, Sequelize } = require('sequelize');
    const lowStock = await Product.findAll({
      where: {
        stock: { [Op.lte]: Sequelize.col('minStockLevel') },
        userId
      },
      limit: 5,
      raw: true
    });

    const count = await Product.count({
      where: {
        stock: { [Op.lte]: Sequelize.col('minStockLevel') },
        userId
      }
    });

    return {
      count,
      items: lowStock.map(p => ({ name: p.name, stock: p.stock }))
    };
  }

  static async getCustomerStats(userId) {
    const totalCustomers = await Customer.count({ where: { userId } });
    const topCustomers = await Customer.findAll({
      where: { userId },
      order: [['totalSpent', 'DESC']],
      limit: 3,
      raw: true
    });

    return {
      totalCount: totalCustomers,
      topSpenders: topCustomers.map(c => ({ name: c.name, spent: c.totalSpent }))
    };
  }

  static async getTicketStats(userId) {
    const { Op } = require('sequelize');
    const openCount = await Ticket.count({
      where: {
        status: { [Op.in]: ['Open', 'In Progress'] },
        userId
      }
    });
    const recentTickets = await Ticket.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 3,
      raw: true
    });

    return {
      openCount,
      recent: recentTickets.map(t => ({ subject: t.subject, status: t.status, priority: t.priority }))
    };
  }

  static async getExpenseStats(userId) {
    const { Sequelize } = require('sequelize');
    const expenses = await Expense.findAll({
      where: { userId },
      order: [['date', 'DESC']],
      limit: 10,
      raw: true
    });
    const totalByStatus = await Expense.findAll({
      where: { userId },
      attributes: [
        ['category', '_id'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total']
      ],
      group: ['category'],
      raw: true
    });

    return {
      recent: expenses.map(e => ({ title: e.title, amount: e.amount, category: e.category })),
      ByCategory: totalByStatus
    };
  }

  static async getTrendingProducts(userId) {
    const { Op } = require('sequelize');
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const sales = await Sale.findAll({
      where: {
        timestamp: { [Op.gte]: last30Days },
        userId
      },
      raw: true
    });

    const counts = {};
    sales.forEach(sale => {
      let items = sale.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
      }
      (items || []).forEach(item => {
        const name = item.name || 'Unknown';
        counts[name] = (counts[name] || 0) + (Number(item.quantity) || 0);
      });
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }

  static async getProductPriceStats(userId) {
    const cheapest = await Product.findAll({ where: { userId }, order: [['price', 'ASC']], limit: 3, raw: true });
    const expensive = await Product.findAll({ where: { userId }, order: [['price', 'DESC']], limit: 3, raw: true });
    return {
      cheapest: cheapest.map(p => ({ name: p.name, price: p.price })),
      expensive: expensive.map(p => ({ name: p.name, price: p.price }))
    };
  }

  static async getCategoryPerformance(userId) {
    const sales = await Sale.findAll({ where: { userId }, raw: true });
    const performance = {};
    sales.forEach(sale => {
      let items = sale.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
      }
      (items || []).forEach(item => {
        const cat = item.category || 'Uncategorized';
        performance[cat] = (performance[cat] || 0) + (Number(item.total) || 0);
      });
    });
    return Object.entries(performance)
      .sort(([, a], [, b]) => b - a)
      .map(([name, revenue]) => ({ name, revenue }));
  }

  static async sendInvoice(req, res) {
    try {
      const { orderId, email } = req.body;
      console.log(`[AI Chat] Sending invoice ${orderId} to ${email}`);

      // Simulation of email sending
      setTimeout(() => {
        console.log(`[AI Chat] Invoice ${orderId} sent successfully!`);
      }, 2000);

      return res.status(200).json({
        message: `Invoice for order ${orderId} has been sent to ${email} successfully.`
      });
    } catch (error) {
      console.error("[AI Chat] Error sending invoice email:", error);
      return res.status(500).json({ error: "Failed to send invoice email." });
    }
  }
}

module.exports = AiController;
