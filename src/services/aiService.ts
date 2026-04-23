import { GoogleGenAI, Type } from "@google/genai";
import { Product, Order } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const aiService = {
  /**
   * Recommends products based on user's viewed products and purchase history.
   */
  async getRecommendedProducts(
    viewedProducts: Product[],
    allProducts: Product[],
    purchaseHistory: Order[] = []
  ): Promise<string[]> {
    try {
      const viewedNames = viewedProducts.map(p => p.name).join(", ");
      const purchasedNames = purchaseHistory.flatMap(o => o.items.map(i => i.name)).join(", ");
      const availableProducts = allProducts.map(p => ({ id: p.id, name: p.name, category: p.category }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze user behavior to provide highly accurate product recommendations. 
        User viewed: [${viewedNames}]. 
        User purchased: [${purchasedNames}]. 
        Available products: ${JSON.stringify(availableProducts)}. 
        Select the 4 most relevant product IDs. Ensure the selection is logical and precise based on categories and user interests. 
        Return ONLY a JSON array of product IDs.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("AI Recommendation Error:", error);
      return [];
    }
  },

  /**
   * AI Chatbot to answer customer queries.
   */
  async chatWithAssistant(
    message: string,
    products: Product[],
    history: { role: "user" | "model"; parts: { text: string }[] }[] = []
  ): Promise<string> {
    try {
      const productContext = products.map(p => `${p.name} (${p.category}): ${p.description} - Price: ${p.price}`).join("\n");
      
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `أنت مساعد تسوق ذكي وراقي لمتجر "BeePharma & More". 
          مهمتك هي مساعدة العملاء بأسلوب أنيق، منظم، ودقيق للغاية.
          استخدم لغة عربية فصحى بسيطة وأنيقة (أو لهجة بيضاء مهذبة جداً).
          يجب أن تكون إجاباتك مرتبة ومنظمة (استخدم النقاط إذا لزم الأمر).
          كن دقيقاً جداً في وصف المنتجات بناءً على البيانات المقدمة.
          إذا سألك العميل عن منتج غير موجود، اقترح بدائل مشابهة بذكاء.
          
          بيانات المنتجات المتاحة:
          ${productContext}
          
          قواعد التعامل:
          1. الأناقة: استخدم عبارات ترحيبية ووداعية راقية.
          2. الدقة: لا تقدم معلومات مغلوطة عن الأسعار أو المكونات.
          3. الترتيب: اجعل الردود سهلة القراءة ومنظمة.
          4. في حال عدم المعرفة: وجه العميل بلباقة للتواصل مع الدعم الفني البشري.`,
        },
        history: history as any,
      });

      const response = await chat.sendMessage({ message });
      return response.text || "I'm sorry, I couldn't process that request.";
    } catch (error) {
      console.error("AI Chat Error:", error);
      return "I'm having trouble connecting to my brain right now. Please try again later!";
    }
  },

  /**
   * Smart search that understands intent.
   */
  async smartSearch(query: string, products: Product[]): Promise<string[]> {
    try {
      const productList = products.map(p => ({ id: p.id, name: p.name, description: p.description }));
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `User search query: "${query}". 
        Perform a sophisticated semantic search to find the most relevant product IDs from: ${JSON.stringify(productList)}. 
        Understand the underlying intent, synonyms, and context. 
        Prioritize accuracy and relevance. Return ONLY a JSON array of product IDs.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("Smart Search Error:", error);
      return [];
    }
  },

  /**
   * Predicts inventory needs based on current stock and sales trends.
   */
  async predictInventory(products: Product[], orders: Order[]): Promise<any[]> {
    try {
      const inventoryData = products.map(p => ({
        id: p.id,
        name: p.name,
        currentStock: p.quantity,
        salesCount: orders.reduce((acc, o) => acc + o.items.filter(i => i.productId === p.id).reduce((sum, item) => sum + item.quantity, 0), 0)
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following inventory and sales data with high precision: ${JSON.stringify(inventoryData)}. 
        Predict restocking needs based on sales velocity and current stock. 
        For each prediction, provide a professional, elegant, and accurate reason in Arabic (اللغة العربية).
        The reason should be concise yet insightful.
        Return a JSON array of objects with {id, name, prediction, reason}.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                prediction: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ["id", "name", "prediction", "reason"]
            }
          }
        }
      });

      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("Inventory Prediction Error:", error);
      return [];
    }
  }
};
