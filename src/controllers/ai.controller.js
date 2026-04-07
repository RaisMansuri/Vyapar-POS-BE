const Product = require('../models/product.model');
const Sale = require('../models/sale.model');
const Expense = require('../models/expense.model');
const Customer = require('../models/customer.model');
const Ticket = require('../models/ticket.model');
const User = require('../models/user.model');

const AiChat = require('../models/aiChat.model');

/**
 * Advanced AI Controller
 * Uses Groq to parse intent and executes real DB queries.
 */
class AiController {

  static async getChatHistory(req, res) {
    try {
      const userId = req.user.id;
      const history = await AiChat.findAll({
        where: { userId },
        order: [['createdAt', 'ASC']],
        limit: 50,
        raw: true
      });
      res.json(history.map(h => ({ role: h.role, content: h.content, createdAt: h.createdAt })));
    } catch (error) {
      console.error("[AI Chat History] Error:", error.message);
      res.status(500).json({ error: "Failed to fetch chat history." });
    }
  }

  static async clearChatHistory(req, res) {
    try {
      const userId = req.user.id;
      await AiChat.destroy({ where: { userId } });
      res.json({ message: "Chat history cleared successfully." });
    } catch (error) {
      console.error("[AI Chat History] Error clearing:", error.message);
      res.status(500).json({ error: "Failed to clear chat history." });
    }
  }

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

    const apiKey = (user?.aiApiKey || process.env.GROQ_API_KEY || "").trim();
    const model = (user?.aiModel || process.env.GROQ_MODEL || "llama-3.1-8b-instant").trim();
    const shopUpiId = (user?.upiId || "raismansuri74059@okaxis").trim();

    const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

    if (!apiKey) {
      console.error(`[AI Chat] Groq API Key is missing for user: ${finalUserId}`);
      return res.status(401).json({
        response: "AI Assistant is not configured. Please contact the administrator or provide your own API key in settings.",
        action: { type: 'HELP' }
      });
    }

    console.log(`[AI Chat] Using Groq model: ${model} for User ID: ${finalUserId}`);

    try {
      // System Prompt Preparation
      const systemPrompt = `
        You are the VyaparPOS AI Assistant, a professional business analyst for the user with ID: ${finalUserId}.
        Your goal is to help shopkeepers and consumers manage POS data and navigate the app.
        
        CHECKOUT FLOW:
        1. Cart -> 2. Address -> 3. Payment -> 4. Confirm
        
        IN-CHAT ACTIONS:
        - For checkout: SHOW address, use CONFIRMATION, then SHOW_PAYMENT_METHODS.
        - For UPI: use GENERATE_QR with shop UPI: ${shopUpiId}.
        - For Success: use SHOW_INVOICE based on 'ORDER CONTEXT'.
        
        ACTION JSON RULES:
        1. Wrap in: ACTION: {"type": "NAME", "payload": { ... }} at the end.
        2. Provide 'total'/'amount' as numbers without ₹.
        
        VALID ACTIONS:
        - NAVIGATE: "/cart", "/dashboard", "/products", "/orders", etc.
        - SHOW_PRODUCTS, ADD_TO_CART, GENERATE_QR, SHOW_INVOICE, etc.
      `;

      // Build Context (keeping logic same but cleaner)
      let dataContext = "";
      const text = message.toLowerCase();
      
      // Fetch data based on keywords (using existing methods)
      if (text.includes('trending') || text.includes('popular')) {
        const trending = await AiController.getTrendingProducts(finalUserId);
        dataContext += `\nBUSINESS INSIGHTS: ${JSON.stringify(trending)}`;
      } else if (text.includes('sale') || text.includes('revenue')) {
        const stats = await AiController.getQuickStats(finalUserId);
        dataContext += `\nSALES STATS: ${JSON.stringify(stats)}`;
      } else if (text.includes('stock') || text.includes('inventory')) {
        const stock = await AiController.getLowStockInfo(finalUserId);
        dataContext += `\nINVENTORY: ${JSON.stringify(stock)}`;
      }

      const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      };

      const lLMResponse = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt + dataContext },
            ...(Array.isArray(history) ? history : []),
            { role: "user", content: message }
          ],
          temperature: 0.2,
          max_tokens: 1024
        })
      });

      const result = await lLMResponse.json();

      if (!lLMResponse.ok || result.error) {
        console.error("[AI Chat] Groq API Error:", JSON.stringify(result.error || result, null, 2));
        
        if (lLMResponse.status === 401) {
          return res.status(401).json({
            response: "The AI API key is invalid or has expired. Please check your configuration.",
            action: { type: 'HELP' }
          });
        }

        return res.status(lLMResponse.status).json({
          response: `AI Service Error: ${result.error?.message || 'Failed to communicate with Groq'}`,
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

      // Save to history (background)
      try {
        await AiChat.bulkCreate([
          { userId: finalUserId, role: 'user', content: message },
          { userId: finalUserId, role: 'assistant', content: aiResponseContent }
        ]);
      } catch (dbErr) {
        console.error("Failed to save AI chat to DB:", dbErr.message);
      }

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

          // Cleanup common task prefixes anywhere in the text
          cleanResponse = cleanResponse.replace(/ACTION:\s*/gi, '').trim();
          cleanResponse = cleanResponse.replace(/ACTION JSON:\s*/gi, '').trim();
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
      profitMargin: totalSales > 0 ? (((totalSales - totalExpenses) / totalSales) * 100).toFixed(2) + '%' : '0%',
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
    return orders.map(o => ({ 
      orderId: o.id, 
      total: Number(o.totalAmount), 
      status: o.status || 'Success', 
      date: o.timestamp 
    }));
  }

  static async getSaleById(saleId, userId, customerId = null) {
    const { Op } = require('sequelize');
    const whereClause = {
      id: saleId,
      [Op.or]: [
        { userId: userId },
        { customerId: customerId }
      ]
    };
    // If customerId is not provided, remove it from the OR condition
    if (customerId === null) {
      delete whereClause[Op.or][1];
      // If only userId remains, simplify the Op.or
      if (whereClause[Op.or].length === 1) {
        whereClause.userId = userId;
        delete whereClause[Op.or];
      }
    }

    const sale = await Sale.findOne({
      where: whereClause,
      raw: true
    });
    return sale;
  }

  static async getTrendingProducts(userId) {
    const { Op } = require('sequelize');
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const sales = await Sale.findAll({ where: { timestamp: { [Op.gte]: last30Days }, userId }, raw: true });

    // Aggregate product frequency
    const productCounts = {};
    sales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const name = item.name || 'Unknown';
        productCounts[name] = (productCounts[name] || 0) + (item.quantity || 1);
      });
    });

    const trending = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return { totalRecentSales: sales.length, top3: trending };
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
