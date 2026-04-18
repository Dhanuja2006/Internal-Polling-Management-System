import catchAsync from '../Utils/catchAsync.js';
import { sendSuccess } from '../Utils/response.js';

/**
 * MOCK AI Controller to handle poll generation.
 * In a real-world scenario, you would integrate with OpenAI, Anthropic, or Gemini here.
 */
export const generatePoll = catchAsync(async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    // Simulate AI behavior with some hardcoded logic based on common prompts
    let question = "AI Generated: " + prompt.split(' ').slice(0, 5).join(' ') + "?";
    let options = ["Option 1", "Option 2", "Option 3"];

    if (prompt.toLowerCase().includes('lunch')) {
        question = "What should we have for team lunch this Friday?";
        options = ["Pizza & Pasta", "Sushi Platter", "Burgers & Fries", "Salad Bar"];
    } else if (prompt.toLowerCase().includes('meeting')) {
        question = "When is the best time for our weekly sync?";
        options = ["Monday Morning", "Tuesday Afternoon", "Wednesday Noon", "Thursday Morning"];
    } else if (prompt.toLowerCase().includes('feature')) {
        question = "Which feature should we prioritize for the next sprint?";
        options = ["Dark Mode", "Mobile App", "Analytics Dashboard", "API Integration"];
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return sendSuccess(res, 200, {
        question,
        options
    });
});
