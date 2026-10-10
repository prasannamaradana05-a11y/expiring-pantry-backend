import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
// Groq Vision is called through the built-in fetch API.

dotenv.config();
const upload = multer({
  storage: multer.memoryStorage()
});

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));


// ==================== SCHEMAS ====================

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      unique: true,
    },
    password: String,
  },
  { timestamps: true }
);

const itemSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    quantity: Number,
    unit: String,
    expiryDate: Date,
    category: String,
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const PantryItem = mongoose.model("PantryItem", itemSchema);


// ==================== HELPER ====================

function withDays(item) {
  const expiry = new Date(item.expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    ...item.toObject(),
    daysLeft: Math.ceil((expiry - today) / 86400000),
  };
}


// ==================== HOME ====================

app.get("/", (_, res) => {
  res.json({
    message: "Expiring Pantry API is running",
  });
});


// ==================== REGISTER ====================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const exists = await User.findOne({
      email: email.toLowerCase(),
    });

    if (exists) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
    });

    res.status(201).json({
      message: "Registered",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Registration failed",
    });
  }
});


// ==================== LOGIN ====================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email?.toLowerCase(),
      password,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
    });
  }
});


// ==================== GET PANTRY ====================

app.get("/api/pantry/:userId", async (req, res) => {
  try {
    const items = await PantryItem.find({
      userId: req.params.userId,
    }).sort({
      expiryDate: 1,
    });

    res.json(items.map(withDays));
  } catch (error) {
    res.status(500).json({
      message: "Failed to load pantry",
    });
  }
});


// ==================== ADD PANTRY ITEM ====================

app.post("/api/pantry", async (req, res) => {
  try {
    const item = await PantryItem.create(req.body);

    res.status(201).json(withDays(item));
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message: "Invalid pantry item",
    });
  }
});


// ==================== DELETE PANTRY ITEM ====================

app.delete("/api/pantry/:id", async (req, res) => {
  try {
    await PantryItem.findByIdAndDelete(req.params.id);

    res.json({
      message: "Deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: "Delete failed",
    });
  }
});


// ==================== RECIPE DATABASE ====================

const recipes = [
  {
    name: "Spinach Dal",
    description:
      "A healthy protein-rich meal using spinach and lentils.",
    ingredients: ["spinach", "dal", "tomato", "onion"],
  },

  {
    name: "Vegetable Fried Rice",
    description:
      "A quick fried rice using available vegetables.",
    ingredients: ["rice", "carrot", "peas", "capsicum", "onion"],
  },

  {
    name: "Tomato Pasta",
    description:
      "Simple pasta using tomatoes and vegetables.",
    ingredients: ["tomato", "pasta", "onion", "garlic"],
  },

  {
    name: "Banana Oats Bowl",
    description:
      "A quick breakfast using ripe bananas and oats.",
    ingredients: ["banana", "oats", "milk"],
  },

  {
    name: "Vegetable Upma",
    description:
      "A simple breakfast using vegetables and semolina.",
    ingredients: ["upma", "rava", "carrot", "peas", "onion"],
  },

  {
    name: "Masala Dosa",
    description:
      "Crispy dosa with a simple potato filling.",
    ingredients: ["dosa", "potato", "onion"],
  },

  {
    name: "Egg Fried Rice",
    description:
      "Quick fried rice with egg and vegetables.",
    ingredients: ["rice", "egg", "onion", "carrot", "peas"],
  },

  {
    name: "Tomato Egg Curry",
    description:
      "A simple curry using eggs and ripe tomatoes.",
    ingredients: ["egg", "tomato", "onion"],
  },

  {
    name: "Cheese Vegetable Sandwich",
    description:
      "A quick sandwich using bread, vegetables and cheese.",
    ingredients: ["bread", "cheese", "tomato", "onion", "capsicum"],
  },

  {
    name: "Vegetable Soup",
    description:
      "A light soup using vegetables that need to be used soon.",
    ingredients: ["carrot", "tomato", "onion", "peas", "potato"],
  },

  {
    name: "Potato Curry",
    description:
      "Simple potato curry with onions and tomatoes.",
    ingredients: ["potato", "tomato", "onion"],
  },

  {
    name: "Fruit Oats Bowl",
    description:
      "Healthy oats with available fruits and milk.",
    ingredients: ["oats", "milk", "banana", "apple"],
  },

  {
    name: "Vegetable Noodles",
    description:
      "Quick noodles with fresh vegetables.",
    ingredients: ["noodles", "carrot", "capsicum", "onion"],
  },

  {
    name: "Paneer Vegetable Stir Fry",
    description:
      "Protein-rich paneer with fresh vegetables.",
    ingredients: ["paneer", "capsicum", "onion", "tomato"],
  },
];


