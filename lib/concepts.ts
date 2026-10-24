/**
 * Curated concept map.
 *
 * Each canonical concept maps to an ordered list of XBRL tags across US-GAAP and IFRS taxonomies.
 * Companies change tags over time (e.g. Apple used `SalesRevenueNet` before 2018 and
 * `RevenueFromContractWithCustomerExcludingAssessedTax` after ASC 606), and foreign private issuers
 * file using `ifrs-full` (e.g. TSM, BABA, ASML, NVO).
 *
 * At read time we merge all tags per period, preferring earlier tags in the list.
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
const ifrs = (t: string) => `ifrs-full:${t}`;
const dei = (t: string) => `dei:${t}`;

export const CONCEPTS: ConceptDef[] = [
  // ───────────────────────── Income statement ─────────────────────────
  {
    name: "Revenues",
    group: "income",
    tags: [
      g("Revenues"),
      g("RevenueFromContractWithCustomerExcludingAssessedTax"),
      g("RevenueFromContractWithCustomerIncludingAssessedTax"),
      g("SalesRevenueNet"),
      g("SalesRevenueGoodsNet"),
      g("SalesRevenueServicesNet"),
      ifrs("Revenue"),
      ifrs("RevenueFromContractsWithCustomers"),
    ],
  },
  {
    name: "CostOfRevenue",
    group: "income",
    tags: [
      g("CostOfRevenue"),
      g("CostOfGoodsAndServicesSold"),
      g("CostOfGoodsSold"),
      g("CostOfServices"),
      ifrs("CostOfSales"),
    ],
  },
  {
    name: "GrossProfit",
    group: "income",
    tags: [
      g("GrossProfit"),
      ifrs("GrossProfit"),
    ],
  },
  {
    name: "ResearchAndDevelopmentExpense",
    group: "income",
    tags: [
      g("ResearchAndDevelopmentExpense"),
      g("ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost"),
      ifrs("ResearchAndDevelopmentExpense"),
    ],
  },
  {
    name: "SellingGeneralAndAdministrativeExpense",
    group: "income",
    tags: [
      g("SellingGeneralAndAdministrativeExpense"),
      ifrs("AdministrativeExpense"),
      ifrs("DistributionCosts"),
    ],
  },
  {
    name: "SellingAndMarketingExpense",
    group: "income",
    tags: [
      g("SellingAndMarketingExpense"),
      ifrs("DistributionCosts"),
    ],
  },
  {
    name: "GeneralAndAdministrativeExpense",
    group: "income",
    tags: [
      g("GeneralAndAdministrativeExpense"),
      ifrs("AdministrativeExpense"),
    ],
  },
  {
    name: "OperatingExpenses",
    group: "income",
    tags: [
      g("OperatingExpenses"),
      g("CostsAndExpenses"),
      ifrs("OperatingExpenses"),
    ],
  },
  {
    name: "OperatingIncomeLoss",
    group: "income",
    tags: [
      g("OperatingIncomeLoss"),
      ifrs("ProfitLossFromOperatingActivities"),
    ],
  },
  {
    name: "InterestExpense",
    group: "income",
    tags: [
      g("InterestExpense"),
      g("InterestExpenseNonoperating"),
      g("InterestExpenseDebt"),
      ifrs("FinanceCosts"),
    ],
  },
  {
    name: "InterestIncome",
    group: "income",
    tags: [
      g("InvestmentIncomeInterest"),
      g("InterestIncomeOperating"),
      g("InterestAndDividendIncomeOperating"),
      ifrs("FinanceIncome"),
    ],
  },
  {
    name: "NonoperatingIncomeExpense",
    group: "income",
    tags: [
      g("NonoperatingIncomeExpense"),
      g("OtherNonoperatingIncomeExpense"),
      ifrs("OtherIncome"),
    ],
  },
  {
    name: "IncomeBeforeIncomeTaxes",
    group: "income",
    tags: [
      g("IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest"),
      g("IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments"),
      g("IncomeLossFromContinuingOperationsBeforeIncomeTaxesDomestic"),
      ifrs("ProfitLossBeforeTax"),
    ],
  },
  {
    name: "IncomeTaxExpense",
    group: "income",
    tags: [
      g("IncomeTaxExpenseBenefit"),
      ifrs("IncomeTaxExpenseContinuingOperations"),
      ifrs("CurrentTaxExpenseIncome"),
    ],
  },
  {
    name: "IncomeFromContinuingOperations",
    group: "income",
    tags: [
      g("IncomeLossFromContinuingOperations"),
      ifrs("ProfitLossFromContinuingOperations"),
    ],
  },
  {
    name: "NetIncomeLoss",
    group: "income",
    tags: [
      g("NetIncomeLoss"),
      g("ProfitLoss"),
      g("NetIncomeLossAvailableToCommonStockholdersBasic"),
      ifrs("ProfitLoss"),
      ifrs("ProfitLossAttributableToOwnersOfParent"),
    ],
  },
  {
    name: "NetIncomeAttributableToNoncontrollingInterest",
    group: "income",
    tags: [
      g("NetIncomeLossAttributableToNoncontrollingInterest"),
      ifrs("ProfitLossAttributableToNoncontrollingInterests"),
    ],
  },
  {
    name: "NetIncomeAvailableToCommonStockholders",
    group: "income",
    tags: [
      g("NetIncomeLossAvailableToCommonStockholdersBasic"),
      ifrs("ProfitLossAttributableToOwnersOfParent"),
    ],
  },
  {
    name: "ComprehensiveIncome",
    group: "income",
    tags: [
      g("ComprehensiveIncomeNetOfTax"),
      ifrs("ComprehensiveIncome"),
      ifrs("ComprehensiveIncomeAttributableToOwnersOfParent"),
    ],
  },
  // Banks / Financials
  {
    name: "InterestAndDividendIncome",
    group: "income",
    tags: [
      g("InterestAndDividendIncomeOperating"),
      g("InterestIncomeOperating"),
      ifrs("InterestRevenueCalculatedUsingEffectiveInterestMethod"),
    ],
  },
  {
    name: "NetInterestIncome",
    group: "income",
    tags: [
      g("InterestIncomeExpenseNet"),
      g("InterestIncomeExpenseAfterProvisionForLoanLoss"),
    ],
  },
  {
    name: "NoninterestIncome",
    group: "income",
    tags: [
      g("NoninterestIncome"),
      ifrs("FeeAndCommissionIncome"),
    ],
  },
  {
    name: "NoninterestExpense",
    group: "income",
    tags: [
      g("NoninterestExpense"),
      ifrs("FeeAndCommissionExpense"),
    ],
  },
  {
    name: "ProvisionForCreditLosses",
    group: "income",
    tags: [
      g("ProvisionForLoanLeaseAndOtherLosses"),
      g("ProvisionForLoanAndLeaseLosses"),
      g("ProvisionForCreditLosses"),
      ifrs("ImpairmentLossRecognisedInProfitOrLoss"),
    ],
  },

  // ───────────────────────── Balance sheet ─────────────────────────
  {
    name: "CashAndCashEquivalents",
    group: "balance",
    tags: [
      g("CashAndCashEquivalentsAtCarryingValue"),
      g("CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"),
      g("Cash"),
      ifrs("CashAndCashEquivalents"),
    ],
  },
  {
    name: "ShortTermInvestments",
    group: "balance",
    tags: [
      g("ShortTermInvestments"),
      g("MarketableSecuritiesCurrent"),
      g("AvailableForSaleSecuritiesDebtSecuritiesCurrent"),
      ifrs("CurrentFinancialAssets"),
      ifrs("OtherCurrentFinancialAssets"),
    ],
  },
  {
    name: "AccountsReceivable",
    group: "balance",
    tags: [
      g("AccountsReceivableNetCurrent"),
      g("ReceivablesNetCurrent"),
      ifrs("TradeAndOtherCurrentReceivables"),
      ifrs("CurrentTradeReceivables"),
    ],
  },
  {
    name: "Inventory",
    group: "balance",
    tags: [
      g("InventoryNet"),
      ifrs("Inventories"),
    ],
  },
  {
    name: "OtherCurrentAssets",
    group: "balance",
    tags: [
      g("OtherAssetsCurrent"),
      g("PrepaidExpenseAndOtherAssetsCurrent"),
      ifrs("OtherCurrentAssets"),
    ],
  },
  {
    name: "AssetsCurrent",
    group: "balance",
    tags: [
      g("AssetsCurrent"),
      ifrs("CurrentAssets"),
    ],
  },
  {
    name: "PropertyPlantAndEquipmentNet",
    group: "balance",
    tags: [
      g("PropertyPlantAndEquipmentNet"),
      g("PropertyPlantAndEquipmentAndFinanceLeaseRightOfUseAssetAfterAccumulatedDepreciationAndAmortization"),
      ifrs("PropertyPlantAndEquipment"),
    ],
  },
  {
    name: "OperatingLeaseRightOfUseAsset",
    group: "balance",
    tags: [
      g("OperatingLeaseRightOfUseAsset"),
      ifrs("RightofuseAssets"),
    ],
  },
  {
    name: "Goodwill",
    group: "balance",
    tags: [
      g("Goodwill"),
      ifrs("Goodwill"),
    ],
  },
  {
    name: "IntangibleAssetsNet",
    group: "balance",
    tags: [
      g("IntangibleAssetsNetExcludingGoodwill"),
      g("FiniteLivedIntangibleAssetsNet"),
      ifrs("IntangibleAssetsOtherThanGoodwill"),
    ],
  },
  {
    name: "LongTermInvestments",
    group: "balance",
    tags: [
      g("LongTermInvestments"),
      g("MarketableSecuritiesNoncurrent"),
      g("AvailableForSaleSecuritiesDebtSecuritiesNoncurrent"),
      ifrs("NoncurrentFinancialAssets"),
      ifrs("OtherNoncurrentFinancialAssets"),
    ],
  },
  {
    name: "OtherNoncurrentAssets",
    group: "balance",
    tags: [
      g("OtherAssetsNoncurrent"),
      ifrs("OtherNoncurrentAssets"),
    ],
  },
  {
    name: "Assets",
    group: "balance",
    tags: [
      g("Assets"),
      ifrs("Assets"),
    ],
  },
  {
    name: "AccountsPayable",
    group: "balance",
    tags: [
      g("AccountsPayableCurrent"),
      g("AccountsPayableAndAccruedLiabilitiesCurrent"),
      ifrs("TradeAndOtherCurrentPayables"),
      ifrs("CurrentTradePayables"),
    ],
  },
  {
    name: "AccruedLiabilities",
    group: "balance",
    tags: [
      g("AccruedLiabilitiesCurrent"),
      ifrs("CurrentAccruedExpensesAndOtherCurrentLiabilities"),
    ],
  },
  {
    name: "DeferredRevenueCurrent",
    group: "balance",
    tags: [
      g("ContractWithCustomerLiabilityCurrent"),
      g("DeferredRevenueCurrent"),
      ifrs("ContractLiabilities"),
      ifrs("CurrentContractLiabilities"),
    ],
  },
  {
    name: "DeferredRevenueNoncurrent",
    group: "balance",
    tags: [
      g("ContractWithCustomerLiabilityNoncurrent"),
      g("DeferredRevenueNoncurrent"),
      ifrs("NoncurrentContractLiabilities"),
    ],
  },
  {
    name: "ShortTermDebt",
    group: "balance",
    tags: [
      g("ShortTermBorrowings"),
      g("CommercialPaper"),
      g("DebtCurrent"),
      ifrs("CurrentBorrowings"),
      ifrs("CurrentFinancialLiabilities"),
    ],
  },
  {
    name: "LongTermDebtCurrent",
    group: "balance",
    tags: [
      g("LongTermDebtCurrent"),
    ],
  },
  // ── Lease liabilities (current + non-current for full debt coverage) ──
  {
    name: "OperatingLeaseLiabilityCurrent",
    group: "balance",
    tags: [
      g("OperatingLeaseLiabilityCurrent"),
      ifrs("CurrentLeaseLiabilities"),
    ],
  },
  {
    name: "OperatingLeaseLiabilityNoncurrent",
    group: "balance",
    tags: [
      g("OperatingLeaseLiabilityNoncurrent"),
      ifrs("NoncurrentLeaseLiabilities"),
    ],
  },
  {
    name: "FinanceLeaseLiabilityCurrent",
    group: "balance",
    tags: [
      g("FinanceLeaseLiabilityCurrent"),
      g("CapitalLeaseObligationsCurrent"),
    ],
  },
  {
    name: "FinanceLeaseLiabilityNoncurrent",
    group: "balance",
    tags: [
      g("FinanceLeaseLiabilityNoncurrent"),
      g("CapitalLeaseObligationsNoncurrent"),
    ],
  },
  {
    name: "LiabilitiesCurrent",
    group: "balance",
    tags: [
      g("LiabilitiesCurrent"),
      ifrs("CurrentLiabilities"),
    ],
  },
  {
    name: "LongTermDebt",
    group: "balance",
    tags: [
      g("LongTermDebtNoncurrent"),
      g("LongTermDebt"),
      g("LongTermDebtAndCapitalLeaseObligations"),
      ifrs("NoncurrentBorrowings"),
      ifrs("NoncurrentFinancialLiabilities"),
    ],
  },
  {
    name: "OtherNoncurrentLiabilities",
    group: "balance",
    tags: [
      g("OtherLiabilitiesNoncurrent"),
      ifrs("OtherNoncurrentLiabilities"),
    ],
  },
  {
    name: "Liabilities",
    group: "balance",
    tags: [
      g("Liabilities"),
      ifrs("Liabilities"),
    ],
  },
  // ── Capital structure & Equity ──
  {
    name: "PreferredStock",
    group: "balance",
    tags: [
      g("PreferredStockValue"),
      g("PreferredStockIncludingAdditionalPaidInCapitalNetOfDiscount"),
      ifrs("PreferenceShares"),
    ],
  },
  {
    name: "CommonStockAndAdditionalPaidInCapital",
    group: "balance",
    tags: [
      g("CommonStocksIncludingAdditionalPaidInCapital"),
      g("AdditionalPaidInCapital"),
      g("AdditionalPaidInCapitalCommonStock"),
      ifrs("IssuedCapital"),
      ifrs("ShareCapital"),
    ],
  },
  {
    name: "RetainedEarnings",
    group: "balance",
    tags: [
      g("RetainedEarningsAccumulatedDeficit"),
      ifrs("RetainedEarnings"),
    ],
  },
  {
    name: "AccumulatedOtherComprehensiveIncome",
    group: "balance",
    tags: [
      g("AccumulatedOtherComprehensiveIncomeLossNetOfTax"),
      ifrs("OtherReserves"),
    ],
  },
  {
    name: "TreasuryStock",
    group: "balance",
    tags: [
      g("TreasuryStockValue"),
      g("TreasuryStockCommonValue"),
      ifrs("TreasuryShares"),
    ],
  },
  {
    name: "MinorityInterest",
    group: "balance",
    tags: [
      g("MinorityInterest"),
      g("NoncontrollingInterestInConsolidatedEntities"),
      ifrs("NoncontrollingInterests"),
    ],
  },
  {
    name: "StockholdersEquity",
    group: "balance",
    tags: [
      g("StockholdersEquity"),
      ifrs("Equity"),
      ifrs("EquityAttributableToOwnersOfParent"),
    ],
  },
  {
    name: "StockholdersEquityIncludingNoncontrollingInterest",
    group: "balance",
    tags: [
      g("StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"),
      ifrs("Equity"),
    ],
  },
  {
    name: "LiabilitiesAndStockholdersEquity",
    group: "balance",
    tags: [
      g("LiabilitiesAndStockholdersEquity"),
      ifrs("EquityAndLiabilities"),
    ],
  },
  // Banks / Financials
  {
    name: "Deposits",
    group: "balance",
    tags: [
      g("Deposits"),
      ifrs("DepositsFromBanks"),
      ifrs("DepositsFromCustomers"),
    ],
  },
  {
    name: "LoansAndLeasesReceivableNet",
    group: "balance",
    tags: [
      g("LoansAndLeasesReceivableNetReportedAmount"),
      g("FinancingReceivableExcludingAccruedInterestAfterAllowanceForCreditLoss"),
      ifrs("LoansAndAdvancesToCustomers"),
    ],
  },
  {
    name: "AllowanceForCreditLosses",
    group: "balance",
    tags: [
      g("FinancingReceivableAllowanceForCreditLosses"),
      g("AllowanceForLoanAndLeaseLosses"),
      ifrs("AllowanceAccountForCreditLossesOfFinancialAssets"),
    ],
  },

  // ── SaaS / Tech metrics ──
  {
    name: "RemainingPerformanceObligation",
    group: "balance",
    tags: [
      g("RevenueRemainingPerformanceObligation"),
      g("RevenueRemainingPerformanceObligationExpectedTimingOfSatisfactionPeriod1"),
    ],
  },

  // ───────────────────────── Cash flow ─────────────────────────
  {
    name: "OperatingCashFlow",
    group: "cashflow",
    tags: [
      g("NetCashProvidedByUsedInOperatingActivities"),
      g("NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"),
      ifrs("CashFlowsFromUsedInOperatingActivities"),
      ifrs("CashFlowsFromOperations"),
    ],
  },
  {
    name: "DepreciationAndAmortization",
    group: "cashflow",
    tags: [
      g("DepreciationDepletionAndAmortization"),
      g("DepreciationAmortizationAndAccretionNet"),
      g("DepreciationAndAmortization"),
      g("Depreciation"),
      ifrs("AdjustmentsForDepreciationAndAmortisationExpense"),
    ],
  },
  {
    name: "ShareBasedCompensation",
    group: "cashflow",
    tags: [
      g("ShareBasedCompensation"),
      g("AllocatedShareBasedCompensationExpense"),
      ifrs("AdjustmentsForSharebasedPayments"),
    ],
  },
  {
    name: "DeferredIncomeTaxes",
    group: "cashflow",
    tags: [
      g("DeferredIncomeTaxExpenseBenefit"),
      g("DeferredIncomeTaxesAndTaxCredits"),
      ifrs("AdjustmentsForDeferredTaxExpense"),
    ],
  },
  {
    name: "ChangeInAccountsReceivable",
    group: "cashflow",
    tags: [
      g("IncreaseDecreaseInAccountsReceivable"),
      ifrs("AdjustmentsForDecreaseIncreaseInTradeAndOtherReceivables"),
    ],
  },
  {
    name: "ChangeInInventories",
    group: "cashflow",
    tags: [
      g("IncreaseDecreaseInInventories"),
      ifrs("AdjustmentsForDecreaseIncreaseInInventories"),
    ],
  },
  {
    name: "ChangeInAccountsPayable",
    group: "cashflow",
    tags: [
      g("IncreaseDecreaseInAccountsPayable"),
      ifrs("AdjustmentsForIncreaseDecreaseInTradeAndOtherPayables"),
    ],
  },
  {
    name: "CapitalExpenditure",
    group: "cashflow",
    tags: [
      g("PaymentsToAcquirePropertyPlantAndEquipment"),
      g("PaymentsToAcquireProductiveAssets"),
      ifrs("PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"),
      ifrs("PurchaseOfPropertyPlantAndEquipmentIntangibleAssetsOtherThanGoodwillInvestmentPropertyAndOtherNoncurrentAssets"),
    ],
  },
  {
    name: "Acquisitions",
    group: "cashflow",
    tags: [
      g("PaymentsToAcquireBusinessesNetOfCashAcquired"),
      ifrs("CashFlowsUsedInObtainingControlOfSubsidiariesOrOtherBusinessesClassifiedAsInvestingActivities"),
    ],
  },
  {
    name: "PurchasesOfInvestments",
    group: "cashflow",
    tags: [
      g("PaymentsToAcquireAvailableForSaleSecuritiesDebt"),
      g("PaymentsToAcquireInvestments"),
      g("PaymentsToAcquireMarketableSecurities"),
      ifrs("PurchaseOfFinancialInstrumentsClassifiedAsInvestingActivities"),
    ],
  },
  {
    name: "ProceedsFromInvestments",
    group: "cashflow",
    tags: [
      g("ProceedsFromSaleMaturityAndCollectionsOfInvestments"),
      g("ProceedsFromMaturitiesPrepaymentsAndCallsOfAvailableForSaleSecurities"),
      g("ProceedsFromSaleOfAvailableForSaleSecuritiesDebt"),
      ifrs("ProceedsFromSalesOrMaturitiesOfFinancialInstrumentsClassifiedAsInvestingActivities"),
    ],
  },
  {
    name: "InvestingCashFlow",
    group: "cashflow",
    tags: [
      g("NetCashProvidedByUsedInInvestingActivities"),
      g("NetCashProvidedByUsedInInvestingActivitiesContinuingOperations"),
      ifrs("CashFlowsFromUsedInInvestingActivities"),
    ],
  },
  {
    name: "DebtIssued",
    group: "cashflow",
    tags: [
      g("ProceedsFromIssuanceOfLongTermDebt"),
      g("ProceedsFromIssuanceOfDebt"),
      ifrs("ProceedsFromBorrowingsClassifiedAsFinancingActivities"),
    ],
  },
  {
    name: "DebtRepaid",
    group: "cashflow",
    tags: [
      g("RepaymentsOfLongTermDebt"),
      g("RepaymentsOfDebt"),
      ifrs("RepaymentsOfBorrowingsClassifiedAsFinancingActivities"),
      ifrs("PaymentsOfLeaseLiabilitiesClassifiedAsFinancingActivities"),
    ],
  },
  {
    name: "ShareRepurchases",
    group: "cashflow",
    tags: [
      g("PaymentsForRepurchaseOfCommonStock"),
      ifrs("PaymentsForRepurchaseOfShares"),
    ],
  },
  {
    name: "DividendsPaid",
    group: "cashflow",
    tags: [
      g("PaymentsOfDividends"),
      g("PaymentsOfDividendsCommonStock"),
      ifrs("DividendsPaidClassifiedAsFinancingActivities"),
    ],
  },
  {
    name: "FinancingCashFlow",
    group: "cashflow",
    tags: [
      g("NetCashProvidedByUsedInFinancingActivities"),
      g("NetCashProvidedByUsedInFinancingActivitiesContinuingOperations"),
      ifrs("CashFlowsFromUsedInFinancingActivities"),
    ],
  },
  {
    name: "NetChangeInCash",
    group: "cashflow",
    tags: [
      g("CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect"),
      g("CashAndCashEquivalentsPeriodIncreaseDecrease"),
      ifrs("IncreaseDecreaseInCashAndCashEquivalents"),
    ],
  },
  {
    name: "IncomeTaxesPaid",
    group: "cashflow",
    tags: [
      g("IncomeTaxesPaidNet"),
      g("IncomeTaxesPaid"),
      ifrs("IncomeTaxesPaidRefundClassifiedAsOperatingActivities"),
    ],
  },
  {
    name: "InterestPaid",
    group: "cashflow",
    tags: [
      g("InterestPaidNet"),
      g("InterestPaid"),
      ifrs("InterestPaidClassifiedAsOperatingActivities"),
      ifrs("InterestPaidClassifiedAsFinancingActivities"),
    ],
  },

  // ───────────────────────── Per share / shares ─────────────────────────
  {
    name: "EarningsPerShareBasic",
    group: "per_share",
    tags: [
      g("EarningsPerShareBasic"),
      g("EarningsPerShareBasicAndDiluted"),
      ifrs("BasicEarningsLossPerShare"),
    ],
  },
  {
    name: "EarningsPerShareDiluted",
    group: "per_share",
    tags: [
      g("EarningsPerShareDiluted"),
      g("EarningsPerShareBasicAndDiluted"),
      ifrs("DilutedEarningsLossPerShare"),
    ],
  },
  {
    name: "DividendsPerShare",
    group: "per_share",
    tags: [
      g("CommonStockDividendsPerShareDeclared"),
      g("CommonStockDividendsPerShareCashPaid"),
      ifrs("DividendsRecognisedAsDistributionsToOwnersPerShare"),
    ],
  },
  {
    name: "WeightedAverageSharesBasic",
    group: "per_share",
    tags: [
      g("WeightedAverageNumberOfSharesOutstandingBasic"),
      ifrs("WeightedAverageShares"),
    ],
  },
  {
    name: "WeightedAverageSharesDiluted",
    group: "per_share",
    tags: [
      g("WeightedAverageNumberOfDilutedSharesOutstanding"),
      ifrs("DilutedWeightedAverageShares"),
    ],
  },
  {
    name: "SharesOutstanding",
    group: "per_share",
    tags: [
      dei("EntityCommonStockSharesOutstanding"),
      g("CommonStockSharesOutstanding"),
      ifrs("NumberOfSharesOutstanding"),
    ],
  },
  {
    name: "PublicFloat",
    group: "per_share",
    tags: [
      dei("EntityPublicFloat"),
    ],
  },
];

/** All `taxonomy:Tag` strings we persist in Turso. */
export const TRACKED_TAGS: ReadonlySet<string> = new Set(CONCEPTS.flatMap((c) => c.tags));

export const CONCEPTS_BY_NAME: ReadonlyMap<string, ConceptDef> = new Map(
  CONCEPTS.map((c) => [c.name.toLowerCase(), c]),
);
