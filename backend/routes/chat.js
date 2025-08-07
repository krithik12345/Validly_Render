const express = require('express');
const { LinkupClient } = require('linkup-sdk');
const { GoogleGenAI, Type } = require('@google/genai');
const router = express.Router();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const linkup = new LinkupClient({
  apiKey: process.env.LINKUP_API_KEY
});

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});



const mockPath = path.join(__dirname, '..', 'testcases', 'mockLinkupResponse.json');
const loadMock = () => JSON.parse(fs.readFileSync(mockPath, 'utf-8'));

// Gemini structured output schemas
const geminiPitchSchema = {
  type: Type.OBJECT,
  properties: {
    pitch: {
      type: Type.STRING,
      description: "A compelling five-sentence pitch that follows these guidelines: 1. Hook: Start with a compelling statement that grabs attention 2. Value: Clearly state the core value proposition 3. Evidence: Support with market data and validation 4. Differentiator: Explain how it stands out from competitors 5. Call to Action: End with a clear next step or invitation"
    }
  },
  propertyOrdering: ["pitch"]
};

const geminiRevenueModelsSchema = {
  type: Type.OBJECT,
  properties: {
    revenueModels: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: "A concise description of how the startup could generate revenue"
      },
      description: "3-5 potential revenue models that would be viable for this business"
    }
  },
  propertyOrdering: ["revenueModels"]
};

const geminiMVPSchema = {
  type: Type.OBJECT,
  properties: {
    mvpDesign: {
      type: Type.STRING,
      description: "A specific, actionable suggestion for the MVP's overall design and approach"
    },
    mvpFeatures: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          feature: {
            type: Type.STRING,
            description: "A specific feature for the MVP"
          },
          priority: {
            type: Type.STRING,
            description: "Priority of the feature (High, Medium, or Low)"
          },
          effort: {
            type: Type.STRING,
            description: "Estimated effort to implement the feature (High, Medium, or Low)"
          }
        },
        propertyOrdering: ["feature", "priority", "effort"]
      },
      description: "5-10 specific features with priority and effort levels based on a realistic timeline of the MVP"
    }
  },
  propertyOrdering: ["mvpDesign", "mvpFeatures"]
};

// Gemini prompts for specific sections
const getGeminiPitchPrompt = (startupIdea, marketAnalysis, userProfile = null) => {
  let context = '';
  if (userProfile) {
    context = `\n\nFounder Context:
- Background: ${userProfile.background || 'Not specified'}
- Technical Skills: ${userProfile.technicalSkills || 'Not specified'}
- Previous Experience: ${userProfile.previousExperience || 'Not specified'}
- Industry: ${userProfile.industry || 'Not specified'}
- Stage: ${userProfile.stage || 'Not specified'}`;
  }

  return `Based on the following startup idea and market analysis, create a compelling five-sentence pitch that follows these guidelines:

1. Hook: Start with a compelling statement that grabs attention
2. Value: Clearly state the core value proposition
3. Evidence: Support with market data and validation
4. Differentiator: Explain how it stands out from competitors
5. Call to Action: End with a clear next step or invitation

Startup Idea: ${startupIdea}

Market Analysis Context:
- Market Demand Score: ${marketAnalysis.score || 'N/A'}/10
- Market Summary: ${marketAnalysis.summary || 'N/A'}
- Primary Pain Point: ${marketAnalysis.marketDemand?.painPoints?.primaryPainPoint || 'N/A'}
- Market Readiness: ${marketAnalysis.marketDemand?.timingTrends?.marketReadiness || 'N/A'}${context}

Create a professional, investor-ready pitch that incorporates the market insights and founder context.`;
};

const getGeminiRevenueModelsPrompt = (startupIdea, marketAnalysis, userProfile = null) => {
  let context = '';
  if (userProfile) {
    context = `\n\nFounder Context:
- Industry: ${userProfile.industry || 'Not specified'}
- Stage: ${userProfile.stage || 'Not specified'}
- Team Size: ${userProfile.teamSize || 'Not specified'}
- Funding: ${userProfile.funding || 'Not specified'}`;
  }

  return `Based on the following startup idea and market analysis, suggest 3-5 potential revenue models that would be viable for this business.

Startup Idea: ${startupIdea}

Market Analysis:
- Target Audience: ${marketAnalysis.targetAudience?.map(aud => aud.group).join(', ') || 'Not specified'}
- Market Demand Score: ${marketAnalysis.score || 'N/A'}/10
- Industry Context: ${marketAnalysis.marketDemand?.timingTrends?.emergingTrends || 'N/A'}${context}

Provide specific, actionable revenue model suggestions that align with the market opportunity and business model. Each suggestion should be a concise description of how the startup could generate revenue.`;
};

