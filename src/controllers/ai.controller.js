const Product = require('../models/product.model');
const Sale = require('../models/sale.model');
const Expense = require('../models/expense.model');
const Customer = require('../models/customer.model');
const Ticket = require('../models/ticket.model');

/**
 * Advanced AI Controller
 * Uses OpenRouter to parse intent and executes real DB queries.
 */
class AiController {
  
  static async chat(req, res) {
    const { message, history } = req.body;
    
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ 
        response: "OpenRouter API Key is missing in backend .env file. Please add it to enable AI.",
        action: { type: 'HELP' }
      });
    }

    try {
      // Step 1: Intent Analysis & Tool Calling (Internal Simulation or direct LLM call)
      // For this implementation, we use a robust system prompt to let the LLM decide which data it needs.
      
      const systemPrompt = `
        You are the VyaparPOS AI Assistant, a professional business analyst.
        Your goal is to help shopkeepers manage their POS data and navigate the app.
        
        AVAILABLE DATA CONTEXT:
        - Products: name, price, costPrice, stock, category.
        - Sales: totalAmount, items, paymentMethod, timestamp, paymentStatus.
        - Expenses: title, amount, category, date, description.
        - Customers: name, email, phone, totalOrders, totalSpent, walletBalance.
        - Support Tickets: subject, status, priority, description.

        COMMERCE CAPABILITIES & ACTIONS:
        If the user wants to perform a business action, respond with the appropriate JSON action:

        1. ADD TO CART:
           {"action": {"type": "ADD_TO_CART", "payload": {"products": [{"id": "...", "name": "...", "quantity": 1, "price": 0}]}}}
           Use this when the user says "Add [product] to cart" or "I want to buy [product]".
        AVAILABLE ACTIONS (respond with JSON like {"action": {"type": "ACTION_TYPE", "payload": {...}}}):
        - ADD_TO_CART: {"products": [{"name": "...", "quantity": 1}, ...]} 
          (Use this for "Buy [quantity] [product]" or "Add [product] to cart". Provide product NAMES, the system will find them.)
        - NAVIGATE: "/cart" (Use this for "checkout", "generate invoice", or "payment options")
        - GENERATE_QR: {"amount": 500, "orderId": "..."}
        - SHOW_INVOICE: {"orderId": "..."}
        - CHECK_DETAILS: {}
        - ADD_PRODUCT: {"name": "...", "category": "...", "price": 100, "stock": 50, "gstRate": 18, "imageUrl": "...", "description": "..."}
        - ADD_MULTIPLE_PRODUCTS: {"products": [{"name": "...", ...}, ...]}
        - ADD_CATEGORY: {"name": "...", "description": "..."}
        - ADD_MULTIPLE_CATEGORIES: {"categories": [{"name": "...", "description": "..."}, ...]}

        Market Analysis Mode:
        If the user asks for "market analysis" or "trendy categories", suggest relevant bakery/retail categories (e.g., Gluten-free, Keto-friendly, Vegan Delights, Seasonal Specials) and then offer to add them.

        Important: 
        - After adding products to the cart, naturally ASK the user: "Would you like to check out now?".
        - If the user says "Yes" (or similar affirmative) to checking out, respond with ACTION: {"type": "NAVIGATE", "payload": "/checkout/address"}.
        - DO NOT include the JSON action in your natural language response text. It should be extracted by our system.
        - Always include a natural language confirmation (e.g. "Sure, I've added those items to your cart.").
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
        - ALWAYS provide a short natural language response like "Sure, I'm taking you there" or "Here are the sales stats" ALONG WITH the action JSON.
        - If the user asks for business data (sales, profit, stock, customers, tickets), include the "REAL-TIME STATS" provided in your prompt.
        - Use Indian Rupee (₹) for all currency values.
        - Be concise, professional, and helpful.
      `;

      // Before calling LLM, we'll pre-fetch some metadata to give it context if the message looks data-related
      let dataContext = "";
      const text = message.toLowerCase();

      if (text.includes('sale') || text.includes('revenue') || text.includes('profit') || text.includes('money')) {
        const stats = await AiController.getQuickStats();
        dataContext = `\nREAL-TIME SALES STATS: ${JSON.stringify(stats)}`;
      } else if (text.includes('stock') || text.includes('inventory') || text.includes('product')) {
        const stock = await AiController.getLowStockInfo();
        dataContext = `\nINVENTORY CONTEXT: ${JSON.stringify(stock)}`;
      } else if (text.includes('customer') || text.includes('user') || text.includes('client')) {
        const customers = await AiController.getCustomerStats();
        dataContext = `\nCUSTOMER CONTEXT: ${JSON.stringify(customers)}`;
      } else if (text.includes('ticket') || text.includes('support') || text.includes('help') || text.includes('issue')) {
        const tickets = await AiController.getTicketStats();
        dataContext = `\nSUPPORT CONTEXT: ${JSON.stringify(tickets)}`;
      } else if (text.includes('expense') || text.includes('cost') || text.includes('spent')) {
        const expenses = await AiController.getExpenseStats();
        dataContext = `\nEXPENSE CONTEXT: ${JSON.stringify(expenses)}`;
      }

      // Step 2: Call OpenRouter
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:4200",
          "X-Title": "VyaparPOS Assistant",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-lite-preview-02-05:free",
          messages: [
            { role: "system", content: systemPrompt + dataContext },
            ...history,
            { role: "user", content: message }
          ]
        })
      });

      const result = await response.json();
      
      // Step 3: Validate API Response
      if (result.error) {
        console.error("OpenRouter API Error:", result.error);
        return res.status(500).json({
          response: `AI Error: ${result.error.message || 'Unknown provider error'}`,
          action: { type: 'HELP' }
        });
      }

      if (!result.choices || !result.choices.length || !result.choices[0].message) {
        console.error("Unexpected OpenRouter Response:", result);
        return res.status(500).json({
          response: "The AI service returned an empty or invalid response. Please try again later.",
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
        const mdMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?"action"[\s\S]*?\})\s*```/i);
        if (mdMatch) {
          return {
            json: mdMatch[1],
            fullMatch: mdMatch[0] // Includes the ``` markers for removal
          };
        }

        // 2. Fallback: standard balanced brace matching for raw JSON
        const actionPattern = /\{\s*"action"/i;
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
          
          // Clean up trailing punctuation if it was followed by JSON
          cleanResponse = cleanResponse.replace(/[.;:!]\s*$/, '').trim();

          // Clean up common technical filler phrases that LLMs use before JSON
          cleanResponse = cleanResponse.replace(/here's the action:?|here is the action:?|the following action:?/gi, '').trim();
          
          // Clean possible stray markdown delimiters
          cleanResponse = cleanResponse.replace(/```json|```/g, '').trim();
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

  static async getQuickStats() {
    const { Op } = require('sequelize');
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);

    const sales = await Sale.findAll({ where: { timestamp: { [Op.gte]: startOfDay } }, raw: true });
    const expenses = await Expense.findAll({ where: { date: { [Op.gte]: startOfDay } }, raw: true });

    const totalSales = sales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    // Simple profit calculation
    const saleCosts = sales.reduce((sum, s) => {
        return sum + (s.items || []).reduce((itemSum, item) => itemSum + (Number(item.costPrice || 0) * Number(item.quantity || 0)), 0);
    }, 0);

    return {
      todaySales: totalSales,
      todayExpenses: totalExpenses,
      todayProfit: totalSales - saleCosts - totalExpenses,
      saleCount: sales.length
    };
  }

  static async getLowStockInfo() {
    const { Op, Sequelize } = require('sequelize');
    const lowStock = await Product.findAll({ 
      where: {
        stock: { [Op.lte]: Sequelize.col('minStockLevel') }
      },
      limit: 5,
      raw: true
    });

    const count = await Product.count({
      where: {
        stock: { [Op.lte]: Sequelize.col('minStockLevel') }
      }
    });

    return {
      count,
      items: lowStock.map(p => ({ name: p.name, stock: p.stock }))
    };
  }

  static async getCustomerStats() {
    const totalCustomers = await Customer.count();
    const topCustomers = await Customer.findAll({ 
      order: [['totalSpent', 'DESC']],
      limit: 3,
      raw: true
    });
    
    return {
      totalCount: totalCustomers,
      topSpenders: topCustomers.map(c => ({ name: c.name, spent: c.totalSpent }))
    };
  }

  static async getTicketStats() {
    const { Op } = require('sequelize');
    const openCount = await Ticket.count({ 
      where: { status: { [Op.in]: ['Open', 'In Progress'] } } 
    });
    const recentTickets = await Ticket.findAll({ 
      order: [['createdAt', 'DESC']], 
      limit: 3, 
      raw: true 
    });

    return {
      openCount,
      recent: recentTickets.map(t => ({ subject: t.subject, status: t.status, priority: t.priority }))
    };
  }

  static async getExpenseStats() {
    const { Sequelize } = require('sequelize');
    const expenses = await Expense.findAll({ 
      order: [['date', 'DESC']], 
      limit: 10, 
      raw: true 
    });
    const totalByStatus = await Expense.findAll({
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
}

module.exports = AiController;
