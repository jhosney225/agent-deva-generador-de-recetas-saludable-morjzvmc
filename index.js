
```javascript
const Anthropic = require("@anthropic-ai/sdk");
const readline = require("readline");

const client = new Anthropic();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to get user input
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to generate healthy recipe using Claude with streaming
async function generateRecipe(preferences) {
  console.log("\n📝 Generating healthy recipe...\n");

  const prompt = `Generate a healthy recipe with the following preferences:
- Dietary restrictions: ${preferences.dietary || "None"}
- Preferred cuisines: ${preferences.cuisines || "Any"}
- Cooking time: ${preferences.cookingTime || "30-45 minutes"}
- Number of servings: ${preferences.servings || "4"}
- Main ingredients to include: ${preferences.ingredients || "Vegetables, lean protein"}

Please provide:
1. Recipe title
2. Ingredients list with quantities
3. Step-by-step cooking instructions
4. Nutritional information per serving (calories, protein, carbs, fat)
5. Health benefits of this recipe

Format the response clearly with sections.`;

  try {
    // Use streaming with Claude
    process.stdout.write("🍳 Recipe: ");

    let fullResponse = "";

    const stream = client.messages.stream({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        process.stdout.write(chunk.delta.text);
        fullResponse += chunk.delta.text;
      }
    }

    console.log("\n");
    return fullResponse;
  } catch (error) {
    console.error("Error generating recipe:", error);
    throw error;
  }
}

// Function to calculate estimated calories from recipe text
function extractCalorieInfo(recipeText) {
  const calorieMatch = recipeText.match(/(\d+)\s*(?:calories|kcal)/i);
  const proteinMatch = recipeText.match(/protein[:\s]+(\d+)g/i);
  const carbMatch = recipeText.match(/carbs?[:\s]+(\d+)g/i);
  const fatMatch = recipeText.match(/fat[:\s]+(\d+)g/i);

  return {
    calories: calorieMatch ? parseInt(calorieMatch[1]) : null,
    protein: proteinMatch ? parseInt(proteinMatch[1]) : null,
    carbs: carbMatch ? parseInt(carbMatch[1]) : null,
    fat: fatMatch ? parseInt(fatMatch[1]) : null,
  };
}

// Function to save recipe to file
function saveRecipe(recipe, filename = "recipe.txt") {
  const fs = require("fs");
  const timestamp = new Date().toLocaleString();
  const content = `Generated on: ${timestamp}\n\n${recipe}\n`;
  fs.appendFileSync(filename, content + "\n" + "=".repeat(80) + "\n\n");
  console.log(`✅ Recipe saved to ${filename}`);
}

// Main function
async function main() {
  console.log("🥗 Welcome to the Healthy Recipe Generator with Calories! 🥗\n");

  try {
    // Get user preferences
    console.log("Please answer the following questions about your preferences:\n");

    const dietary = await askQuestion(
      "Any dietary restrictions? (vegan/vegetarian/gluten-free/none): "
    );
    const cuisines = await askQuestion(
      "Preferred cuisines? (Mediterranean/Asian/Mexican/etc): "
    );
    const cookingTime = await askQuestion(
      "Preferred cooking time? (e.g., 15-30 minutes): "
    );
    const servings = await askQuestion("Number of servings? (default: 4): ");
    const ingredients = await askQuestion(
      "Main ingredients to include? (e.g., chicken, broccoli): "
    );

    const preferences = {
      dietary: dietary || "None",
      cuisines: cuisines || "Any",
      cookingTime: cookingTime || "30-45 minutes",
      servings: servings || "4",
      ingredients: ingredients || "Vegetables, lean protein",
    };

    // Generate recipe
    const recipe = await generateRecipe(preferences);

    // Extract calorie information
    const nutritionInfo = extractCalorieInfo(recipe);
    console.log("📊 Extracted Nutrition Information:");
    if (nutritionInfo.calories)
      console.log(`   Calories per serving: ${nutritionInfo.calories}`);
    if (nutritionInfo.protein)
      console.log(`   Protein: ${nutritionInfo.protein}g`);
    if (nutritionInfo.carbs) console.log(`   Carbs: ${nutritionInfo.carbs}g`);
    if (nutritionInfo.fat) console.log(`   Fat: ${nutritionInfo.fat}g`);

    // Ask if user wants to save
    const save = await askQuestion("\nWould you like to save this recipe? (y/n): ");
    if (save.toLowerCase() === "y") {
      saveRecipe(recipe);
    }

    // Ask if user wants another recipe
    const another = await askQuestion(
      "Would you like to generate another recipe? (y/n): "
    );
    if (another.toLowerCase() === "y") {
      rl.close();
      const newRl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      global.rl = newRl;
      