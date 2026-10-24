# FinAPI 📈

A high-performance caching proxy in front of **SEC EDGAR**. FinAPI allows any application to request clean, structured financial data (revenue, net income, balance sheet, cash flows, per-share metrics) for **any US public company** with millisecond response times.

- **Live Production API:** [https://finapi2026.vercel.app](https://finapi2026.vercel.app)
- **Hosted on:** Vercel (Next.js 16 Fluid Compute)
- **Database / Smart Cache:** Turso (libSQL / SQLite)
- **Source of Truth:** SEC EDGAR Financial Statement Data Sets (`companyfacts` & `submissions`)
- **Automated Warmup:** GitHub Actions cron job

---

## The Problem FinAPI Solves

Accessing financial data directly from the SEC EDGAR API in web or mobile applications has several major pain points:

1. **Giant Payloads:** The SEC `companyfacts` endpoint returns a single, massive JSON file containing every financial fact the company has ever filed (e.g. **3.6 MB for AAPL**, **4.7 MB for MSFT**, and **7.6 MB for JPM**).
2. **Platform Limits:** Serverless environments like Vercel have strict 4.5 MB response payload limits. Handing raw SEC files directly to client apps is impossible for large filers.
3. **No CORS Support:** `data.sec.gov` does not send `Access-Control-Allow-Origin` headers, preventing client-side browser applications from calling it directly.
4. **Strict Rate Limits & Headers:** SEC requires a specific `User-Agent` format (including admin contact email) and enforces a strict limit of 10 requests/second per IP, returning `403 Forbidden` if violated.
5. **Taxonomy & Accounting Changes:** Companies switch XBRL tags over time (e.g. switching from `SalesRevenueNet` to `RevenueFromContractWithCustomerExcludingAssessedTax` after ASC 606).

**FinAPI sits in the middle:** it fetches the 7 MB raw file once, decomposes and standardizes the facts into Turso SQLite, and serves tailored, filtered slices in **under 400 milliseconds**.

---

## What Tickers Are Supported?

FinAPI supports **any US publicly traded company or foreign company filing with the SEC**:

- **Coverage:** **10,000+ public tickers** across NYSE, NASDAQ, CBOE, and OTC markets.
- **Eligible Filers:** Any company that files periodic financial reports (`10-K`, `10-Q`, `20-F`, `40-F`) with XBRL disclosures.
- **Ticker Mapping:** Automatically resolves ticker symbols to official 10-digit SEC CIK numbers.
- **Dual-Class & Symbols:** Automatically normalizes dot and dash tickers (e.g. `BRK.B` / `BRK-B`, `GOOG` / `GOOGL`).

---

## What Information Is Provided?

FinAPI maps over **91 curated canonical financial concepts** across four main statement groups, with unified fallbacks across both **US-GAAP** and **IFRS** (`ifrs-full`) taxonomies:

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
Rather than requiring every downstream application to manually compute fundamental metrics, FinAPI automatically calculates and aligns standardized ratios for each reported period:
- **`FreeCashFlow`**: `OperatingCashFlow - |CapitalExpenditure|`
- **`TotalDebt`**: Complete debt coverage including both short-term & long-term debt, and operating & finance lease liabilities
- **`NetDebt`**: `TotalDebt - (CashAndCashEquivalents + ShortTermInvestments)`
- **`GrossMargin`**: `GrossProfit / Revenues`
- **`OperatingMargin`**: `OperatingIncomeLoss / Revenues`
- **`NetMargin`**: `NetIncomeLoss / Revenues`
- **`WorkingCapital`**: `AssetsCurrent - LiabilitiesCurrent`
- **`CurrentRatio`**: `AssetsCurrent / LiabilitiesCurrent`

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

## API Reference

### 1. Get Financial Data for a Ticker
```http
GET /api/financials/{ticker}
```

#### Query Parameters:
| Parameter | Type | Default | Description |
|---|---|---|---|
| `period` | string | `all` | Filter by period type: `annual`, `quarterly`, or `all`. |
| `concepts` | string | *(all)* | Comma-separated list of canonical concept names (e.g. `Revenues,NetIncomeLoss`). |
| `from` | number | *(none)* | Starting year (e.g. `2021` will return periods ending in 2021 or later). |
| `wait` | boolean | `false` | When `true`, cold-start requests wait synchronously for SEC ingestion and return `200` instead of `202`. |

#### Example Request:
```bash
curl "https://finapi2026.vercel.app/api/financials/AAPL?period=annual&concepts=Revenues,NetIncomeLoss&from=2021"
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
  "financials": {
    "income": [
      {
        "concept": "Revenues",
        "unit": "USD",
        "periods": [
          {
            "type": "FY",
            "start": "2020-09-27",
            "end": "2021-09-25",
            "value": 365817000000,
            "fy": 2023,
            "fp": "FY",
            "form": "10-K",
            "filed": "2023-11-03",
            "accn": "0000320193-23-000106",
            "tag": "us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax"
          },
          {
            "type": "FY",
            "start": "2024-09-29",
            "end": "2025-09-27",
            "value": 416161000000,
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
    "balance": [],
    "cashflow": [],
    "per_share": []
  }
}
```

### 2. List All Supported Concepts
```http
GET /api/concepts
```
Returns all 82 concepts grouped by statement, along with the source XBRL tags mapped to each.

### 3. Service Health
```http
GET /api/health
```
Returns database connectivity status and total number of distinct companies cached in Turso.

### 4. Background Refresh Trigger (Cron)
```http
POST /api/cron/refresh?limit=50
Authorization: Bearer <CRON_SECRET>
```
Scans the top-N most requested stocks and refreshes any ticker exceeding the 60-day interval.

---

## Code Examples

### JavaScript / TypeScript
```typescript
async function getStockRevenue(ticker: string) {
  const res = await fetch(`https://finapi2026.vercel.app/api/financials/${ticker}?period=annual&concepts=Revenues&from=2022&wait=true`);
  
  if (res.status === 202) {
    console.log("Ingesting from SEC EDGAR, try again in 5 seconds.");
    return null;
  }
  
  const data = await res.json();
  const revSeries = data.financials.income.find((c: any) => c.concept === "Revenues");
  
  revSeries?.periods.forEach((p: any) => {
    console.log(`${p.end}: $${(p.value / 1e9).toFixed(2)}B`);
  });
}

getStockRevenue("MSFT");
```

### Python
```python
import requests

def get_financials(ticker: str):
    url = f"https://finapi2026.vercel.app/api/financials/{ticker}"
    params = {
        "period": "annual",
        "concepts": "Revenues,NetIncomeLoss",
        "from": 2022,
        "wait": "true"
    }
    response = requests.get(url, params=params)
    data = response.json()
    
    print(f"Company: {data['company']['name']}")
    for item in data['financials']['income']:
        print(f"\n{item['concept']} ({item['unit']}):")
        for period in item['periods']:
            print(f"  {period['end']}: {period['value']:,}")

get_financials("AAPL")
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