const getGeminiMVPFeaturesPrompt = (startupIdea, marketAnalysis, userProfile = null) => {
  let context = '';
  if (userProfile) {
    context = `\n\nFounder Context:
- Technical Skills: ${userProfile.technicalSkills || 'Not specified'}
- Tech Stack: ${userProfile.techStack || 'Not specified'}
- Team Size: ${userProfile.teamSize || 'Not specified'}
- Stage: ${userProfile.stage || 'Not specified'}`;
  }

  return `Based on the following startup idea and market analysis, design an MVP (Minimum Viable Product) with specific features.

Startup Idea: ${startupIdea}

Market Analysis:
- Primary Pain Point: ${marketAnalysis.marketDemand?.painPoints?.primaryPainPoint || 'N/A'}
- Target Audience: ${marketAnalysis.targetAudience?.map(aud => aud.group).join(', ') || 'Not specified'}
- Market Demand Score: ${marketAnalysis.score || 'N/A'}/10${context}

Provide a specific, actionable suggestion for the MVP's overall design and approach, along with 5-8 specific features with their priority (High/Medium/Low) and implementation effort (High/Medium/Low). Focus on features that directly address the identified pain points and can be validated with the target audience.`;
};



const getLinkupPrompt = (message, userProfile = null) => {

  let personalizedContext = '';
  if (userProfile) {
    const {
      firstName,
      lastName,
      location,
      background,
      technicalSkills,
      previousExperience,
      startupName,
      startupDescription,
      industry,
      customerType,
      stage,
      teamSize,
      techStack,
      funding
    } = userProfile;

    const locationString = location ? [location.city, location.state, location.country]
      .filter(Boolean)
      .join(', ') : 'Not specified';
    
    personalizedContext = `

Here is my personal and startup background. Use this information to find results for maximum relevance and specificity.

- Name: ${firstName || 'N/A'} ${lastName || ''}
- Location: ${locationString}
- Background/Field of Study: ${background || 'N/A'}
- Technical Skills: ${technicalSkills || 'N/A'}
- Previous Startup Experience: ${previousExperience || 'N/A'}
- Startup Name: ${startupName || 'N/A'}
- Description: ${startupDescription || 'N/A'}
- Target Industry: ${industry || 'N/A'}
- Target Customer: ${customerType || 'N/A'}
- Current Stage: ${stage || 'N/A'}
- Team Size: ${teamSize || 'N/A'}
- Tech Stack/AI Models: ${techStack || 'N/A'}
- Funding Raised: ${funding || 'N/A'}

Please place heavy emphasis and consider this rich context when finding results for analyzing my startup idea. Consider local
market conditions, my demonstrated skills, competitive landscape within my idea's industry, and the feasibility of
my idea given their current stage and team size. Avoid having redundant information across multiple description fields.`;
  }

  return ` Based on important market factors, how valid is my startup idea? Here's my startup idea: ${message}${personalizedContext}.
`;
};

