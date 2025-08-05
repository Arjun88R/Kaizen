const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const puppeteer = require("puppeteer-core");
const cors = require("cors")({origin: true});
const admin = require("firebase-admin");
admin.initializeApp();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_API_KEY_SECRET = 'GEMINI_API_KEY';
const BROWSERLESS_API_KEY_SECRET = 'BROWSERLESS_API_KEY';

exports.analyseJobPosting = onRequest(
  { secrets: [GEMINI_API_KEY_SECRET, BROWSERLESS_API_KEY_SECRET], timeoutSeconds: 300 },
  (request, response) => {
    cors(request, response, async () => {
      logger.info("analyseJobPosting function triggered!");
      
      const jobUrl = request.method === 'POST' ? request.body.url : request.query.url;
      const jobTitle = request.method === 'POST' ? request.body.title : request.query.title;
      
      if (!jobUrl) { 
        return response.status(400).json({ error: "Please provide a URL in the request body or query parameter." });
      }
      
      logger.info("Analyzing URL:", jobUrl);

      // Extract basic info from URL as fallback
      const extractCompanyFromUrl = (url) => {
        try {
          const domain = new URL(url).hostname;
          if (domain.includes('linkedin.com')) return 'LinkedIn Job';
          if (domain.includes('indeed.com')) return 'Indeed Job';
          if (domain.includes('glassdoor.com')) return 'Glassdoor Job';
          if (domain.includes('greenhouse.io')) return 'Greenhouse Job';
          return domain.replace('www.', '').split('.')[0].toUpperCase();
        } catch (e) {
          return 'Unknown Company';
        }
      };

      // Basic job data (fallback)
      const basicJobData = {
        originalUrl: jobUrl,
        jobTitle: jobTitle || 'Job Application',
        companyName: extractCompanyFromUrl(jobUrl),
        location: 'Unknown',
        status: 'applied',
        trackedAt: admin.firestore.FieldValue.serverTimestamp(),
        analysisMethod: 'basic'
      };

      try {
        let finalJobData = { ...basicJobData };
        let analysisSuccess = false;

        // Try AI-powered analysis
        try {
          const geminiApiKey = process.env.GEMINI_API_KEY;
          if (!geminiApiKey) {
            throw new Error("Gemini API key not configured");
          }

          // Try to scrape the page
          let pageText = '';
          try {
            const browserlessApiKey = process.env.BROWSERLESS_API_KEY;
            if (browserlessApiKey) {
              const browser = await puppeteer.connect({
                browserWSEndpoint: `wss://production-sfo.browserless.io?token=${browserlessApiKey}`
              });
              const page = await browser.newPage();
              await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 30000 });
              pageText = await page.evaluate(() => document.body.innerText);
              await browser.close();
              logger.info("Successfully scraped page content");
            }
          } catch (scrapeError) {
            logger.warn("Page scraping failed:", scrapeError.message);
          }

          // If we have page content, try AI analysis
          if (pageText && pageText.length > 100) {
            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const prompt = `Extract job information from this text and return ONLY a valid JSON object with these exact keys: companyName, jobTitle, location. 
            
Text: "${pageText.substring(0, 8000)}"

Return only the JSON object, no other text.`;
            
            const result = await model.generateContent(prompt);
            const aiResponse = result.response.text();
            logger.info("AI analysis successful");
            
            // Parse AI response
            const jsonText = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiJobData = JSON.parse(jsonText);
            
            // Merge AI data with basic data
            finalJobData = {
              ...basicJobData,
              companyName: aiJobData.companyName || basicJobData.companyName,
              jobTitle: aiJobData.jobTitle || basicJobData.jobTitle,
              location: aiJobData.location || basicJobData.location,
              analysisMethod: 'ai_enhanced'
            };
            analysisSuccess = true;
          }
        } catch (aiError) {
          logger.warn("AI analysis failed:", aiError.message);
          // Continue with basic data
        }

        // Save to Firestore
        const writeResult = await admin.firestore().collection('tracked_jobs').add(finalJobData);
        logger.info(`Successfully saved job with ID: ${writeResult.id}`);

        response.status(200).json({
          success: true,
          id: writeResult.id,
          data: finalJobData,
          message: analysisSuccess ? 'Job analyzed with AI' : 'Job tracked successfully',
          analysisMethod: finalJobData.analysisMethod
        });

      } catch (error) {
        logger.error("Error in analyseJobPosting:", error);
        
        // Even if everything fails, try to save basic data
        try {
          const writeResult = await admin.firestore().collection('tracked_jobs').add(basicJobData);
          response.status(200).json({
            success: true,
            id: writeResult.id,
            data: basicJobData,
            message: 'Job tracked with basic info (analysis failed)',
            warning: 'Analysis services unavailable'
          });
        } catch (dbError) {
          response.status(500).json({ 
            error: `Failed to track job: ${dbError.message}`,
            success: false 
          });
        }
      }
    });
  }
);

exports.getJobs = onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const snapshot = await admin.firestore().collection('tracked_jobs').orderBy('trackedAt', 'desc').get();
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      res.status(200).json({
        success: true,
        jobs: jobs,
        count: jobs.length
      });
    } catch (error) {
      logger.error("Error fetching jobs:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
});