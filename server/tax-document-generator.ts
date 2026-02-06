import PDFDocument from "pdfkit";
import type { PassThrough } from "stream";

export interface TaxDocumentData {
  driverId: string;
  legalName: string;
  country: string;
  taxClassification: string;
  maskedTaxId: string | null;
  taxYear: number;
  documentVersion: number;
  issueDate: string;

  totalGrossEarnings: number;
  totalTripEarnings: number;
  totalTips: number;
  totalIncentives: number;
  totalPlatformFees: number;
  totalMilesDriven: number;
  reportableIncome: number;
  currency: string;
}

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function classificationLabel(classification: string): string {
  switch (classification) {
    case "independent_contractor":
      return "Independent Contractor";
    case "self_employed":
      return "Self-Employed";
    case "sole_proprietor":
      return "Sole Proprietor";
    default:
      return classification.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function documentTitle(docType: string, year: number): string {
  switch (docType) {
    case "annual_statement":
      return `Annual Earnings & Tax Summary`;
    case "1099":
      return `Form 1099 Equivalent`;
    case "country_equivalent":
      return `Annual Tax Statement`;
    default:
      return `Annual Earnings & Tax Summary`;
  }
}

export function generateTaxPDF(
  data: TaxDocumentData,
  docType: string = "annual_statement"
): PDFDocument {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 50, bottom: 50, left: 60, right: 60 },
    bufferPages: true,
    info: {
      Title: `ZIBA ${documentTitle(docType, data.taxYear)} - ${data.taxYear}`,
      Author: "ZIBA Technologies",
      Subject: `Tax Year ${data.taxYear} - ${data.legalName}`,
      Creator: "ZIBA Platform",
    },
  });

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const leftX = doc.page.margins.left;
  let y = doc.page.margins.top;

  const COLOR_BLACK = "#1a1a1a";
  const COLOR_DARK_GRAY = "#333333";
  const COLOR_MID_GRAY = "#666666";
  const COLOR_LIGHT_GRAY = "#e5e5e5";
  const COLOR_BG_SECTION = "#f8f8f8";

  doc.fontSize(22).font("Helvetica-Bold").fillColor(COLOR_BLACK).text("ZIBA", leftX, y);
  y += 30;

  doc.moveTo(leftX, y).lineTo(leftX + pageWidth, y).strokeColor(COLOR_LIGHT_GRAY).lineWidth(1).stroke();
  y += 15;

  const title = documentTitle(docType, data.taxYear);
  doc.fontSize(16).font("Helvetica-Bold").fillColor(COLOR_BLACK).text(title, leftX, y);
  y += 24;

  doc.fontSize(9).font("Helvetica").fillColor(COLOR_MID_GRAY);
  doc.text(`Tax Year: ${data.taxYear}`, leftX, y);
  y += 14;
  doc.text(`Document Version: ${data.documentVersion}`, leftX, y);
  y += 14;
  doc.text(`Issue Date: ${data.issueDate}`, leftX, y);
  y += 25;

  doc.moveTo(leftX, y).lineTo(leftX + pageWidth, y).strokeColor(COLOR_LIGHT_GRAY).lineWidth(0.5).stroke();
  y += 20;

  doc.fontSize(11).font("Helvetica-Bold").fillColor(COLOR_BLACK).text("DRIVER INFORMATION", leftX, y);
  y += 18;

  const infoItems = [
    ["Legal Name", data.legalName],
    ["Driver ID", data.driverId.substring(0, 8).toUpperCase()],
    ["Country", data.country],
    ["Tax Classification", classificationLabel(data.taxClassification)],
    ["Tax ID", data.maskedTaxId ? `****${data.maskedTaxId}` : "Not provided"],
  ];

  doc.fontSize(9).font("Helvetica").fillColor(COLOR_DARK_GRAY);
  for (const [label, value] of infoItems) {
    doc.font("Helvetica").fillColor(COLOR_MID_GRAY).text(`${label}:`, leftX, y, { continued: false });
    doc.font("Helvetica").fillColor(COLOR_DARK_GRAY).text(`${value}`, leftX + 140, y);
    y += 16;
  }
  y += 15;

  doc.moveTo(leftX, y).lineTo(leftX + pageWidth, y).strokeColor(COLOR_LIGHT_GRAY).lineWidth(0.5).stroke();
  y += 20;

  doc.fontSize(11).font("Helvetica-Bold").fillColor(COLOR_BLACK).text("EARNINGS SUMMARY", leftX, y);
  y += 18;

  const earningsItems: [string, string][] = [
    ["Total Gross Earnings", formatCurrency(data.totalGrossEarnings, data.currency)],
    ["Total Trip Earnings", formatCurrency(data.totalTripEarnings, data.currency)],
    ["Total Tips", formatCurrency(data.totalTips, data.currency)],
    ["Total Incentives", formatCurrency(data.totalIncentives, data.currency)],
  ];

  doc.fontSize(9).font("Helvetica").fillColor(COLOR_DARK_GRAY);
  for (const [label, value] of earningsItems) {
    const isGross = label === "Total Gross Earnings";
    if (isGross) {
      doc.rect(leftX - 5, y - 3, pageWidth + 10, 20).fill(COLOR_BG_SECTION);
      doc.font("Helvetica-Bold").fillColor(COLOR_BLACK);
    } else {
      doc.font("Helvetica").fillColor(COLOR_DARK_GRAY);
    }
    doc.text(label, leftX, y);
    doc.text(value, leftX + pageWidth - 150, y, { width: 150, align: "right" });
    y += isGross ? 24 : 18;
  }
  y += 15;

  doc.moveTo(leftX, y).lineTo(leftX + pageWidth, y).strokeColor(COLOR_LIGHT_GRAY).lineWidth(0.5).stroke();
  y += 20;

  doc.fontSize(11).font("Helvetica-Bold").fillColor(COLOR_BLACK).text("PLATFORM & SERVICE FEE DISCLOSURE", leftX, y);
  y += 18;

  doc.rect(leftX - 5, y - 3, pageWidth + 10, 20).fill(COLOR_BG_SECTION);
  doc.font("Helvetica-Bold").fillColor(COLOR_BLACK).fontSize(9);
  doc.text("Total Platform & Service Fees (Annual, Aggregated)", leftX, y);
  doc.text(formatCurrency(data.totalPlatformFees, data.currency), leftX + pageWidth - 150, y, {
    width: 150,
    align: "right",
  });
  y += 24;

  doc.font("Helvetica").fillColor(COLOR_MID_GRAY).fontSize(8);
  doc.text(
    "This amount represents total platform-related service costs for the year, provided for tax and accounting purposes.",
    leftX,
    y,
    { width: pageWidth }
  );
  y += 25;

  doc.moveTo(leftX, y).lineTo(leftX + pageWidth, y).strokeColor(COLOR_LIGHT_GRAY).lineWidth(0.5).stroke();
  y += 20;

  doc.fontSize(11).font("Helvetica-Bold").fillColor(COLOR_BLACK).text("MILEAGE DISCLOSURE", leftX, y);
  y += 18;

  doc.rect(leftX - 5, y - 3, pageWidth + 10, 20).fill(COLOR_BG_SECTION);
  doc.font("Helvetica-Bold").fillColor(COLOR_BLACK).fontSize(9);
  doc.text("Total miles driven while online (for tax reporting purposes)", leftX, y);
  doc.text(`${data.totalMilesDriven.toFixed(1)} miles`, leftX + pageWidth - 150, y, {
    width: 150,
    align: "right",
  });
  y += 30;

  doc.moveTo(leftX, y).lineTo(leftX + pageWidth, y).strokeColor(COLOR_LIGHT_GRAY).lineWidth(0.5).stroke();
  y += 20;

  doc.fontSize(11).font("Helvetica-Bold").fillColor(COLOR_BLACK).text("REPORTABLE INCOME", leftX, y);
  y += 18;

  doc.rect(leftX - 5, y - 3, pageWidth + 10, 24).fill(COLOR_BG_SECTION);
  doc.font("Helvetica-Bold").fillColor(COLOR_BLACK).fontSize(11);
  doc.text("Reportable Income", leftX, y + 2);
  doc.text(formatCurrency(data.reportableIncome, data.currency), leftX + pageWidth - 180, y + 2, {
    width: 180,
    align: "right",
  });
  y += 30;

  doc.font("Helvetica").fillColor(COLOR_MID_GRAY).fontSize(8);
  doc.text(
    "Taxes are not withheld. Driver is responsible for filing applicable taxes.",
    leftX,
    y,
    { width: pageWidth }
  );
  y += 30;

  const footerY = doc.page.height - doc.page.margins.bottom - 60;
  doc.moveTo(leftX, footerY).lineTo(leftX + pageWidth, footerY).strokeColor(COLOR_LIGHT_GRAY).lineWidth(0.5).stroke();

  doc.fontSize(7).font("Helvetica").fillColor(COLOR_MID_GRAY);
  doc.text("ZIBA Technologies", leftX, footerY + 10);
  doc.text("Support: support@ziba.app", leftX, footerY + 22);
  doc.text(
    "This document is generated from ZIBA platform records and provided for tax reporting purposes.",
    leftX,
    footerY + 34,
    { width: pageWidth }
  );

  return doc;
}