const linkupOutputSchema = {
  type: "object",
  properties: {
      title: { type: "string", description: "A short, descriptive title for the startup idea." },
      overview: { type: "string", description: "A concise, one-paragraph summary of the entire analysis, covering the idea's potential, market, and key challenges." },
      score: { type: "number", description: "An extremely strict and realistic score from 1-10 for the idea's market demand and feasibility." },
      feasibilityscore: { type: "number", description: "An extremely strict and realistic score from 1-10 for the idea's market competitveness. With 10 being most competitive." },
      summary: { type: "string", description: "A multi-source supported summary of the market demand." },
      details: { type: "string", description: "AN extremely detailed analysis of the market demand." },
      marketDemand: {
          type: "object",
          properties: {
              painPoints: {
                  type: "object",
                  properties: {
                      primaryPainPoint: { type: "string", description: "The most critical pain point the startup is solving. Based on research" },
                      urgency: { type: "string", description: "How urgent is this problem for the target audience." },
                      evidence: { type: "string", description: "Evidence supporting the existence and urgency of the pain point." }
                  },
                  required: ["primaryPainPoint", "urgency", "evidence"]
              },
              timingTrends: {
                  type: "object",
                  properties: {
                      marketReadiness: { type: "string", description: "Is the market ready for this solution?" },
                      emergingTrends: { type: "string", description: "What emerging trends support this idea?" },
                      timingAssessment: { type: "string", description: "Overall assessment of the market timing." }
                  },
                  required: ["marketReadiness", "emergingTrends", "timingAssessment"]
              }
          },
          required: ["painPoints", "timingTrends"]
      },
      competitors: {
          type: "array",
          description: "A list of ten competitors that are similar to the user's startup idea any aspect. Rank them by popularity, market share, and other relevant metrics.",
          items: {
              type: "object",
              properties: {
                  name: { type: "string", description: "Name of the competitor." },
                  description: { type: "string", description: "Description of the competitor's business." },
                  popularity: { type: "string", enum: ["High", "Medium", "Low"], description: "Popularity of the competitor." },
                  locations: { type: "string", description: "Geographic locations where the competitor operates." },
                  pricing: { type: "string", description: "The competitor's pricing model." },
                  pros: { type: "array", items: { type: "string" }, description: "Strengths of the competitor." },
                  weaknesses: { type: "array", items: { type: "string" }, description: "Weaknesses of the competitor." },
                  competitiveness: { type: "number", description: "How competitive the competitor is in their market. With 10 being most competitive." }
              },
              required: ["name", "description", "popularity", "locations", "pricing", "pros", "weaknesses"]
          }
      },
      targetAudience: {
          type: "array",
          description: "A list of five target audience groups that the startup is targeting. For each group, provide a list of online communities/destinations that are speicfically relevant to the target audience.",
          items: {
              type: "object",
              properties: {
                  group: { type: "string", description: "A specific target audience group." },
                  onlineDestinations: {
                      type: "array",
                      items: {
                          type: "object",
                          properties: {
                              name: { type: "string", description: "Name of the online community/destination." },
                              type: { type: "string", enum: ["Reddit", "Discord", "Forum", "Facebook Group", "Other"], description: "Type of the online community." },
                              url: { type: "string", description: "URL to the online community." },
                              description: { type: "string", description: "Description of why this is a good place to find the target audience." }
                          },
                          required: ["name", "type", "url", "description"]
                      }
                  }
              },
              required: ["group", "onlineDestinations"]
          }
      },
      // Note: pitch, revenueModels, mvpDesign, and mvpFeatures will be generated by Gemini
      personalizedstatus: { type: "boolean", default: false, description: "Whether or not founder fit/user profile was given." },
  },
  required: ["title", "overview", "score", "summary", "details", "marketDemand", "competitors", "targetAudience", "personalizedstatus"]
};