// ==================== SMART RECIPE RECOMMENDATION ====================

app.get("/api/recipes/smart/:userId", async (req, res) => {
  try {
    const items = await PantryItem.find({
      userId: req.params.userId,
    });

    const pantryItems = items.map(withDays);

    // No pantry items
    if (pantryItems.length === 0) {
      return res.json([]);
    }

    const recommendations = recipes
      .map((recipe) => {
        const matchedItems = pantryItems.filter((item) => {
          const pantryName = item.name.toLowerCase().trim();

          return recipe.ingredients.some((ingredient) => {
            const recipeIngredient = ingredient.toLowerCase().trim();

            return (
              pantryName.includes(recipeIngredient) ||
              recipeIngredient.includes(pantryName)
            );
          });
        });

        // Sort matched ingredients by expiry
        matchedItems.sort((a, b) => a.daysLeft - b.daysLeft);

        const matchedIngredients = matchedItems.map(
          (item) => item.name
        );

        const priorityItem = matchedItems[0];

        return {
          name: recipe.name,
          description: recipe.description,
          ingredients: recipe.ingredients,

          matchedIngredients,

          matchCount: matchedItems.length,

          priorityIngredient:
            priorityItem?.name || null,

          daysLeft:
            priorityItem?.daysLeft ?? null,

          urgency:
            priorityItem?.daysLeft ?? 999,
        };
      })

      // Only show recipes that use something
      // from the user's pantry
      .filter((recipe) => recipe.matchCount > 0)

      // First: closest expiry
      // Second: most matching ingredients
      .sort((a, b) => {
        if (a.urgency !== b.urgency) {
          return a.urgency - b.urgency;
        }

        return b.matchCount - a.matchCount;
      });

    res.json(recommendations);
  } catch (error) {
    console.error("Recipe recommendation error:", error);

    res.status(500).json({
      message: "Failed to generate recipe recommendations",
    });
  }
});
// =========================
// GROQ VISION AI
// =========================
app.post("/api/vision/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({
        message: "Vision AI is not configured. Add GROQ_API_KEY to backend environment variables."
      });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Unsupported image type. Upload a JPG, PNG, WEBP, or GIF image."
      });
    }

    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const prompt = `
You are a careful grocery and pantry OCR assistant. Inspect the image closely for food products AND printed expiry/best-before/use-by dates on their packages.
Return ONLY valid JSON in this shape:
{"items":[{"name":"Milk","quantity":1,"unit":"pack","category":"Dairy","expiryDate":"2026-10-15","expiryDateConfidence":"high","expiryDateText":"EXP 15/10/2026"}]}
Rules:
- Identify each clearly visible food item; never invent products or dates.
- Read expiry dates only when printed date is legible and clearly associated with that product.
- Read the full package carefully, especially text immediately after EXP, EXPIRY, USE BY, BEST BEFORE, or BB.
- Convert clearly read expiry dates to YYYY-MM-DD. Interpret numeric dates on Indian grocery packaging as DD/MM/YY or DD/MM/YYYY unless the printed format clearly says otherwise.
- For a clearly printed two-digit year on an explicitly labelled expiry date (for example, "EXPIRY: 09/09/26"), interpret 26 as 2026 and return "2026-09-09". Do not reject a date only because the year has two digits.
- Distinguish EXP/expiry/use-by/best-before from manufacture/MFG/packed-on dates. Never use a manufacture date as expiry when an expiry label is visible.
- If multiple dates are visible, choose the date explicitly labelled EXP/EXPIRY/USE BY/BEST BEFORE, not a nearby MFG/PKD date. Preserve the exact relevant label and date in expiryDateText.
- If the expiry date is genuinely missing, obscured, or unreadable, set expiryDate to null and expiryDateConfidence to "low". Do not invent digits.
- If there is no clear label and the date meaning cannot be determined, set expiryDate to null rather than guessing.
- Use quantity 1 when quantity cannot reasonably be estimated. Units: kg, g, litre, ml, pcs, pack, loaf.
- Categories: Vegetables, Fruits, Dairy, Grains, Bakery, Protein, Beverages, Snacks, Other.
- Loose fresh produce without packaging/date labels must have expiryDate null.
- Include name, quantity, unit, category, expiryDate, expiryDateConfidence, and expiryDateText for every item.
`

    const apiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }],
        response_format: { type: "json_object" },
        max_tokens: 1200
      })
    });

    const body = await apiResponse.json();
    if (!apiResponse.ok) {
      console.error("Groq Vision API error:", apiResponse.status, body);
      return res.status(apiResponse.status === 429 ? 429 : 502).json({
        message: "Vision AI analysis failed",
        error: body?.error?.message || "Groq Vision request failed"
      });
    }

    const content = body?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Groq Vision returned an empty response");
    const result = JSON.parse(content);
    if (!result || !Array.isArray(result.items)) {
      throw new Error('Response must contain an "items" array');
    }

    result.items = result.items
      .filter(item => item && typeof item.name === "string" && item.name.trim())
      .map(item => ({
        name: item.name.trim(),
        quantity: Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1,
        unit: typeof item.unit === "string" && item.unit.trim() ? item.unit.trim() : "pcs",
        category: typeof item.category === "string" && item.category.trim() ? item.category.trim() : "Other",
        expiryDate: typeof item.expiryDate === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(item.expiryDate) ? item.expiryDate : null,
        expiryDateConfidence: ["high", "medium", "low"].includes(item.expiryDateConfidence) ? item.expiryDateConfidence : "low",
        expiryDateText: typeof item.expiryDateText === "string" ? item.expiryDateText : null
      }));
    return res.json(result);
  } catch (error) {
    console.error("Groq Vision error:", error);
    return res.status(500).json({ message: "Vision AI analysis failed", error: error.message });
  }
});

