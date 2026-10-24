# FinAPI 📈

A high-performance caching proxy in front of **SEC EDGAR**. FinAPI allows any application to request clean, structured financial data (revenue, net income, balance sheet, cash flows, per-share metrics, and server-side calculated ratios) for **any US public company** with millisecond response times.

- **Live Production API:** [https://finapi2026.vercel.app](https://finapi2026.vercel.app)
- **Hosted on:** Vercel (Next.js 16 Fluid Compute)
- **Database / Smart Cache:** Turso (libSQL / SQLite)
- **Source of Truth:** SEC EDGAR Financial Statement Data Sets (`companyfacts` & `submissions`)
- **Taxonomies Supported:** US-GAAP & IFRS (`ifrs-full`)
- **Automated Warmup:** GitHub Actions cron job

---

## The Problem FinAPI Solves

Accessing financial data directly from the SEC EDGAR API in web or mobile applications has several major pain points:

1. **Giant Payloads:** The SEC `companyfacts` endpoint returns a single, massive JSON file containing every financial fact the company has ever filed (e.g. **3.6 MB for AAPL**, **4.7 MB for MSFT**, and **7.6 MB for JPM**).
2. **Platform Limits:** Serverless environments like Vercel have strict 4.5 MB response payload limits. Handing raw SEC files directly to client apps is impossible for large filers.
3. **No CORS Support:** `data.sec.gov` does not send `Access-Control-Allow-Origin` headers, preventing client-side browser applications from calling it directly.
4. **Strict Rate Limits & Headers:** SEC requires a specific `User-Agent` format (including admin contact email) and enforces a strict limit of 10 requests/second per IP, returning `403 Forbidden` if violated.
5. **Taxonomy & Accounting Changes:** Companies switch XBRL tags over time (e.g. switching from `SalesRevenueNet` to `RevenueFromContractWithCustomerExcludingAssessedTax` after ASC 606), and foreign private issuers file under `ifrs-full` instead of `us-gaap`.

**FinAPI sits in the middle:** it fetches the 7 MB raw file once, decomposes and standardizes the facts into Turso SQLite, and serves tailored, filtered slices with calculated ratios in **under 400 milliseconds**.

---

## What Tickers Are Supported?

FinAPI supports **any US publicly traded company or foreign company filing with the SEC**:

- **Coverage:** **10,000+ public tickers** across NYSE, NASDAQ, CBOE, and OTC markets.
- **Foreign Issuers (IFRS):** Full native support for foreign private issuers filing forms `20-F` and `40-F` under `ifrs-full` (e.g. `TSM`, `BABA`, `ASML`, `NVO`, `SAP`, `AZN`, `SHEL`).
- **Eligible Filers:** Any company that files periodic financial reports (`10-K`, `10-Q`, `20-F`, `40-F`) with XBRL disclosures.
- **Ticker Mapping:** Automatically resolves ticker symbols to official 10-digit SEC CIK numbers.
- **Dual-Class & Symbols:** Automatically normalizes dot and dash tickers (e.g. `BRK.B` / `BRK-B`, `GOOG` / `GOOGL`).

---

## What Information Is Provided?

FinAPI maps over **91 curated canonical financial concepts** across four main statement groups, plus a server-side **`metrics`** engine:

### 1. Income Statement (`income`)
- **Revenues:** `Revenues`, `SalesRevenueNet`, `RevenueFromContractWithCustomer`, `ifrs-full:Revenue` (merged across accounting changes)
- **Cost of Revenue & Profit:** `CostOfRevenue`, `GrossProfit`
- **Operating Expenses:** `ResearchAndDevelopmentExpense`, `SellingGeneralAndAdministrativeExpense`, `SellingAndMarketingExpense`, `GeneralAndAdministrativeExpense`, `OperatingExpenses`
- **Operating & Pre-Tax Income:** `OperatingIncomeLoss`, `NonoperatingIncomeExpense`, `InterestExpense`, `InterestIncome`, `IncomeBeforeIncomeTaxes`, `IncomeTaxExpense`
- **Bottom Line:** `NetIncomeLoss`, `NetIncomeAvailableToCommonStockholders`, `NetIncomeAttributableToNoncontrollingInterest`, `ComprehensiveIncome`
- **Financial Institutions / Banks:** `InterestAndDividendIncome`, `NetInterestIncome`, `NoninterestIncome`, `NoninterestExpense`, `ProvisionForCreditLosses`

### 2. Balance Sheet (`balance`)
- **Current Assets:** `CashAndCashEquivalents`, `ShortTermInvestments`, `AccountsReceivable`, `Inventory`, `OtherCurrentAssets`, `AssetsCurrent`
- **Non-Current Assets:** `PropertyPlantAndEquipmentNet`, `OperatingLeaseRightOfUseAsset`, `Goodwill`, `IntangibleAssetsNet`, `LongTermInvestments`, `OtherNoncurrentAssets`, `Assets` (Total Assets)
- **Current Liabilities:** `AccountsPayable`, `AccruedLiabilities`, `DeferredRevenueCurrent`, `ShortTermDebt`, `LongTermDebtCurrent`, `LiabilitiesCurrent`
- **Lease Liabilities (Full Debt Coverage):**
  - `OperatingLeaseLiabilityCurrent` (`us-gaap:OperatingLeaseLiabilityCurrent`, `ifrs-full:CurrentLeaseLiabilities`)
  - `OperatingLeaseLiabilityNoncurrent` (`us-gaap:OperatingLeaseLiabilityNoncurrent`, `ifrs-full:NoncurrentLeaseLiabilities`)
  - `FinanceLeaseLiabilityCurrent` & `FinanceLeaseLiabilityNoncurrent`
- **Non-Current Liabilities:** `LongTermDebt`, `OtherNoncurrentLiabilities`, `Liabilities` (Total Liabilities)
- **Capital Structure & Equity:**
  - `PreferredStock` (`us-gaap:PreferredStockValue`, `ifrs-full:PreferenceShares`)
  - `CommonStockAndAdditionalPaidInCapital`, `RetainedEarnings`, `AccumulatedOtherComprehensiveIncome`, `TreasuryStock`
  - `MinorityInterest` (`us-gaap:MinorityInterest`, `ifrs-full:NoncontrollingInterests`)
  - `StockholdersEquity`, `LiabilitiesAndStockholdersEquity`
- **SaaS / Cloud Metrics:** `DeferredRevenueNoncurrent`, `RemainingPerformanceObligation` (RPO / Backlog)
- **Financial Institutions / Banks:** `Deposits`, `LoansAndLeasesReceivableNet`, `AllowanceForCreditLosses`

### 3. Cash Flow Statement (`cashflow`)
- **Operating Activities:** `OperatingCashFlow`, `DepreciationAndAmortization`, `ShareBasedCompensation`, `DeferredIncomeTaxes`, changes in working capital (`ChangeInAccountsReceivable`, `ChangeInInventories`, `ChangeInAccountsPayable`)
- **Investing Activities:** `CapitalExpenditure` (CapEx), `Acquisitions`, `PurchasesOfInvestments`, `ProceedsFromInvestments`, `InvestingCashFlow`
- **Financing Activities:** `DebtIssued`, `DebtRepaid`, `ShareRepurchases` (Buybacks), `DividendsPaid`, `FinancingCashFlow`
- **Summary Lines:** `NetChangeInCash`, `IncomeTaxesPaid`, `InterestPaid`

### 4. Per Share & Valuation (`per_share`)
- **Earnings Per Share:** `EarningsPerShareBasic`, `EarningsPerShareDiluted`
- **Dividends:** `DividendsPerShare`
- **Share Counts:** `WeightedAverageSharesBasic`, `WeightedAverageSharesDiluted`, `SharesOutstanding` (Common Stock Shares Outstanding)
- **Market Float:** `PublicFloat`

### 5. Derived Ratios & Calculated Metrics (`metrics`)
Rather than requiring every downstream application to manually compute fundamental metrics, FinAPI automatically aligns and calculates standardized ratios for each reported period:

| Metric | Formula | Unit | Description |
|---|---|---|---|
| **`FreeCashFlow`** | `OperatingCashFlow - \|CapEx\|` | Currency | Cash generated after capital investments |
| **`GrossMargin`** | `GrossProfit / Revenues` | `ratio` | Efficiency at producing goods and services |
| **`OperatingMargin`** | `OperatingIncomeLoss / Revenues` | `ratio` | Profitability from core operations |
| **`NetMargin`** | `NetIncomeLoss / Revenues` | `ratio` | Bottom-line profit percentage |
| **`TotalDebt`** | `ST Debt + LT Debt + Lease Liabilities` | Currency | Comprehensive debt including current & non-current lease liabilities |
| **`NetDebt`** | `TotalDebt - (Cash + ST Investments)` | Currency | Debt net of liquid cash and marketable securities |
| **`WorkingCapital`** | `AssetsCurrent - LiabilitiesCurrent` | Currency | Short-term liquidity buffer |
| **`CurrentRatio`** | `AssetsCurrent / LiabilitiesCurrent` | `ratio` | Ability to cover short-term obligations |

---

## How It Works (Architecture & Lifecycle)

```
Your App  ───►  GET /api/financials/AAPL  ───►  FinAPI (Vercel)
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       │                                                             │
                  [In Turso Cache]                                             [Not in Cache]
                       │                                                             │
            Check Freshness Policy                                          Return HTTP 202
         (60 days since last update)                                        (or wait if ?wait=true)
         ┌─────────────┴─────────────┐                                               │
    [Fresh <60d]               [Due >60d]                                            │
         │                           │                                               │
   Return data (<400ms)     Return cached data                                       │
                            + In background (after()):                               │
                              Check SEC submissions                                  │
                              If new filing: incremental upsert                      │
                                     │                                               │
                                     └───────────────────────┬───────────────────────┘
                                                             ▼
                                                    Fetch from SEC EDGAR
                                                    Parse & dedupe XBRL
                                                    Upsert rows to Turso
```

### Smart Deduplication & Incremental Updates
- **Deduplication:** SEC repeats past financial facts in successive quarterly reports. FinAPI deduplicates by `(tag, unit, period_start, period_end)`, retaining only the latest filed value (automatically accounting for restatements).
- **60-Day Revalidation Window:** SEC EDGAR is not queried for a ticker for 60 days after its last database update.
- **Incremental Diffing:** When a new quarterly filing (`10-Q`) or annual filing (`10-K`) is detected, FinAPI only inserts facts filed on or after that date, writing a few hundred rows instead of tens of thousands.
- **Nightly GitHub Action:** A workflow runs at 03:00 UTC every night to refresh the top 50 most requested stocks that are due, ensuring zero cold-start latency for popular tickers.

---

## Authentication & Rate Limiting

FinAPI includes built-in user registration, API key authentication, and daily quota management.

### Free Tier Limits
- **Daily Quota:** **20 requests per day** per registered user.
- **Quota Reset:** Daily at **00:00 UTC**.
- **Rate Limit Headers:** Every response includes standard rate-limit headers:
  - `X-RateLimit-Limit`: Maximum allowed requests per day (e.g. `20`)
  - `X-RateLimit-Remaining`: Remaining calls for the current UTC day
  - `X-RateLimit-Reset`: Unix timestamp when quota resets
- **HTTP 429:** Exceeding the daily quota returns `429 Too Many Requests` with a `Retry-After` header.

### Authenticating Requests
Pass your API key using either:
1. HTTP Header: `x-api-key: fin_live_...` (Recommended)
2. Query Parameter: `?api_key=fin_live_...`
3. Bearer Token: `Authorization: Bearer fin_live_...`

---

## API Reference

### 1. Register for a Free API Key
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```
Generates and returns an instant API key (`fin_live_...`) with 20 requests/day. If the email is already registered, it recovers and returns the existing key and current usage status.

### 2. Check User Usage & Quota
```http
GET /api/auth/me
x-api-key: fin_live_...
```
Returns user profile, requests used today, remaining calls, lifetime requests, and reset timestamp.

### 3. Get Financial Data & Metrics for a Ticker
```http
GET /api/financials/{ticker}
x-api-key: fin_live_...
```

#### Query Parameters:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `period` | string | `all` | Filter by period type: `annual`, `quarterly`, or `all`. |
| `concepts` | string | *(all)* | Comma-separated list of canonical concept names (e.g. `Revenues,NetIncomeLoss`). |
| `metrics` | string | *(all)* | Comma-separated list of metrics (e.g. `FreeCashFlow,OperatingMargin,NetDebt`). |
| `from` | number | *(none)* | Starting year (e.g. `2021` returns periods ending in 2021 or later). |
| `wait` | boolean | `false` | When `true`, cold-start requests wait synchronously for SEC ingestion and return `200` instead of `202`. |

#### Example Request:
```bash
curl "https://finapi2026.vercel.app/api/financials/AAPL?period=annual&from=2024"
```

#### Example Response:
```json
{
  "ticker": "AAPL",
  "cik": "0000320193",
  "company": {
    "name": "Apple Inc.",
    "sic": "3571",
    "sicDescription": "Electronic Computers",
    "fiscalYearEnd": "09-26"
  },
  "dataFreshness": {
    "refreshedAt": "2026-10-24T01:36:14.042Z",
    "checkedAt": "2026-10-24T01:36:14.042Z",
    "latestFilingDate": "2026-07-31",
    "latestAccession": "0000320193-26-000020",
    "isStale": false,
    "revalidating": false
  },
  "metrics": [
    {
      "metric": "FreeCashFlow",
      "unit": "USD",
      "periods": [
        { "type": "FY", "start": "2023-10-01", "end": "2024-09-28", "value": 108807000000 },
        { "type": "FY", "start": "2024-09-29", "end": "2025-09-27", "value": 98767000000 }
      ]
    },
    {
      "metric": "OperatingMargin",
      "unit": "ratio",
      "periods": [
        { "type": "FY", "start": "2023-10-01", "end": "2024-09-28", "value": 0.3151 },
        { "type": "FY", "start": "2024-09-29", "end": "2025-09-27", "value": 0.3197 }
      ]
    },
    {
      "metric": "TotalDebt",
      "unit": "USD",
      "periods": [
        { "type": "FY", "end": "2024-09-28", "value": 116676000000 },
        { "type": "FY", "end": "2025-09-27", "value": 109570000000 }
      ]
    },
    {
      "metric": "NetDebt",
      "unit": "USD",
      "periods": [
        { "type": "FY", "end": "2024-09-28", "value": 51500000000 },
        { "type": "FY", "end": "2025-09-27", "value": 54870000000 }
      ]
    }
  ],
  "financials": {
    "income": [
      {
        "concept": "Revenues",
        "unit": "USD",
        "periods": [
          {
            "type": "FY",
            "start": "2023-10-01",
            "end": "2024-09-28",
            "value": 391035000000,
            "fy": 2025,
            "fp": "FY",
            "form": "10-K",
            "filed": "2025-10-31",
            "accn": "0000320193-25-000079",
            "tag": "us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax"
          }
        ]
      }
    ],
    "balance": [...],
    "cashflow": [...],
    "per_share": [...]
  }
}
```

### 2. List All Supported Concepts
```http
GET /api/concepts
```
Returns all 91 concepts grouped by statement, along with the source XBRL tags mapped to each.

### 3. Service Health
```http
GET /api/health
```
Returns database connectivity status, total companies cached, total historical fact rows in Turso, and a breakdown per company.

### 4. Admin Management Dashboard
The admin UI is available at `/admin` and is protected by your master secret (`CRON_SECRET` or `ADMIN_SECRET`).
- View total registered users, active users today, total daily & lifetime API calls.
- Inspect every user's email, name, generated API key, daily limit, usage progress, and last-called ticker.
- Dynamically increase or decrease any user's daily limit (e.g. upgrade from 20 to 500 requests/day).

### 5. Background Refresh Trigger (Cron)
```http
POST /api/cron/refresh?limit=50
Authorization: Bearer <CRON_SECRET>
```
Scans the top-N most requested stocks and refreshes any ticker exceeding the 60-day interval.

---

## Code Examples

### JavaScript / TypeScript
```typescript
async function getStockMetrics(ticker: string, apiKey: string) {
  const res = await fetch(
    `https://finapi2026.vercel.app/api/financials/${ticker}?period=annual&from=2023&wait=true`,
    {
      headers: {
        "x-api-key": apiKey,
      },
    }
  );
  
  if (res.status === 202) {
    console.log("Ingesting from SEC EDGAR, try again in 5 seconds.");
    return null;
  }
  
  // Rate limit information from headers
  console.log("Quota Remaining:", res.headers.get("x-ratelimit-remaining"));
  
  const data = await res.json();
  console.log(`=== ${data.company.name} (${data.ticker}) ===`);
  
  data.metrics.forEach((m: any) => {
    const latest = m.periods[m.periods.length - 1];
    if (m.unit === "ratio") {
      console.log(`${m.metric}: ${(latest.value * 100).toFixed(1)}%`);
    } else {
      console.log(`${m.metric}: $${(latest.value / 1e9).toFixed(2)}B`);
    }
  });
}

getStockMetrics("AAPL", "fin_live_your_api_key_here");
```

### Python
```python
import requests

def get_financials(ticker: str, api_key: str):
    url = f"https://finapi2026.vercel.app/api/financials/{ticker}"
    headers = {
        "x-api-key": api_key
    }
    params = {
        "period": "annual",
        "from": 2023,
        "wait": "true"
    }
    response = requests.get(url, headers=headers, params=params)
    print("Quota Remaining:", response.headers.get("x-ratelimit-remaining"))
    
    data = response.json()
    print(f"Company: {data['company']['name']} ({data['ticker']})")
    print("\n--- Key Ratios & Metrics ---")
    for m in data.get("metrics", []):
        latest = m["periods"][-1]
        if m["unit"] == "ratio":
            print(f"  {m['metric']}: {latest['value'] * 100:.1f}%")
        else:
            print(f"  {m['metric']}: ${latest['value'] / 1e9:.2f}B")

get_financials("MSFT", "fin_live_your_api_key_here")
```
    
    print(f"Company: {data['company']['name']} ({data['ticker']})")
    print("\n--- Key Ratios & Metrics ---")
    for m in data.get("metrics", []):
        latest = m["periods"][-1]
        if m["unit"] == "ratio":
            print(f"  {m['metric']}: {latest['value'] * 100:.1f}%")
        else:
            print(f"  {m['metric']}: ${latest['value'] / 1e9:.2f}B")

get_financials("MSFT")
```

---

## Local Development

```bash
# 1. Clone repository
git clone https://github.com/Avids/FinAPI.git
cd FinAPI

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Set TURSO_DATABASE_URL=file:local.db to use SQLite locally without Turso credentials
# Set SEC_USER_AGENT="YourApp yourname@example.com"

# 4. Run local migration
npm run migrate

# 5. Start development server
npm run dev
# Open http://localhost:3000

# 6. Run test suite
npm test
```

---

## License

This project is licensed under the [MIT License](LICENSE).