const linkupOutputPersonalizedSchema = {
  type: "object",
  properties: {
      title: { type: "string", description: "A short, catchy, descriptive title for the startup idea." },
      overview: { type: "string", description: "A concise, one-paragraph summary of the entire analysis, covering the idea's potential, market, and key challenges." },
      score: { type: "number", description: "An extremely strict and realistic score from 1-10 for the idea's market demand and feasibility." },
      feasibilityscore: { type: "number", description: "An extremely strict and realistic score from 1-10 for the idea's market competitveness. With 10 being most competitive." },
      summary: { type: "string", description: "A multi-source supported summary of the market demand." },
      details: { type: "string", description: "AN extremely detailed analysis of the market demand." },
      founderfit: {
        type: "string",
        description: "Give direct feedback to the user about their fit for the business or product idea. Use second person ('you') instead of third person ('the founder'). Be concise, specific, and constructive. Do not use phrases like 'based on your profile' or refer to yourself as an AI."
      },
    founderfitscore: {
      type: "number",
      description: "Assign a realistic and evidence-based score from 1 to 10 for the user's fit to the proposed business or product. A score of 10 should reflect deep domain expertise, execution history, or clear alignment with the business area. A score of 5 represents a partial or surface-level fit. Lower scores should be used where the user lacks relevant experience or there is little evidence of alignment. Do not assume optimism or give benefit of the doubt — score strictly based on demonstrated fit."
    },
      marketDemand: {
          type: "object",
          properties: {
              painPoints: {
                  type: "object",
                  properties: {
                      primaryPainPoint: { type: "string", description: "The most critical pain point the startup is solving." },
                      urgency: { type: "string", description: "How urgent is this problem for the target audience." },
                      evidence: { type: "string", description: "Evidence supporting the existence and urgency of the pain point." }
                  },
                  required: ["primaryPainPoint", "urgency", "evidence"]
              },
              timingTrends: {
                  type: "object",
                  properties: {
                      marketReadiness: { type: "string", description: "Is the market ready for this solution?" },
                      emergingTrends: { type: "string", description: "What emerging trends support this idea?" },
                      timingAssessment: { type: "string", description: "Overall assessment of the market timing." }
                  },
                  required: ["marketReadiness", "emergingTrends", "timingAssessment"]
              }
          },
          required: ["painPoints", "timingTrends"]
      },
      competitors: {
          type: "array",
          description: "A list of five to twenty reasonable competitors that are similar to the user's startup idea. They can be specific and niche. Rank them by popularity, market share, and other relevant metrics.",
          items: {
              type: "object",
              properties: {
                  name: { type: "string", description: "Name of the competitor." },
                  description: { type: "string", description: "Description of the competitor's business." },
                  popularity: { type: "string", enum: ["High", "Medium", "Low"], description: "Popularity of the competitor." },
                  locations: { type: "string", description: "Geographic locations where the competitor operates." },
                  pricing: { type: "string", description: "The competitor's pricing model." },
                  pros: { type: "array", items: { type: "string" }, description: "Strengths of the competitor." },
                  weaknesses: { type: "array", items: { type: "string" }, description: "Weaknesses of the competitor." },
                  competitiveness: { type: "number", description: "How competitive the competitor is in their market. With 10 being most competitive." }
              },
              required: ["name", "description", "popularity", "locations", "pricing", "pros", "weaknesses"]
          }
      },
      positivefounderfit: {
        type: 'array',
        description: 'Three skills, experiences, or attributes the founder possesses that are advantageous in their market/business - based off of their profile attributes.',
        items: {
          type: 'object',
          properties: {
            skill: { type: 'string', description: 'The skill, experience, or attribute the founder possesses that is advantageous in their market/business.' },
            description: { type: 'string', description: 'A short description of the skill, experience, or attribute and its relevance to the users business/market.' }
          }
        }
      },
      negativefounderfit: {
        type: 'array',
        description: 'Three skills, experiences, or attributes the founder lacks that are necessary in their market/business - but are absent from their profile details.',
        items: {
          type: 'object',
          properties: {
            skill: { type: 'string', description: 'The skill, experience, or attribute the founder lacks that is necessary in their market/business.' },
            description: { type: 'string', description: 'A short description of the skill, experience, or attribute and its relevance to the users business/market.' }
          }
        }
      },
      targetAudience: {
          type: "array",
          description: "A list of five target audience groups that the startup is targeting. For each group, provide a list of online communities/destinations that are relevant to the target audience.",
          items: {
              type: "object",
              properties: {
                  group: { type: "string", description: "A specific target audience group." },
                  onlineDestinations: {
                      type: "array",
                      items: {
                          type: "object",
                          properties: {
                              name: { type: "string", description: "Name of the online community/destination." },
                              type: { type: "string", enum: ["Reddit", "Discord", "Forum", "Facebook Group", "Other"], description: "Type of the online community." },
                              url: { type: "string", description: "URL to the online community." },
                              description: { type: "string", description: "Description of why this is a good place to find the target audience." }
                          },
                          required: ["name", "type", "url", "description"]
                      }
                  }
              },
              required: ["group", "onlineDestinations"]
          }
      },
      // Note: pitch, revenueModels, mvpDesign, and mvpFeatures will be generated by Gemini
      personalizedstatus: { type: "boolean", default: true, description: "Whether or not founder fit/user profile was given." },
  },
  required: ["title", "overview", "score", "summary", "details", "marketDemand", "competitors", "targetAudience", "personalizedstatus"]
};