// ==================== USE / CONSUME PANTRY ITEM ====================

app.put("/api/pantry/:id/use", async (req, res) => {
  try {
    const { quantityUsed } = req.body;

    if (!quantityUsed || quantityUsed <= 0) {
      return res.status(400).json({
        message: "Enter a valid quantity used"
      });
    }

    const item = await PantryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "Pantry item not found"
      });
    }

    if (quantityUsed > item.quantity) {
      return res.status(400).json({
        message: "Used quantity cannot be greater than available quantity"
      });
    }

    item.quantity = item.quantity - quantityUsed;

    // If completely used, remove it from Available Items
    if (item.quantity <= 0) {
      await PantryItem.findByIdAndDelete(req.params.id);

      return res.json({
        message: "Item completely used",
        deleted: true
      });
    }

    await item.save();

    res.json({
      message: "Item quantity updated",
      deleted: false,
      item: withDays(item)
    });

  } catch (error) {
    console.error("Use item error:", error);

    res.status(500).json({
      message: "Failed to update item quantity"
    });
  }
});
// ==================== EDIT PANTRY ITEM ====================

app.put("/api/pantry/:id", async (req, res) => {
  try {
    const {
      name,
      quantity,
      unit,
      expiryDate,
      category
    } = req.body;

    const item = await PantryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "Pantry item not found"
      });
    }

    item.name = name;
    item.quantity = quantity;
    item.unit = unit;
    item.expiryDate = expiryDate;
    item.category = category;

    await item.save();

    res.json({
      message: "Pantry item updated successfully",
      item: withDays(item)
    });

  } catch (error) {
    console.error("Edit item error:", error);

    res.status(500).json({
      message: "Failed to update pantry item"
    });
  }
});
// ==================== START SERVER ====================

app.listen(
  process.env.PORT || 5000,
  () => {
    console.log(
      `Server running on port ${process.env.PORT || 5000}`
    );
  }
);