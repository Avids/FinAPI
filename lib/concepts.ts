/**
 * Curated concept map.
 *
 * Each canonical concept maps to an ordered list of XBRL tags. Companies change tags over time
 * (e.g. Apple used `SalesRevenueNet` before 2018 and `RevenueFromContractWithCustomerExcludingAssessedTax`
 * after ASC 606), so at read time we merge all tags per period, preferring earlier tags in the list.
 *
 * Only facts whose tag appears in this file are stored in Turso (keeps row writes low).
 */

export type Group = "income" | "balance" | "cashflow" | "per_share";

export interface ConceptDef {
  /** Canonical name returned by the API. */
  name: string;
  group: Group;
  /** Ordered list of `taxonomy:Tag`. Earlier = preferred when several report the same period. */
  tags: string[];
}

const g = (t: string) => `us-gaap:${t}`;
const dei = (t: string) => `dei:${t}`;

export const CONCEPTS: ConceptDef[] = [
  // ───────────────────────── Income statement ─────────────────────────
  { name: "Revenues", group: "income", tags: [g("Revenues"), g("RevenueFromContractWithCustomerExcludingAssessedTax"), g("RevenueFromContractWithCustomerIncludingAssessedTax"), g("SalesRevenueNet"), g("SalesRevenueGoodsNet"), g("SalesRevenueServicesNet")] },
  { name: "CostOfRevenue", group: "income", tags: [g("CostOfRevenue"), g("CostOfGoodsAndServicesSold"), g("CostOfGoodsSold"), g("CostOfServices")] },
  { name: "GrossProfit", group: "income", tags: [g("GrossProfit")] },
  { name: "ResearchAndDevelopmentExpense", group: "income", tags: [g("ResearchAndDevelopmentExpense"), g("ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost")] },
  { name: "SellingGeneralAndAdministrativeExpense", group: "income", tags: [g("SellingGeneralAndAdministrativeExpense")] },
  { name: "SellingAndMarketingExpense", group: "income", tags: [g("SellingAndMarketingExpense")] },
  { name: "GeneralAndAdministrativeExpense", group: "income", tags: [g("GeneralAndAdministrativeExpense")] },
  { name: "OperatingExpenses", group: "income", tags: [g("OperatingExpenses"), g("CostsAndExpenses")] },
  { name: "OperatingIncomeLoss", group: "income", tags: [g("OperatingIncomeLoss")] },
  { name: "InterestExpense", group: "income", tags: [g("InterestExpense"), g("InterestExpenseNonoperating"), g("InterestExpenseDebt")] },
  { name: "NonoperatingIncomeExpense", group: "income", tags: [g("NonoperatingIncomeExpense"), g("OtherNonoperatingIncomeExpense")] },
  { name: "IncomeBeforeIncomeTaxes", group: "income", tags: [g("IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest"), g("IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments"), g("IncomeLossFromContinuingOperationsBeforeIncomeTaxesDomestic")] },
  { name: "IncomeTaxExpense", group: "income", tags: [g("IncomeTaxExpenseBenefit")] },
  { name: "IncomeFromContinuingOperations", group: "income", tags: [g("IncomeLossFromContinuingOperations")] },
  { name: "NetIncomeLoss", group: "income", tags: [g("NetIncomeLoss"), g("ProfitLoss"), g("NetIncomeLossAvailableToCommonStockholdersBasic")] },
  { name: "NetIncomeAttributableToNoncontrollingInterest", group: "income", tags: [g("NetIncomeLossAttributableToNoncontrollingInterest")] },
  { name: "NetIncomeAvailableToCommonStockholders", group: "income", tags: [g("NetIncomeLossAvailableToCommonStockholdersBasic")] },
  { name: "ComprehensiveIncome", group: "income", tags: [g("ComprehensiveIncomeNetOfTax")] },
  // Banks / financials
  { name: "InterestAndDividendIncome", group: "income", tags: [g("InterestAndDividendIncomeOperating")] },
  { name: "NetInterestIncome", group: "income", tags: [g("InterestIncomeExpenseNet"), g("InterestIncomeExpenseAfterProvisionForLoanLoss")] },
  { name: "NoninterestIncome", group: "income", tags: [g("NoninterestIncome")] },
  { name: "NoninterestExpense", group: "income", tags: [g("NoninterestExpense")] },
  { name: "ProvisionForCreditLosses", group: "income", tags: [g("ProvisionForLoanLeaseAndOtherLosses"), g("ProvisionForLoanAndLeaseLosses"), g("ProvisionForCreditLosses")] },

  // ───────────────────────── Balance sheet ─────────────────────────
  { name: "CashAndCashEquivalents", group: "balance", tags: [g("CashAndCashEquivalentsAtCarryingValue"), g("CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"), g("Cash")] },
  { name: "ShortTermInvestments", group: "balance", tags: [g("ShortTermInvestments"), g("MarketableSecuritiesCurrent"), g("AvailableForSaleSecuritiesDebtSecuritiesCurrent")] },
  { name: "AccountsReceivable", group: "balance", tags: [g("AccountsReceivableNetCurrent"), g("ReceivablesNetCurrent")] },
  { name: "Inventory", group: "balance", tags: [g("InventoryNet")] },
  { name: "OtherCurrentAssets", group: "balance", tags: [g("OtherAssetsCurrent"), g("PrepaidExpenseAndOtherAssetsCurrent")] },
  { name: "AssetsCurrent", group: "balance", tags: [g("AssetsCurrent")] },
  { name: "PropertyPlantAndEquipmentNet", group: "balance", tags: [g("PropertyPlantAndEquipmentNet"), g("PropertyPlantAndEquipmentAndFinanceLeaseRightOfUseAssetAfterAccumulatedDepreciationAndAmortization")] },
  { name: "OperatingLeaseRightOfUseAsset", group: "balance", tags: [g("OperatingLeaseRightOfUseAsset")] },
  { name: "Goodwill", group: "balance", tags: [g("Goodwill")] },
  { name: "IntangibleAssetsNet", group: "balance", tags: [g("IntangibleAssetsNetExcludingGoodwill"), g("FiniteLivedIntangibleAssetsNet")] },
  { name: "LongTermInvestments", group: "balance", tags: [g("LongTermInvestments"), g("MarketableSecuritiesNoncurrent"), g("AvailableForSaleSecuritiesDebtSecuritiesNoncurrent")] },
  { name: "OtherNoncurrentAssets", group: "balance", tags: [g("OtherAssetsNoncurrent")] },
  { name: "Assets", group: "balance", tags: [g("Assets")] },
  { name: "AccountsPayable", group: "balance", tags: [g("AccountsPayableCurrent"), g("AccountsPayableAndAccruedLiabilitiesCurrent")] },
  { name: "AccruedLiabilities", group: "balance", tags: [g("AccruedLiabilitiesCurrent")] },
  { name: "DeferredRevenueCurrent", group: "balance", tags: [g("ContractWithCustomerLiabilityCurrent"), g("DeferredRevenueCurrent")] },
  { name: "ShortTermDebt", group: "balance", tags: [g("ShortTermBorrowings"), g("CommercialPaper"), g("DebtCurrent")] },
  { name: "LongTermDebtCurrent", group: "balance", tags: [g("LongTermDebtCurrent")] },
  { name: "LiabilitiesCurrent", group: "balance", tags: [g("LiabilitiesCurrent")] },
  { name: "LongTermDebt", group: "balance", tags: [g("LongTermDebtNoncurrent"), g("LongTermDebt"), g("LongTermDebtAndCapitalLeaseObligations")] },
  { name: "OperatingLeaseLiabilityNoncurrent", group: "balance", tags: [g("OperatingLeaseLiabilityNoncurrent")] },
  { name: "OtherNoncurrentLiabilities", group: "balance", tags: [g("OtherLiabilitiesNoncurrent")] },
  { name: "Liabilities", group: "balance", tags: [g("Liabilities")] },
  { name: "CommonStockAndAdditionalPaidInCapital", group: "balance", tags: [g("CommonStocksIncludingAdditionalPaidInCapital"), g("AdditionalPaidInCapital"), g("AdditionalPaidInCapitalCommonStock")] },
  { name: "RetainedEarnings", group: "balance", tags: [g("RetainedEarningsAccumulatedDeficit")] },
  { name: "AccumulatedOtherComprehensiveIncome", group: "balance", tags: [g("AccumulatedOtherComprehensiveIncomeLossNetOfTax")] },
  { name: "TreasuryStock", group: "balance", tags: [g("TreasuryStockValue"), g("TreasuryStockCommonValue")] },
  { name: "StockholdersEquity", group: "balance", tags: [g("StockholdersEquity")] },
  { name: "StockholdersEquityIncludingNoncontrollingInterest", group: "balance", tags: [g("StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest")] },
  { name: "LiabilitiesAndStockholdersEquity", group: "balance", tags: [g("LiabilitiesAndStockholdersEquity")] },
  // Banks / financials
  { name: "Deposits", group: "balance", tags: [g("Deposits")] },
  { name: "LoansAndLeasesReceivableNet", group: "balance", tags: [g("LoansAndLeasesReceivableNetReportedAmount"), g("FinancingReceivableExcludingAccruedInterestAfterAllowanceForCreditLoss")] },

  // ───────────────────────── Cash flow ─────────────────────────
  { name: "OperatingCashFlow", group: "cashflow", tags: [g("NetCashProvidedByUsedInOperatingActivities"), g("NetCashProvidedByUsedInOperatingActivitiesContinuingOperations")] },
  { name: "DepreciationAndAmortization", group: "cashflow", tags: [g("DepreciationDepletionAndAmortization"), g("DepreciationAmortizationAndAccretionNet"), g("DepreciationAndAmortization"), g("Depreciation")] },
  { name: "ShareBasedCompensation", group: "cashflow", tags: [g("ShareBasedCompensation"), g("AllocatedShareBasedCompensationExpense")] },
  { name: "DeferredIncomeTaxes", group: "cashflow", tags: [g("DeferredIncomeTaxExpenseBenefit"), g("DeferredIncomeTaxesAndTaxCredits")] },
  { name: "ChangeInAccountsReceivable", group: "cashflow", tags: [g("IncreaseDecreaseInAccountsReceivable")] },
  { name: "ChangeInInventories", group: "cashflow", tags: [g("IncreaseDecreaseInInventories")] },
  { name: "ChangeInAccountsPayable", group: "cashflow", tags: [g("IncreaseDecreaseInAccountsPayable")] },
  { name: "CapitalExpenditure", group: "cashflow", tags: [g("PaymentsToAcquirePropertyPlantAndEquipment"), g("PaymentsToAcquireProductiveAssets")] },
  { name: "Acquisitions", group: "cashflow", tags: [g("PaymentsToAcquireBusinessesNetOfCashAcquired")] },
  { name: "PurchasesOfInvestments", group: "cashflow", tags: [g("PaymentsToAcquireAvailableForSaleSecuritiesDebt"), g("PaymentsToAcquireInvestments"), g("PaymentsToAcquireMarketableSecurities")] },
  { name: "ProceedsFromInvestments", group: "cashflow", tags: [g("ProceedsFromSaleMaturityAndCollectionsOfInvestments"), g("ProceedsFromMaturitiesPrepaymentsAndCallsOfAvailableForSaleSecurities"), g("ProceedsFromSaleOfAvailableForSaleSecuritiesDebt")] },
  { name: "InvestingCashFlow", group: "cashflow", tags: [g("NetCashProvidedByUsedInInvestingActivities"), g("NetCashProvidedByUsedInInvestingActivitiesContinuingOperations")] },
  { name: "DebtIssued", group: "cashflow", tags: [g("ProceedsFromIssuanceOfLongTermDebt"), g("ProceedsFromIssuanceOfDebt")] },
  { name: "DebtRepaid", group: "cashflow", tags: [g("RepaymentsOfLongTermDebt"), g("RepaymentsOfDebt")] },
  { name: "ShareRepurchases", group: "cashflow", tags: [g("PaymentsForRepurchaseOfCommonStock")] },
  { name: "DividendsPaid", group: "cashflow", tags: [g("PaymentsOfDividends"), g("PaymentsOfDividendsCommonStock")] },
  { name: "FinancingCashFlow", group: "cashflow", tags: [g("NetCashProvidedByUsedInFinancingActivities"), g("NetCashProvidedByUsedInFinancingActivitiesContinuingOperations")] },
  { name: "NetChangeInCash", group: "cashflow", tags: [g("CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect"), g("CashAndCashEquivalentsPeriodIncreaseDecrease")] },
  { name: "IncomeTaxesPaid", group: "cashflow", tags: [g("IncomeTaxesPaidNet"), g("IncomeTaxesPaid")] },
  { name: "InterestPaid", group: "cashflow", tags: [g("InterestPaidNet"), g("InterestPaid")] },

  // ───────────────────────── Per share / shares ─────────────────────────
  { name: "EarningsPerShareBasic", group: "per_share", tags: [g("EarningsPerShareBasic"), g("EarningsPerShareBasicAndDiluted")] },
  { name: "EarningsPerShareDiluted", group: "per_share", tags: [g("EarningsPerShareDiluted"), g("EarningsPerShareBasicAndDiluted")] },
  { name: "DividendsPerShare", group: "per_share", tags: [g("CommonStockDividendsPerShareDeclared"), g("CommonStockDividendsPerShareCashPaid")] },
  { name: "WeightedAverageSharesBasic", group: "per_share", tags: [g("WeightedAverageNumberOfSharesOutstandingBasic")] },
  { name: "WeightedAverageSharesDiluted", group: "per_share", tags: [g("WeightedAverageNumberOfDilutedSharesOutstanding")] },
  { name: "SharesOutstanding", group: "per_share", tags: [dei("EntityCommonStockSharesOutstanding"), g("CommonStockSharesOutstanding")] },
  { name: "PublicFloat", group: "per_share", tags: [dei("EntityPublicFloat")] },
];

/** All `taxonomy:Tag` strings we persist. */
export const TRACKED_TAGS: ReadonlySet<string> = new Set(CONCEPTS.flatMap((c) => c.tags));

export const CONCEPTS_BY_NAME: ReadonlyMap<string, ConceptDef> = new Map(
  CONCEPTS.map((c) => [c.name.toLowerCase(), c]),
);
