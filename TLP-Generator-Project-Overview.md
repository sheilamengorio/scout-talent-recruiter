
# AI-Powered Talent Landing Page (TLP) Generator
## Project Overview & Investment Summary

---

### What is the TLP Generator?

The TLP Generator is an AI-powered web application that creates professional, brand-aligned Talent Landing Pages (TLPs) for job openings through a natural chat conversation. Instead of manually building job ads, recruiters chat with an intelligent assistant that gathers role details, scrapes the company's website for branding, researches market data, and generates a polished, ready-to-deploy landing page -- all in minutes.

---

### What Does It Do?

**1. Intelligent Conversation**
A recruiter opens the app and chats with an AI recruitment specialist. The AI asks all relevant questions upfront in one natural batch message -- role title, company, location, salary, website -- and extracts everything from the conversation automatically.

**2. Automated Website Scraping**
When the recruiter provides a company website, the system automatically scrapes:
- Homepage for brand colors, fonts, and logo
- Career page for benefits, culture, and "why join us" content
- About page for company mission, values, and history
- Hero images (team photos, workplace images) for the landing page header

**3. Market Research**
The system checks SEEK for real market data on the role -- how many similar listings exist, salary benchmarks, common requirements, and competitor highlights. If SEEK data isn't available, it falls back to AI estimation.

**4. Brand-Aligned TLP Generation**
Using all scraped data, the AI generates a complete Talent Landing Page with:
- Company branding (exact colors, fonts, logo from their website)
- Two-column hero header with company imagery
- Professional job ad copy matching the company's brand voice
- Sections: About Company, About the Role, Responsibilities, Requirements, Benefits

**5. Iterative Refinement**
The recruiter can review the live preview and request changes via chat -- including content changes (rewrite responsibilities, update benefits) and branding changes (change colors, fonts, messaging tone).

**6. Deployment Recommendations**
The AI provides data-backed recommendations on where to post the role (SEEK, LinkedIn, Indeed, Glassdoor, ApplyNow.com.au, etc.) with honest insights, costs, and reference links.

**7. Interview Question Generation**
Optionally generates tailored interview questions (behavioral, technical, situational, culture fit) based on the role.

**8. HTML Export**
The final TLP exports as a standalone HTML file ready for deployment.

---

### How It Works (Technical)

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Axios |
| Backend | Node.js, Express |
| AI | OpenAI GPT-4o-mini (function calling) |
| Database | MongoDB (with in-memory fallback) |
| Scraping | Cheerio + Axios (lightweight, no browser needed) |
| Caching | node-cache (1hr brand, 30min market) |

The architecture is a single server that serves both the API and the built React frontend. No additional infrastructure required beyond a Node.js hosting environment and an OpenAI API key.

---

### Resources Needed

#### Development Resources (Already Built)

| Resource | Status |
|----------|--------|
| Core TLP generator engine | Complete |
| AI conversation system with function calling | Complete |
| Website scraper (multi-page) | Complete |
| Brand extractor (colors, fonts, logo, hero images) | Complete |
| Market research (SEEK + AI fallback) | Complete |
| Template engine with brand injection | Complete |
| Deployment advisor (8 platforms) | Complete |
| Interview question generator | Complete |
| HTML export | Complete |
| React frontend with live preview | Complete |

#### To Deploy to Production

| Resource | Purpose | Estimated Cost |
|----------|---------|---------------|
| OpenAI API Key | Powers all AI features (conversation, brand voice, market estimates, interview questions, deployment recommendations) | ~$0.01-0.05 per TLP session |
| Node.js Hosting | Runs the application (Render, Railway, AWS, Heroku, etc.) | $7-25/month (basic tier) |
| MongoDB Atlas | Persistent data storage (free tier available) | $0/month (free tier) or $10-57/month (dedicated) |
| Custom Domain (optional) | Professional URL | ~$15/year |
| SSL Certificate | Included with most hosting providers | $0 (included) |

#### Monthly Operating Cost Estimate

| Usage Level | TLP Sessions/Month | Estimated Monthly Cost |
|-------------|-------------------|----------------------|
| Light | 50 sessions | $7-10/month |
| Moderate | 200 sessions | $15-25/month |
| Heavy | 1,000 sessions | $30-60/month |

The primary cost driver is OpenAI API usage. Each TLP session typically involves 5-15 API calls (conversation turns + scraping analysis + market estimation). At GPT-4o-mini pricing, this is very cost-efficient.

---

### Investment Summary

#### What Has Been Built

- A fully functional AI recruitment tool that takes a recruiter from zero to a polished, brand-aligned job landing page in a single chat conversation
- Automated brand scraping eliminates manual design work
- Market data integration provides competitive intelligence
- Multi-platform deployment guidance with accurate, referenced data

#### What It Replaces

| Traditional Approach | TLP Generator |
|---------------------|---------------|
| 2-4 hours to manually create a job landing page | 5-10 minutes via chat |
| Graphic designer needed for branding | Auto-scraped from company website |
| No market data insight | SEEK data + AI analysis included |
| Static template, one-size-fits-all | Brand-aligned, company-specific |
| Separate tool for interview prep | Built-in interview question generation |
| Manual platform research | Data-backed deployment recommendations |

#### Development Investment Completed

| Item | Detail |
|------|--------|
| Backend services | 9 service modules (AI, scraping, brand extraction, market research, deployment, interview questions, caching, template generation, storage) |
| Frontend | React app with chat interface, live preview, brand swatches |
| Knowledge base | Scout Talent services, pricing, FAQs, TLP template, recruiter personality |
| Total files | ~25+ source files across backend and frontend |

#### Next Steps to Go Live

1. Set up OpenAI API key in production environment
2. Deploy to hosting provider (Render or Railway recommended for simplicity)
3. Optional: Connect MongoDB Atlas for persistent storage
4. Optional: Add custom domain

---

*Document generated for Scout Talent - TLP Generator Project*