export function generateTaxCSV(data: TaxDocumentData): string {
  const headers = [
    "driver_id",
    "driver_legal_name",
    "country",
    "tax_year",
    "total_gross_earnings",
    "total_trip_earnings",
    "total_tips",
    "total_incentives",
    "total_platform_fees",
    "total_miles_driven",
    "reportable_income",
    "currency",
  ].join(",");

  const values = [
    data.driverId.substring(0, 8).toUpperCase(),
    `"${data.legalName.replace(/"/g, '""')}"`,
    data.country,
    data.taxYear,
    data.totalGrossEarnings.toFixed(2),
    data.totalTripEarnings.toFixed(2),
    data.totalTips.toFixed(2),
    data.totalIncentives.toFixed(2),
    data.totalPlatformFees.toFixed(2),
    data.totalMilesDriven.toFixed(2),
    data.reportableIncome.toFixed(2),
    data.currency,
  ].join(",");

  return `${headers}\n${values}\n`;
}

export function generateBulkTaxCSV(rows: TaxDocumentData[]): string {
  const headers = [
    "driver_id",
    "driver_legal_name",
    "country",
    "tax_year",
    "total_gross_earnings",
    "total_trip_earnings",
    "total_tips",
    "total_incentives",
    "total_platform_fees",
    "total_miles_driven",
    "reportable_income",
    "currency",
  ].join(",");

  const lines = rows.map((data) =>
    [
      data.driverId.substring(0, 8).toUpperCase(),
      `"${data.legalName.replace(/"/g, '""')}"`,
      data.country,
      data.taxYear,
      data.totalGrossEarnings.toFixed(2),
      data.totalTripEarnings.toFixed(2),
      data.totalTips.toFixed(2),
      data.totalIncentives.toFixed(2),
      data.totalPlatformFees.toFixed(2),
      data.totalMilesDriven.toFixed(2),
      data.reportableIncome.toFixed(2),
      data.currency,
    ].join(",")
  );

  return `${headers}\n${lines.join("\n")}\n`;
}
