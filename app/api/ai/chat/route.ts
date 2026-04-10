import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    const lowerMessage = message.toLowerCase()

    let response = ""

    if (lowerMessage.includes("forecast") || lowerMessage.includes("prediction")) {
      response = "You have forecasts available for 2026. The system uses seasonal naive + growth method with working days and seasonal index from 2023-2025 data. Navigate to the Forecast page to view predictions."
    } 
    else if (lowerMessage.includes("branch") || lowerMessage.includes("branches")) {
      response = "The system has 21 branches across 7 Australian regions (NSW, VIC, QLD, WA, SA, ACT, TAS). As HQ Admin, you can view and manage all branches."
    }
    else if (lowerMessage.includes("actuals") || lowerMessage.includes("data")) {
      response = "Actuals represent your historical performance data from 2023-2025. Go to the Actuals page to view detailed monthly data for your branches."
    }
    else if (lowerMessage.includes("user") || lowerMessage.includes("team")) {
      response = "As an HQ Admin, you can manage all users in the system. Visit the Users page to invite new team members or adjust permissions."
    }
    else if (lowerMessage.includes("help") || lowerMessage.includes("what can you do")) {
      response = "I can help you: Navigate to pages (say 'Go to forecast'), explain forecasts and predictions, show branch data, and answer questions about your role. Try asking about 'forecasts', 'branches', 'actuals', or 'users'."
    }
    else if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
      response = "Hello! I'm your 4casta AI assistant. I can help you navigate the app with voice commands or answer questions about your data. What would you like to know?"
    }
    else if (lowerMessage.includes("performance") || lowerMessage.includes("metrics") || lowerMessage.includes("stats")) {
      response = "Your performance metrics are available in the Dashboard. It shows key KPIs, forecast vs budget comparisons, and regional performance. Visit the Dashboard for a complete overview."
    }
    else {
      response = "I'm here to help! Try asking about: forecasts, branches, actuals, users, or performance data. You can also use voice commands like 'Go to forecast' to navigate."
    }

    return NextResponse.json({ response })
  } catch (error) {
    return NextResponse.json({ 
      response: "I'm here to help! Try asking about forecasts, branches, actuals, or users. Use voice commands like 'Go to forecast' to navigate." 
    }, { status: 200 })
  }
}