router.post('/chat', async (req, res) => {
  if (process.env.USE_LINKUP_MOCK === 'true') {
        console.log('Serving mockLinkupResponse.json (USE_LINKUP_MOCK=true)');
        const mockResponse = loadMock();
        
        // Generate Gemini content for mock response
        try {
          
          // Generate pitch with structured output
          const pitchPrompt = getGeminiPitchPrompt(req.body.message, mockResponse, req.body.userProfile);
          const pitchResult = await gemini.models.generateContent({
            model: "gemini-1.5-flash",
            contents: pitchPrompt,
            config: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
              responseMimeType: "application/json",
              responseSchema: geminiPitchSchema
            }
          });
          const pitchData = JSON.parse(pitchResult.text);
          
          // Generate revenue models with structured output
          const revenuePrompt = getGeminiRevenueModelsPrompt(req.body.message, mockResponse, req.body.userProfile);
          const revenueResult = await gemini.models.generateContent({
            model: "gemini-1.5-flash",
            contents: revenuePrompt,
            config: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
              responseMimeType: "application/json",
              responseSchema: geminiRevenueModelsSchema
            }
          });
          const revenueData = JSON.parse(revenueResult.text);
          
          // Generate MVP features with structured output
          const mvpPrompt = getGeminiMVPFeaturesPrompt(req.body.message, mockResponse, req.body.userProfile);
          const mvpResult = await gemini.models.generateContent({
            model: "gemini-1.5-flash-8b",
            contents: mvpPrompt,
            config: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
              responseMimeType: "application/json",
              responseSchema: geminiMVPSchema
            }
          });
          const mvpData = JSON.parse(mvpResult.text);
          
                     // Combine all responses
           const combinedResponse = {
             ...mockResponse,
             pitch: pitchData.pitch,
             revenueModels: revenueData.revenueModels,
             mvpDesign: mvpData.mvpDesign,
             mvpFeatures: mvpData.mvpFeatures
           };
          
          return res.json({reply: combinedResponse});
        } catch (error) {
          console.error('API Error:', error);
          // Return mock response without additional content if APIs fail
          return res.json({reply: mockResponse});
        }
  }

  const { message, model, personalized, userProfile } = req.body;

  let mode;
  if (model === 'Quick Search') {
    mode = 'standard';
  } else {
    mode = 'deep';
  }

    try {
    // Get market analysis from Linkup
    let linkupResponse;
    if (personalized) {
      linkupResponse = await linkup.search({
        query: getLinkupPrompt(message, userProfile),
        depth: mode,
        outputType: "structured",
        structuredOutputSchema: linkupOutputPersonalizedSchema,
        includeImages: false,
        fromDate: new Date("2016-01-01T00:00:00-06:00"),
        toDate: new Date("2025-06-21T23:59:59-05:00")
      });
    } else {
      linkupResponse = await linkup.search({
        query: getLinkupPrompt(message, personalized ? userProfile : null),
        depth: mode,
        outputType: "structured",
        structuredOutputSchema: linkupOutputSchema,
        includeImages: false,
        fromDate: new Date("2016-01-01T00:00:00-06:00"),
        toDate: new Date("2025-06-21T23:59:59-05:00")
      });
    }

    console.log('Linkup raw response:', linkupResponse);

    // Generate Gemini content with structured output
    
    // Generate pitch with structured output
    const pitchPrompt = getGeminiPitchPrompt(message, linkupResponse, userProfile);
    const pitchResult = await gemini.models.generateContent({
      model: "gemini-1.5-flash",
      contents: pitchPrompt,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: geminiPitchSchema
      }
    });
    const pitchData = JSON.parse(pitchResult.text);
    
    // Generate revenue models with structured output
    const revenuePrompt = getGeminiRevenueModelsPrompt(message, linkupResponse, userProfile);
    const revenueResult = await gemini.models.generateContent({
      model: "gemini-1.5-flash",
      contents: revenuePrompt,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: geminiRevenueModelsSchema
      }
    });
    const revenueData = JSON.parse(revenueResult.text);
    
    // Generate MVP features with structured output
    const mvpPrompt = getGeminiMVPFeaturesPrompt(message, linkupResponse, userProfile);
    const mvpResult = await gemini.models.generateContent({
      model: "gemini-1.5-flash",
      contents: mvpPrompt,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: geminiMVPSchema
      }
    });
    const mvpData = JSON.parse(mvpResult.text);
    
         // Combine all responses
     const combinedResponse = {
       ...linkupResponse,
       pitch: pitchData.pitch,
       revenueModels: revenueData.revenueModels,
       mvpDesign: mvpData.mvpDesign,
       mvpFeatures: mvpData.mvpFeatures
     };
    
    res.json({ reply: combinedResponse });

  } catch (error) {
    console.error('API call failed:', error);
    
    const fallbackError = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      code: error?.code || 'NO_CODE',
      status: error?.status || 500,
      response: error?.response || null
    };
    
    console.error('API Error Details:', fallbackError);
    res.status(500).send('Error communicating with APIs: ' + fallbackError.message);
  }
});

module.exports = router;