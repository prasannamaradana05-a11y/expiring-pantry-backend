import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

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
// GEMINI VISION AI
// =========================

app.post("/api/vision/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded"
      });
    }

    const base64Image = req.file.buffer.toString("base64");

    const prompt = `
Analyze this grocery/pantry image.

Identify all clearly visible food ingredients or grocery items.

Do not identify people, furniture, plates, bags, shelves,
packaging material, or other non-food objects.

Return ONLY valid JSON in this exact format:

{
  "items": [
    {
      "name": "Tomato",
      "quantity": 1,
      "unit": "kg",
      "category": "Vegetables"
    }
  ]
}

Rules:
- Detect multiple different food items if visible.
- Use common grocery names.
- Estimate quantity only when reasonably visible; otherwise use 1.
- Use suitable units: kg, g, litre, ml, pcs, pack, loaf.
- Categories:
  Vegetables, Fruits, Dairy, Grains, Bakery,
  Protein, Beverages, Snacks, Other.
- Do not invent items that are not visible.
- Return JSON only.
`;

    // Try Gemini up to 3 times if the service is temporarily unavailable
    let response;
    let lastError;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Gemini attempt ${attempt}/3...`);

        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: req.file.mimetype,
                    data: base64Image
                  }
                },
                {
                  text: prompt
                }
              ]
            }
          ]
        });

        break;

      } catch (error) {
        lastError = error;

        if (error.status === 503 && attempt < 3) {
          console.log(
            "Gemini temporarily unavailable. Retrying in 3 seconds..."
          );

          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          throw error;
        }
      }
    }

    if (!response) {
      throw lastError || new Error("Gemini did not return a response");
    }

    const text = response.text?.trim();

    console.log("Gemini response:", text);

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    // Remove markdown code fences if Gemini adds them
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Extract JSON object if Gemini adds extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Gemini did not return valid JSON");
    }

    const result = JSON.parse(jsonMatch[0]);

    res.json(result);

  } catch (error) {
    console.error("Vision AI error:", error);

    res.status(500).json({
      message: "Vision AI analysis failed",
      error: error.message
    });
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